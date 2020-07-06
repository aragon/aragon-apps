import { useContext, useCallback } from 'react'
import { format } from 'date-fns'
import { saveAs } from 'file-saver'
import { formatTokenAmount, useToast } from '@aragon/ui'
import { IdentityContext } from './IdentityManager/IdentityManager'
import { toChecksumAddress } from '../lib/web3-utils'
import { ISO_SHORT_FORMAT } from '../lib/date-utils'
import { TRANSACTION_TYPES_LABELS } from '../transaction-types'

// Transforms a two dimensional array into a CSV data structure
// Surround every field with double quotes + escape double quotes inside.
function csv(data) {
  return data
    .map(cells => cells.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

async function getDownloadData({ transactions, tokenDetails, resolveAddress }) {
  const processedTransactions = await transactions.reduce(
    async (
      transactionListPromise,
      { date, description, tokenTransfers, type, transactionHash }
    ) => {
      const previous = await transactionListPromise
      const mappedTokenTransfersData = await Promise.all(
        tokenTransfers.map(async ({ amount, from, to, token }) => {
          const { symbol, decimals } = tokenDetails[toChecksumAddress(token)]
          const formattedAmount = formatTokenAmount(
            from ? amount : amount.neg(),
            decimals,
            { displaySign: true, digits: 5 }
          )

          const [source, recipient] = await Promise.all(
            [from, to].map(address => {
              return address
                ? resolveAddress(address).then(
                    res => (res && res.name) || address
                  )
                : 'Agent'
            })
          )
          return [
            format(date, ISO_SHORT_FORMAT),
            source,
            recipient,
            TRANSACTION_TYPES_LABELS[type],
            description,
            `${formattedAmount} ${symbol}`,
            transactionHash,
          ]
        })
      )
      return [...previous, ...mappedTokenTransfersData]
    },
    /* https://gyandeeps.com/array-reduce-async-await/ */
    Promise.resolve([])
  )

  return csv([
    [
      'Date',
      'Source',
      'Recipient',
      'Type',
      'Reference',
      'Amount',
      'Transaction Hash',
    ],
    ...processedTransactions,
  ])
}

function getDownloadFilename(agentAddress, { start, end }) {
  const today = format(Date.now(), ISO_SHORT_FORMAT)
  let filename = `agent_${agentAddress}_${today}.csv`
  if (start && end) {
    const formattedStart = format(start, ISO_SHORT_FORMAT)
    const formattedEnd = format(end, ISO_SHORT_FORMAT)
    filename = `agent_${agentAddress}_${formattedStart}_to_${formattedEnd}.csv`
  }
  return filename
}

function useDownloadData({
  agentAddress,
  filteredTransactions,
  tokenDetails,
  tokens,
  selectedDateRange,
}) {
  const { resolve } = useContext(IdentityContext)
  const toast = useToast()

  const onDownload = useCallback(async () => {
    const downloadData = await getDownloadData({
      transactions: filteredTransactions,
      tokenDetails,
      resolveAddress: resolve,
      tokens,
    })

    saveAs(
      new Blob([downloadData], { type: 'text/csv;charset=utf-8' }),
      getDownloadFilename(agentAddress, selectedDateRange)
    )
    toast('Transactions data exported')
  }, [
    agentAddress,
    filteredTransactions,
    resolve,
    selectedDateRange,
    toast,
    tokenDetails,
    tokens,
  ])

  return { onDownload }
}

export default useDownloadData
