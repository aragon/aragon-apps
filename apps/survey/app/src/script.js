import Aragon from '@aragon/client'
import { combineLatest } from './rxjs'
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
  const transform = ({ data, ...survey }) => ({
    ...survey,
    data: { ...data },
  })
  return updateState(state, surveyId, transform)
}

async function castVote(state, { surveyId }) {
  const transform = async survey => ({
    ...survey,
    data: await loadSurveyData(surveyId),
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
    surveys: await updateSurvey(surveys, surveyId, transform),
  }
}

async function updateSurvey(surveys, surveyId, transform) {
  const surveyIndex = surveys.findIndex(survey => survey.surveyId === surveyId)

  if (surveyId === -1) {
    // If we can't find it, load its data, perform the transformation, and concat
    return surveys.concat(
      await transform({
        surveyId,
        data: await loadSurveyData(surveyId),
      })
    )
  } else {
    const nextSurveys = Array.from(surveys)
    nextSurveys[surveyIndex] = await transform(nextSurveys[surveyIndex])
    return nextSurveys
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
    combineLatest(
      app.call('getSurvey', surveyId),
      app.call('getSurveyMetadata', surveyId)
    )
      .first()
      .subscribe(([survey, metadata]) => {
        resolve({
          ...marshallSurvey(survey),
          metadata,
        })
      })
  })
}

function marshallSurvey({
  open,
  creator,
  startDate,
  snapshotBlock,
  minParticipationPct,
  votingPower,
  participation,
  options,
}) {
  return {
    open,
    creator,
    startDate: parseInt(startDate, 10) * 1000, // adjust for js time (in ms vs s)
    minParticipationPct: parseInt(minParticipationPct, 10),
    snapshotBlock: parseInt(snapshotBlock, 10),
    votingPower: parseInt(votingPower, 10),
    participation: parseInt(participation, 10),
    options: parseInt(options, 10),
  }
}
