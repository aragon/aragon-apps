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
  return `${format(date, 'yyyy-MM-dd, HH:mm')}`
}

export function hexToAscii(hexadecimal) {
  var hex = hexadecimal.toString()
  var string = ''
  for (var n = 0; n < hex.length; n += 2) {
    string += String.fromCharCode(parseInt(hex.substr(n, 2), 16))
  }
  return string
}
