import { useContext, useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { saveAs } from 'file-saver'
import { IdentityContext } from './IdentityManager/IdentityManager'
import { toChecksumAddress } from '../lib/web3-utils'
import { formatTokenAmount, ROUNDING_AMOUNT } from '../lib/utils'
import { formatDate, ISO_SHORT_FORMAT } from '../lib/date-utils'

// Transforms a two dimensional array into a CSV data structure
// Surround every field with double quotes + escape double quotes inside.
function csv(data) {
  return data
    .map(cells => cells.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

async function getDownloadData({ transactions, tokenDetails, resolveAddress }) {
  const processedTransactions = await transactions.reduce(
    async (transactionList, { tokenTransfers, date, description }) => {
      const previous = await transactionList
      const mappedTokenTransfersData = await Promise.all(
        tokenTransfers.map(async ({ amount, from, to, token }) => {
          const { symbol, decimals } = tokenDetails[toChecksumAddress(token)]
          const formattedAmount = formatTokenAmount(
            amount,
            Boolean(from),
            decimals,
            true,
            { rounding: ROUNDING_AMOUNT }
          )
          const [name, entity] = await Promise.all(
            [from, to].map(address => {
              return address
                ? resolveAddress(address).then(
                    res => (res && res.name) || address
                  )
                : 'Agent'
            })
          )
          return [
            formatDate(date),
            name,
            entity,
            description,
            `${formattedAmount} ${symbol}`,
          ]
        })
      )
      return [...previous, ...mappedTokenTransfersData]
    },
    /* https://gyandeeps.com/array-reduce-async-await/ */
    Promise.resolve([])
  )

  return csv([
    ['Date', 'Source', 'Recipient', 'Reference', 'Amount'],
    ...processedTransactions,
  ])
}

function getDownloadFilename({ start, end }) {
  const today = format(Date.now(), ISO_SHORT_FORMAT)
  let filename = `agent_${today}.csv`
  if (start && end) {
    const formattedStart = format(start, ISO_SHORT_FORMAT)
    const formattedEnd = format(end, ISO_SHORT_FORMAT)
    filename = `agent_${formattedStart}_to_${formattedEnd}.csv`
  }
  return filename
}

function useDownloadData({
  filteredTransactions,
  tokenDetails,
  tokens,
  selectedDateRange,
}) {
  const { resolve } = useContext(IdentityContext)

  const onDownload = useCallback(async () => {
    const downloadData = await getDownloadData({
      transactions: filteredTransactions,
      tokenDetails,
      resolveAddress: resolve,
      tokens,
    })

    saveAs(
      new Blob([downloadData], { type: 'text/csv;charset=utf-8' }),
      getDownloadFilename(selectedDateRange)
    )
  }, [filteredTransactions, resolve, selectedDateRange, tokenDetails, tokens])

  return { onDownload }
}

export default useDownloadData
