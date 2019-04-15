import Aragon from '@aragon/client'
import { of } from './rxjs'
import surveySettings, {
  DURATION_SLICES,
  hasLoadedSurveySettings,
} from './survey-settings'
import { getTimeBucket } from './time-utils'
import tokenDecimalsAbi from './abi/token-decimals.json'
import tokenSymbolAbi from './abi/token-symbol.json'

const INITIALIZATION_TRIGGER = Symbol('INITIALIZATION_TRIGGER')

const tokenAbi = [].concat(tokenDecimalsAbi, tokenSymbolAbi)

const app = new Aragon()

/*
 * Calls `callback` exponentially, everytime `retry()` is called.
 *
 * Usage:
 *
 * retryEvery(retry => {
 *  // do something
 *
 *  if (condition) {
 *    // retry in 1, 2, 4, 8 seconds… as long as the condition passes.
 *    retry()
 *  }
 * }, 1000, 2)
 *
 */
const retryEvery = (callback, initialRetryTimer = 1000, increaseFactor = 5) => {
  const attempt = (retryTimer = initialRetryTimer) => {
    // eslint-disable-next-line standard/no-callback-literal
    callback(() => {
      console.error(`Retrying in ${retryTimer / 1000}s...`)

      // Exponentially backoff attempts
      setTimeout(() => attempt(retryTimer * increaseFactor), retryTimer)
    })
  }
  attempt()
}

// Get the token address to initialize ourselves
retryEvery(retry => {
  app
    .call('token')
    .first()
    .subscribe(initialize, err => {
      console.error(
        'Could not start background script execution due to the contract not loading the token:',
        err
      )
      retry()
    })
})

async function initialize(tokenAddr) {
  const token = app.external(tokenAddr, tokenAbi)

  let tokenSymbol
  try {
    tokenSymbol = await loadTokenSymbol(token)
    app.identify(tokenSymbol)
  } catch (err) {
    console.error(
      `Failed to load token symbol for token at ${tokenAddr} due to:`,
      err
    )
  }

  let tokenDecimals
  try {
    tokenDecimals = (await loadTokenDecimals(token)) || 0
  } catch (err) {
    console.err(
      `Failed to load token decimals for token at ${tokenAddr} due to:`,
      err
    )
    console.err('Defaulting to 0...')
    tokenDecimals = 0
  }

  return createStore(token, { decimals: tokenDecimals, symbol: tokenSymbol })
}

// Hook up the script as an aragon.js store
async function createStore(token, tokenSettings) {
  const { decimals: tokenDecimals, symbol: tokenSymbol } = tokenSettings
  return app.store(
    async (
      state,
      { blockNumber, event, logIndex, returnValues, transactionIndex }
    ) => {
      let nextState = {
        ...state,
        // Fetch the app's settings, if we haven't already
        ...(!hasLoadedSurveySettings(state) ? await loadSurveySettings() : {}),
      }

      if (event === INITIALIZATION_TRIGGER) {
        nextState = {
          ...nextState,
          tokenDecimals,
          tokenSymbol,
        }
      } else {
        switch (event) {
          case 'StartSurvey':
            nextState = await startSurvey(nextState, returnValues)
            break
          case 'CastVote':
            nextState = await processVote(
              nextState,
              returnValues,
              blockNumber,
              transactionIndex,
              logIndex
            )
            break
          case 'ResetVote':
            // We have to manually calculate the option power left when a vote is reset
            returnValues = {
              ...returnValues,
              optionPower: returnValues.optionPower,
            }

            nextState = await processVote(
              nextState,
              returnValues,
              blockNumber,
              transactionIndex,
              logIndex
            )
            break
          default:
            break
        }
      }

      return nextState
    },
    [
      // Always initialize the store with our own home-made event
      of({ event: INITIALIZATION_TRIGGER }),
    ]
  )
}

/***********************
 *                     *
 *   Event Handlers    *
 *                     *
 ***********************/

