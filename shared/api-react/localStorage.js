export const load = (key) => {
  try {
    const serializedState = localStorage.getItem(key)
    if (serializedState === null) {
      return undefined
    }
    return JSON.parse(serializedState)
  } catch (err) {
    return undefined
  }
}

export const save = (key, state) => {
  const serializedState = JSON.stringify(state)
  localStorage.setItem(key, serializedState)
}
