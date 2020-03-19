import { useContext, useCallback } from 'react'
import { format } from 'date-fns'
import { saveAs } from 'file-saver'
import { useCurrentApp } from '@aragon/api-react'
import { IdentityContext } from './IdentityManager/IdentityManager'
import { toChecksumAddress } from '../lib/web3-utils'
import { formatTokenAmount } from '../lib/utils'
import { formatDate, YYMMDD_LONG_FORMAT } from '../lib/date-utils'

// Transforms a two dimensional array into a CSV data structure
// Surround every field with double quotes + escape double quotes inside.
function csv(data) {
  return data
    .map(cells => cells.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

const getDownloadFilename = (appAddress, { start, end }) => {
  const today = format(Date.now(), YYMMDD_LONG_FORMAT)
  let filename = `finance_${appAddress}_${today}.csv`
  if (start && end) {
    const formattedStart = format(start, YYMMDD_LONG_FORMAT)
    const formattedEnd = format(end, YYMMDD_LONG_FORMAT)
    filename = `finance_${appAddress}_${formattedStart}_to_${formattedEnd}.csv`
  }
  return filename
}

const getDownloadData = async (transfers, tokenDetails, resolveAddress) => {
  const processedTransfers = await Promise.all(
    transfers.map(
      async ({
        date,
        numData: { amount },
        reference,
        isIncoming,
        entity,
        token,
      }) => {
        const { symbol, decimals } = tokenDetails[toChecksumAddress(token)]
        const formattedAmount = formatTokenAmount(
          amount,
          isIncoming,
          decimals,
          true,
          { rounding: 5 }
        )
        const { name = '' } = (await resolveAddress(entity)) || {}
        return [
          formatDate(date),
          name,
          entity,
          reference,
          `${formattedAmount} ${symbol}`,
        ]
      }
    )
  )

  return csv([
    ['Date', 'Name', 'Source/Recipient', 'Reference', 'Amount'],
    ...processedTransfers,
  ])
}

function useDownloadData({
  filteredTransfers,
  selectedDateRange,
  toast,
  tokenDetails,
}) {
  const { resolve: resolveAddress } = useContext(IdentityContext)
  const currentApp = useCurrentApp()

  const handleDownload = useCallback(async () => {
    const { appAddress: financeAddress } = currentApp
    const downloadData = await getDownloadData(
      filteredTransfers,
      tokenDetails,
      resolveAddress
    )
    const fileName = getDownloadFilename(financeAddress, selectedDateRange)

    saveAs(
      new Blob([downloadData], { type: 'text/csv;charset=utf-8' }),
      fileName
    )
    toast('Transfers data exported')
  }, [filteredTransfers, selectedDateRange, toast, tokenDetails])

  return { handleDownload }
}

export default useDownloadData