async function startSurvey(state, { creator, metadata, surveyId }) {
  // Set up the survey options to allow the script to keep track of their voting history
  const transform = async survey => {
    let parsedMetadata = {}
    try {
      parsedMetadata = marshallMetadata(metadata).metadata || {}
    } catch (err) {
      console.error(
        `Failed to load survey ${surveyId}'s metadata (${metadata})`,
        err
      )
    }

    const { options: optionLabels = [] } = parsedMetadata

    // Add generic labels if not provided in the metadata
    while (survey.data.options > optionLabels.length) {
      optionLabels.push(`Option ${optionLabels.length + 1}`)
    }

    // Load initial voting powers for the options
    const options = await Promise.all(
      optionLabels.map(async (label, optionIndex) => {
        // Add one to optionIndex as optionId always starts from 1
        const optionId = optionIndex + 1
        const power = await loadSurveyOptionPower(surveyId, optionId)

        return {
          label,
          optionId,
          power,
        }
      })
    )

    return {
      ...survey,
      data: {
        ...survey.data,
        creator,
        metadata,
      },
      metadata: parsedMetadata,
      options,
      optionsHistory: {
        lastUpdated: {
          blockNumber: 0,
          logIndex: 0,
          transactionIndex: 0,
        },
        // Initialize each option's history with a "sparse" -1 filled array
        // whose length matches the number of time slices
        options: options.map(() => new Array(DURATION_SLICES).fill(-1)),
      },
    }
  }

  return updateState(state, surveyId, transform)
}

async function processVote(
  state,
  { optionPower, surveyId, voter, option: optionId },
  blockNumber,
  transactionIndex,
  logIndex
) {
  const transform = async ({ data, options, ...survey }) => {
    // Reload the contract data, mostly so we can get updated participation numbers
    const newData = await loadSurveyData(surveyId)
    return {
      ...survey,
      data: {
        ...data,
        ...newData,
      },
      optionsHistory: await updateHistoryForOption(
        survey.optionsHistory,
        optionId,
        optionPower,
        newData,
        state.surveyTime,
        blockNumber,
        transactionIndex,
        logIndex
      ),

      // Update power for option
      options: await updatePowerForOption(
        options,
        surveyId,
        parseInt(optionId, 10)
      ),
    }
  }
  return updateState(state, surveyId, transform)
}

/***********************
 *                     *
 *       Helpers       *
 *                     *
 ***********************/

async function updateState(state, surveyId, transform) {
  const { surveys = [] } = state

  return {
    ...state,
    surveys: await updateSurveys(surveys, surveyId, transform),
  }
}

async function updateSurveys(surveys, surveyId, transform) {
  const surveyIndex = surveys.findIndex(survey => survey.surveyId === surveyId)

  if (surveyIndex === -1) {
    // If we can't find it, load its data, perform the transformation, and concat
    return surveys.concat(await transform(await createNewSurvey(surveyId)))
  } else {
    const nextSurveys = Array.from(surveys)
    nextSurveys[surveyIndex] = await transform(nextSurveys[surveyIndex])
    return nextSurveys
  }
}

async function updatePowerForOption(options, surveyId, optionId) {
  const optionIndex = options.findIndex(option => option.optionId === optionId)

  if (optionIndex !== -1) {
    const nextOptions = Array.from(options)
    nextOptions[optionIndex] = {
      ...nextOptions[optionIndex],
      power: await loadSurveyOptionPower(surveyId, optionId),
    }
    return nextOptions
  } else {
    console.error(
      `Tried to update option #${optionId} in survey #${surveyId} that shouldn't exist!`
    )
  }
}

