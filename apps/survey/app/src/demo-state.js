// Demo state for App.js

// date utils
const HOURS = 1000 * 60 * 60
const dateFromNow = diff => new Date(Date.now() + diff)

export const surveys = [
  {
    endDate: dateFromNow(28.23 * HOURS),
    question: 'Should ANT be listed on Binance?',
    options: [{ label: 'Yes', value: 0.69 }, { label: 'No', value: 0.31 }],
  },
  {
    endDate: dateFromNow(32.44 * HOURS),
    question: 'Should offer Aragon as a voting mechanism for EIP resolution? ',
    options: [
      { label: 'Yes', value: 0.22 },
      { label: 'Maybe', value: 0.25 },
      { label: 'No', value: 0.53 },
    ],
  },
  {
    endDate: dateFromNow(44.74 * HOURS),
    question: 'Should drop shadows be banned?',
    options: [{ label: 'Yes!', value: 0.4 }, { label: 'Nooo…', value: 0.6 }],
  },
  {
    endDate: dateFromNow(-28.98 * HOURS),
    question: 'Which exchanges should Aragon engage with for listing ANT?',
    options: [
      { label: 'Binance', value: 0.48 },
      { label: 'OKEx', value: 0.25 },
      { label: 'None', value: 0.27 },
    ],
  },
  {
    endDate: dateFromNow(-10.41 * HOURS),
    question:
      'How much should Nest spend on funding open source projects yearly?',
    options: [
      { label: '$2m', value: 0.48 },
      { label: '$1m', value: 0.25 },
      { label: '$500k', value: 0.04 },
      { label: '$100k', value: 0.23 },
    ],
  },
]
