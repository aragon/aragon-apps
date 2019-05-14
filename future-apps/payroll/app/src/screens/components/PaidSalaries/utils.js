import { subQuarters, subMonths, format } from 'date-fns'

export const CHART_TYPES = ['monthly', 'quarterly', 'yearly']

const [MONTHLY, QUARTERLY, YEARLY] = CHART_TYPES

const HISTORY_FORMAT = {
  [MONTHLY]: 'YYYYMM',
  [QUARTERLY]: 'YYYYQ',
  [YEARLY]: 'YYYY',
}

const MAX_PROPORTION = 4 / 5

const MONTHS_AGO = 12
const QUARTERS_AGO = 4

const calculateProportion = (max, value) => (value * MAX_PROPORTION) / max

const getHistoryKey = (date, type) =>
  format(date, HISTORY_FORMAT[type], { awareOfUnicodeTokens: true })

const getInitialHistory = {
  [MONTHLY]: () => {
    const months = Array(MONTHS_AGO + 1)
      .fill()
      .map((_, index) => index)

    const toDay = new Date()
    return months.reduce((acc, ago) => {
      const monthAgo = subMonths(toDay, ago)
      acc[getHistoryKey(monthAgo, MONTHLY)] = {
        label: format(monthAgo, 'MMM').toUpperCase(),
        amount: 0,
      }

      return acc
    }, {})
  },
  [QUARTERLY]: () => {
    const quartes = Array(QUARTERS_AGO + 1)
      .fill()
      .map((_, index) => index)

    const toDay = new Date()
    return quartes.reduce((acc, ago) => {
      const monthAgo = subQuarters(toDay, ago)
      const year = format(monthAgo, 'YY', { awareOfUnicodeTokens: true })
      const quarter = format(monthAgo, 'Q')
      acc[getHistoryKey(monthAgo, QUARTERLY)] = {
        label: `${year} Q${quarter}`,
        amount: 0,
      }

      return acc
    }, {})
  },
  [YEARLY]: () => ({}),
}

const groupPayments = {
  [MONTHLY]: payments => {
    const history = getInitialHistory[MONTHLY]()
    let max = 0

    payments.forEach(payment => {
      const date = new Date(payment.date)
      const { exchanged } = payment
      const key = getHistoryKey(date, MONTHLY)

      const newAmount = history[key].amount + exchanged
      history[key].amount = newAmount
      max = newAmount > max ? newAmount : max
    })

    return { max, history }
  },
  [QUARTERLY]: payments => {
    const history = getInitialHistory[QUARTERLY]()
    let max = 0

    payments.forEach(payment => {
      const date = new Date(payment.date)
      const { exchanged } = payment
      const key = getHistoryKey(date, QUARTERLY)

      const newAmount = history[key].amount + exchanged
      history[key].amount = newAmount
      max = newAmount > max ? newAmount : max
    })

    return { max, history }
  },
  [YEARLY]: payments => {
    let history = getInitialHistory[YEARLY]()
    let max = 0

    payments.forEach(payment => {
      const date = new Date(payment.date)
      const { exchanged } = payment
      const key = getHistoryKey(date, YEARLY)

      if (!history[key]) {
        history[key] = {
          label: key,
          amount: 0,
        }
      }

      const newAmount = history[key].amount + exchanged
      history[key].amount = newAmount
      max = newAmount > max ? newAmount : max
    })

    return { max, history }
  },
}

const getLabels = {
  [MONTHLY]: (sorted, history) =>
    sorted.map((key, i) => (i % 2 ? history[key].label : '')),
  [QUARTERLY]: (sorted, history) =>
    [''].concat(sorted.map((key, i) => history[key].label).slice(1)),
  [YEARLY]: (sorted, history) =>
    [''].concat(sorted.map((key, i) => history[key].label)),
}

export const getDurationSlices = {
  [MONTHLY]: _ => 14,
  [QUARTERLY]: _ => 6,
  [YEARLY]: labels => (labels ? labels.length + 1 : 2),
}

export const chartSettings = (type, payments) => {
  const { max, history } = groupPayments[type](payments)

  const sorted = Object.keys(history).sort() // The default sort order is built upon converting the elements into strings, then comparing their sequences of UTF-16 code units values.

  const initialValue = type === YEARLY ? [0] : [] // chart will start on 0 when is yearly

  const settings = [
    {
      optionId: type,
      color: '#028CD1',
      values: initialValue.concat(
        sorted.map(key => calculateProportion(max, history[key].amount))
      ),
    },
  ]

  const labels = getLabels[type](sorted, history)

  return { settings, labels }
}
