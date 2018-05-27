// Demo state for App.js

const OPTION_COLORS = ['#028CD1', '#39CAD0', '#8CD102', '#CAD039', '#D0CA39']

// date utils
const HOURS = 1000 * 60 * 60
const dateFromNow = diff => new Date(Date.now() + diff)

// Generate history values
const historyPoints = prevPoints => {
  const maxDiff = 1 / prevPoints.length
  let remaining = 1
  const newPoints = prevPoints.map((point, i) => {
    const pointsLeft = prevPoints.length - i
    const maxDiff = remaining / pointsLeft
    const diff = -maxDiff + maxDiff * Math.random() * 2 / 2
    let newPoint = point + diff
    if (newPoint < 0) newPoint = 0.1
    if (newPoint > 1) newPoint = 0.9
    remaining = remaining - newPoint
    return newPoint
  })

  const correction = remaining / prevPoints.length

  return newPoints.map(point => point + correction)
}

export const surveys = [
  {
    id: '0x01',
    endDate: dateFromNow(28.23 * HOURS),
    question: 'Should ANT be listed on Binance?',
    options: [{ label: 'Yes' }, { label: 'No' }],
  },
  {
    id: '0x02',
    endDate: dateFromNow(32.44 * HOURS),
    question: 'Should offer Aragon as a voting mechanism for EIP resolution? ',
    options: [{ label: 'Yes' }, { label: 'Maybe' }, { label: 'No' }],
  },
  {
    id: '0x03',
    endDate: dateFromNow(44.74 * HOURS),
    question: 'Should drop shadows be banned?',
    options: [{ label: 'Yes!' }, { label: 'Nooo…' }],
  },
  {
    id: '0x04',
    endDate: dateFromNow(-28.98 * HOURS),
    question: 'Which exchanges should Aragon engage with for listing ANT?',
    options: [{ label: 'Binance' }, { label: 'OKEx' }, { label: 'None' }],
  },
  {
    id: '0x05',
    endDate: dateFromNow(-10.41 * HOURS),
    question:
      'How much should Nest spend on funding open source projects yearly?',
    options: [
      { label: '$2m' },
      { label: '$1m' },
      { label: '$500k' },
      { label: '$100k' },
    ],
  },
].map((survey, i) => {
  const historyLength =
    survey.endDate < new Date() ? 16 : 5 + Math.floor(Math.random() * 5)
  const history = [...new Array(historyLength)].map((_, i, history) =>
    historyPoints(history[i - 1] || new Array(survey.options.length).fill(0.5))
  )
  return {
    ...survey,
    url: `https://github.com/aragon/nest/issues/${i + 1}`,
    createdBy: '0x15840997e342e2637a4087b8da7d595302ecdbca',
    options: survey.options.map((option, i) => {
      const value = history[history.length - 1][i]
      return {
        ...option,
        id: survey.id + option.label,
        color: OPTION_COLORS[i % OPTION_COLORS.length],
        value,
        totalVotes: Math.round(10000 * value),
      }
    }),
    history,
  }
})
