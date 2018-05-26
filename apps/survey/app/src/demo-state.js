// Demo state for App.js

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
    surveyId: '0x01',
    endDate: dateFromNow(28.23 * HOURS), // TODO: use start date + survey time transform to date
    metadata: {
      question: 'Should ANT be listed on Binance?',
      description: 'This is the description',
    },
    options: [{ label: 'Yes' }, { label: 'No' }],
    votingPower: 10000,
  },
  {
    surveyId: '0x02',
    endDate: dateFromNow(32.44 * HOURS),
    metadata: {
      question:
        'Should offer Aragon as a voting mechanism for EIP resolution? ',
      description: 'This is the description',
    },
    options: [{ label: 'Yes' }, { label: 'Maybe' }, { label: 'No' }],
    votingPower: 10000,
  },
  {
    surveyId: '0x03',
    endDate: dateFromNow(44.74 * HOURS),
    metadata: {
      question: 'Should drop shadows be banned?',
      description: 'This is the description',
    },
    options: [{ label: 'Yes!' }, { label: 'Nooo…' }],
    votingPower: 10000,
  },
  {
    surveyId: '0x04',
    endDate: dateFromNow(-28.98 * HOURS),
    metadata: {
      question: 'Which exchanges should Aragon engage with for listing ANT?',
      description: 'This is the description',
    },
    options: [{ label: 'Binance' }, { label: 'OKEx' }, { label: 'None' }],
    votingPower: 10000,
  },
  {
    surveyId: '0x05',
    endDate: dateFromNow(-10.41 * HOURS),
    metadata: {
      question:
        'How much should Nest spend on funding open source projects yearly?',
      description: 'This is the description',
    },
    options: [
      { label: '$2m' },
      { label: '$1m' },
      { label: '$500k' },
      { label: '$100k' },
    ],
    votingPower: 10000,
  },
].map((survey, i) => {
  const historyLength =
    survey.endDate < new Date() ? 16 : 5 + Math.floor(Math.random() * 5)
  const history = [...new Array(historyLength)].map((_, i, history) =>
    historyPoints(history[i - 1] || new Array(survey.options.length).fill(0.5))
  )
  return {
    ...survey,
    creator: '0x15840997e342e2637a4087b8da7d595302ecdbca',
    options: survey.options.map((option, i) => {
      const power = history[history.length - 1][i]
      return {
        ...option,
        optionId: `${i + 1}`,
        power: Math.round(10000 * power),
      }
    }),
    history,
    metadata: {
      ...survey.metadata,
      url: `https://github.com/aragon/nest/issues/${i + 1}`,
    },
  }
})
