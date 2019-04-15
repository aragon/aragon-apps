const PLURALIZE_RE = /\$/g

export function pluralize(count, singular, plural, re = PLURALIZE_RE) {
  if (count === 1) {
    return singular.replace(re, count)
  }
  return plural.replace(re, count)
}

export function noop() {}
