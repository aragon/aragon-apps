import { useContext, useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { saveAs } from 'file-saver'
import { IdentityContext } from './IdentityManager/IdentityManager'
import { toChecksumAddress } from '../lib/web3-utils'
import { formatTokenAmount, ROUNDING_AMOUNT } from '../lib/utils'
import { formatDate } from '../lib/date-utils'

async function getDownloadData({ transactions, tokenDetails, resolveAddress }) {
  const processedTransactions = await transactions.reduce(
    async (transactionList, { tokenTransfers, date, description }) => {
      const previous = await transactionList
      const mappedTokenTransfersData = await Promise.all(
        tokenTransfers.map(async ({ amount, from, to, token }) => {
          const { symbol, decimals } = tokenDetails[toChecksumAddress(token)]
          const formattedAmount = formatTokenAmount(
            amount,
            !!from,
            decimals,
            true,
            { rounding: ROUNDING_AMOUNT }
          )
          const [name, entity] = await Promise.all(
            [from, to].map(address =>
              address
                ? resolveAddress(address).then(res => (res && res.name) || '')
                : 'Agent'
            )
          )
          return `${formatDate(
            date
          )},${name},${entity},${description},${`"${formattedAmount} ${symbol}"`}`
        })
      )
      return [...previous, ...mappedTokenTransfersData]
    },
    /* https://gyandeeps.com/array-reduce-async-await/ */
    Promise.resolve([])
  )
  return ['Date,Name,Source/Recipient,Reference,Amount']
    .concat(processedTransactions)
    .join('\n')
}

function getDownloadFilename({ start, end }) {
  const today = format(Date.now(), 'yyyy-MM-dd')
  let filename = `agent_${today}.csv`
  if (start && end) {
    const formattedStart = format(start, 'yyyy-MM-dd')
    const formattedEnd = format(end, 'yyyy-MM-dd')
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
