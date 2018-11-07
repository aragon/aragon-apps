import Aragon from '@aragon/client'

const app = new Aragon()

const initialState = {}

app.store(async (state, { event }) => {
  if (state === null) state = initialState

  switch (event) {
    // TODO

    default:
      return state
  }
})
