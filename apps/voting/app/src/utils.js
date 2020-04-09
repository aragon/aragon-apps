import { format } from 'date-fns'

const PLURALIZE_RE = /\$/g

export function pluralize(count, singular, plural, re = PLURALIZE_RE) {
  if (count === 1) {
    return singular.replace(re, count)
  }
  return plural.replace(re, count)
}

export function noop() {}

export function formatDate(date) {
  return `${format(date, 'HH:mm')} on ${format(date, 'do')} of ${format(
    date,
    'MMM. yyyy'
  )}`
}
