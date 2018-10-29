export const SORT_DIRECTION = {
  ASC: 1,
  DESC: -1
}

export function sort (items, sortValue, direction) {
  if (!Array.isArray(items) || items.length < 2) {
    return items
  }

  // USe memoization to avoid calculate values more than once
  const values = new WeakMap()

  const getValue = (item) => {
    if (!values.has(item)) {
      values.set(item, sortValue(item))
    }

    return values.get(item)
  }

  // Sort item in place to avoid copying the array
  items.sort((item1, item2) => {
    const a = getValue(item1)
    const b = getValue(item2)

    if (a === b) return 0
    if (a < b) return -direction
    if (a == null) return 1
    if (b == null) return -1

    return direction
  })

  return items
}
