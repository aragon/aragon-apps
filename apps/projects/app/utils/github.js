const STATUS = {
  AUTHENTICATED: 'authenticated',
  FAILED: 'failed',
  INITIAL: 'initial',
}
// TODO: STATUS.loading with a smooth transition component

/**
 * Helper functions related to github auth popup
 */

// TODO: let the user customize the github app on settings screen?
// TODO: Extract to an external js utility to keep this file clean
// Variable fields depending on the execution environment:
// TODO: This should be dynamically set depending on the execution environment (dev, prod...)
const AUTH_URI = 'https://tps.autark.xyz/authenticate'
const CLIENT_ID = '686f96197cc9bb07a43d'
const GITHUB_URI = 'https://github.com/login/oauth/authorize'

const getPopupSize = () => {
  return { width: 650, height: 850 }
}

const getPopupOffset = ({ width, height }) => {
  const wLeft = window.screenLeft ? window.screenLeft : window.screenX
  const wTop = window.screenTop ? window.screenTop : window.screenY

  const left = wLeft + window.innerWidth / 2 - width / 2
  const top = wTop + window.innerHeight / 2 - height / 2

  return { top, left }
}

const getPopupDimensions = () => {
  const { width, height } = getPopupSize()
  const { top, left } = getPopupOffset({ width, height })
  return `width=${width},height=${height},top=${top},left=${left}`
}

export const githubPopup = (popup, scope) => {
  // Checks to save some memory if the popup exists as a window object
  if (popup === null || popup.closed) {
    popup = window.open(
      // TODO: Improve readability here: encode = (params: Object) => (JSON.stringify(params).replace(':', '=').trim())
      // encode url params
      `${GITHUB_URI}?client_id=${CLIENT_ID}&scope=${scope}`,
      'githubAuth',
      // TODO: Improve readability here: encode = (fields: Object) => (JSON.stringify(fields).replace(':', '=').trim())
      `scrollbars=no,toolbar=no,location=no,titlebar=no,directories=no,status=no,menubar=no, ${getPopupDimensions()}`
    )
  } else popup.focus()
  return popup
}

export const getURLParam = param => {
  const searchParam = new URLSearchParams(window.location.search)
  return searchParam.get(param)
}

/**
 * Sends an http request to the AUTH_URI with the auth code obtained from the oauth flow
 * @param {string} code
 * @returns {string} The authentication token obtained from the auth server
 */
export const getToken = async code => {
  const response = await fetch(`${AUTH_URI}/${code}`)
  const json = await response.json()

  return json.token
}

export { STATUS }
