import {app} from '.'

const reducer = (settings, eventHandler) => async (prevState, event) => {
  const state = {...prevState}
  const eventData = {state, event, settings}

  // handle any received event and generate the new state
  return await eventHandler(eventData)
}

export const storeHandler = (settings, eventHandler, options = {}) => {
  return app.store(reducer(settings, eventHandler), options)
}