async function updateHistoryForOption(
  history,
  optionId,
  optionPower,
  surveyData,
  surveyTime,
  blockNumber,
  transactionIndex,
  logIndex
) {
  let newHistory = history
  const { lastUpdated } = history

  if (
    lastUpdated.blockNumber < blockNumber ||
    ((lastUpdated.blockNumber === blockNumber &&
      lastUpdated.transactionIndex < transactionIndex) ||
      (lastUpdated.transactionIndex === transactionIndex &&
        lastUpdated.logIndex < logIndex))
  ) {
    // We haven't encountered this event before! Let's update our history!
    const { startDate } = surveyData

    const blockTimestamp = await loadBlockTime(blockNumber)
    const timeBucket = getTimeBucket(
      blockTimestamp,
      startDate,
      surveyTime,
      DURATION_SLICES
    )

    // OptionId always starts at 1, so we need to adjust for our history arrays
    const optionIndex = optionId - 1
    const options = Array.from(history.options)
    const optionHistory = Array.from(options[optionIndex])

    optionHistory[timeBucket] = optionPower
    options[optionIndex] = optionHistory

    newHistory = {
      options,
      lastUpdated: {
        blockNumber,
        logIndex,
        transactionIndex,
      },
    }
  }

  return newHistory
}

async function createNewSurvey(surveyId) {
  return {
    surveyId,
    data: await loadSurveyData(surveyId),
  }
}

function loadSurveySettings() {
  return Promise.all(
    surveySettings.map(
      ([name, key, type = 'string']) =>
        new Promise((resolve, reject) =>
          app
            .call(name)
            .first()
            .map(val => {
              if (type === 'number') {
                return parseInt(val, 10)
              }
              if (type === 'time') {
                // Adjust for js time (in ms vs s)
                return parseInt(val, 10) * 1000
              }
              return val
            })
            .subscribe(value => {
              resolve({ [key]: value })
            }, reject)
        )
    )
  )
    .then(settings =>
      settings.reduce((acc, setting) => ({ ...acc, ...setting }), {})
    )
    .catch(err => {
      console.error('Failed to load Survey settings', err)
      // Return an empty object to try again later
      return {}
    })
}

function loadSurveyData(surveyId) {
  return new Promise(resolve => {
    app
      .call('getSurvey', surveyId)
      .first()
      .subscribe(survey => {
        resolve(marshallSurvey(survey))
      })
  })
}

function loadSurveyOptionPower(surveyId, optionId) {
  return new Promise(resolve =>
    app
      .call('getOptionPower', surveyId, optionId)
      .first()
      .map(power => parseInt(power, 10))
      .subscribe(resolve, err => {
        console.error(
          `Failed to get option power for option #${optionId} in survey #${surveyId}`,
          err
        )
        resolve(0)
      })
  )
}

function loadBlockTime(blockNumber) {
  return new Promise((resolve, reject) =>
    app
      .web3Eth('getBlock', blockNumber)
      .first()
      // Adjust for solidity time (s => ms)
      .map(({ timestamp }) => timestamp * 1000)
      .subscribe(resolve, reject)
  )
}

function loadTokenDecimals(tokenContract) {
  return new Promise((resolve, reject) => {
    tokenContract
      .decimals()
      .first()
      .map(val => parseInt(val, 10))
      .subscribe(resolve, reject)
  })
}

function loadTokenSymbol(tokenContract) {
  return new Promise((resolve, reject) => {
    tokenContract
      .symbol()
      .first()
      .subscribe(resolve, reject)
  })
}

// Apply transmations to a survey received from web3
// Note: ignores the 'open' field as we calculate that locally
function marshallSurvey({
  startDate,
  snapshotBlock,
  minParticipation,
  votingPower,
  participation,
  options,
}) {
  return {
    startDate: parseInt(startDate, 10) * 1000, // adjust for js time (in ms vs s)
    minParticipation: parseInt(minParticipation, 10),
    snapshotBlock: parseInt(snapshotBlock, 10),
    votingPower: parseInt(votingPower, 10),
    participation: parseInt(participation, 10),
    options: parseInt(options, 10),
  }
}

function marshallMetadata(metadata) {
  return JSON.parse(metadata)
}
