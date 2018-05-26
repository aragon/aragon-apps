import Aragon from '@aragon/client'
import surveySettings, { hasLoadedSurveySettings } from './survey-settings'

const app = new Aragon()

// Hook up the script as an aragon.js store
app.store(async (state, { event, returnValues }) => {
  let nextState = {
    ...state,
    // Fetch the app's settings, if we haven't already
    ...(!hasLoadedSurveySettings(state) ? await loadSurveySettings() : {}),
  }

  switch (event) {
    case 'StartSurvey':
      nextState = await startSurvey(nextState, returnValues)
      break
    case 'CastVote':
      nextState = await castVote(nextState, returnValues)
      break
    default:
      break
  }

  return nextState
})

/***********************
 *                     *
 *   Event Handlers    *
 *                     *
 ***********************/

async function startSurvey(state, { surveyId }) {
  const transform = survey => survey

  return updateState(state, surveyId, transform)
}

async function castVote(state, { surveyId, voter, option: optionId }) {
  const transform = async ({ data, ...survey }) => ({
    ...survey,

    // Reload the contract data, mostly so we can get updated participation numbers
    data: await loadSurveyData(surveyId),

    // Update power for option
    options: updatePowerForOption(survey.options, surveyId, optionId),

    // TODO: recalculate histogram buckets
  })
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

  if (surveyId === -1) {
    // If we can't find it, load its data, perform the transformation, and concat
    return surveys.concat(await transform(createNewSurvey(surveyId)))
  } else {
    const nextSurveys = Array.from(surveys)
    nextSurveys[surveyIndex] = await transform(nextSurveys[surveyIndex])
    return nextSurveys
  }
}

async function updatePowerForOption(options, surveyId, optionId) {
  const optionIndex = options.findIndex(option => option.optionId === optionId)

  if (surveyId !== -1) {
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

async function createNewSurvey(surveyId) {
  const surveyData = await loadSurveyData(surveyId)
  const surveyMetadata = await loadSurveyMetadata(surveyId)
  const {
    metadata: { options: optionLabels = [], ...metadata } = {},
  } = surveyMetadata

  while (surveyData.options > optionLabels.length) {
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
        power,
        optionId,
      }
    })
  )

  return {
    metadata,
    options,
    data: surveyData,
    history: [],
    id: surveyId,
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

function loadSurveyMetadata(surveyId) {
  return new Promise(resolve => {
    app
      .call('getSurveyMetadata', surveyId)
      .first()
      .subscribe(metadata => {
        try {
          resolve(marshallMetadata(metadata))
        } catch (err) {
          console.error(`Failed to load survey ${surveyId}'s metadata`, err)
          resolve({})
        }
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

// Apply transmations to a survey received from web3
// Note: ignores the 'open' field as we calculate that locally
function marshallSurvey({
  creator,
  startDate,
  snapshotBlock,
  minParticipationPct,
  votingPower,
  participation,
  options,
}) {
  return {
    creator,
    startDate: parseInt(startDate, 10) * 1000, // adjust for js time (in ms vs s)
    minParticipationPct: parseInt(minParticipationPct, 10),
    snapshotBlock: parseInt(snapshotBlock, 10),
    votingPower: parseInt(votingPower, 10),
    participation: parseInt(participation, 10),
    options: parseInt(options, 10),
  }
}

function marshallMetadata(metadata) {
  return JSON.parse(metadata)
}
