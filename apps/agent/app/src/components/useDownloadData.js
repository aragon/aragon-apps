import { useContext, useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { saveAs } from 'file-saver'
import { IdentityContext } from './IdentityManager/IdentityManager'
import { toChecksumAddress } from '../lib/web3-utils'
import { formatTokenAmount } from '../lib/utils'

const formatDate = date => format(date, 'MM/dd/yy')

const getDownloadData = async ({
  transfers,
  tokenDetails,
  resolveAddress,
  tokens,
}) => {
  const mappedData = await transfers.reduce(
    async (
      promise,
      { tokenTransfers, date, description, type, isIncoming, onlyOne }
    ) => {
      const previous = await promise
      const mappedTokenTransfersData = await Promise.all(
        tokenTransfers.map(async ({ amount, from, to, token }) => {
          const { symbol, decimals } = tokenDetails[toChecksumAddress(token)]
          const formattedAmount = formatTokenAmount(
            amount,
            !!from,
            decimals,
            true,
            { rounding: 5 }
          )
          const name = await (async () => {
            if (!from) {
              return 'Agent'
            }
            const { name } = (await resolveAddress(from)) || { name: '' }
            return name
          })()
          const entity = await (async () => {
            if (!to) {
              return 'Agent'
            }
            const { name } = (await resolveAddress(to)) || { name: '' }
            return name
          })()
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
    .concat(mappedData)
    .join('\n')
}
const getDownloadFilename = (dao, { start, end }) => {
  const today = format(Date.now(), 'yyyy-MM-dd')
  let filename = `finance_${dao}_${today}.csv`
  if (start && end) {
    const formattedStart = format(start, 'yyyy-MM-dd')
    const formattedEnd = format(end, 'yyyy-MM-dd')
    filename = `finance_${dao}_${formattedStart}_to_${formattedEnd}.csv`
  }
  return filename
}

function useDownloadData({
  filteredTransfers,
  tokenDetails,
  tokens,
  selectedDateRange,
  dao,
}) {
  const { resolve } = useContext(IdentityContext)
  const [downloadData, setDownloadData] = useState(null)
  const [filename, setFilename] = useState(
    getDownloadFilename(dao, selectedDateRange)
  )

  const onDownload = useCallback(async () => {
    saveAs(
      new Blob([downloadData], { type: 'text/csv;charset=utf-8' }),
      filename
    )
  }, [downloadData, filename])

  useEffect(() => {
    const fetch = async () => {
      const data = await getDownloadData({
        transfers: filteredTransfers,
        tokenDetails,
        resolveAddress: resolve,
        tokens,
      })
      setDownloadData(data)
    }
    fetch()
  }, [filteredTransfers, tokens, tokenDetails, resolve])

  useEffect(() => {
    const filename = getDownloadFilename(dao, selectedDateRange)
    setFilename(filename)
  }, [dao, selectedDateRange])

  return { onDownload }
}

export default useDownloadData
