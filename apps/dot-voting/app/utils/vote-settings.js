import { app } from '../store/app'
import { first, map } from 'rxjs/operators' // Make sure observables have .first and .map

const voteSettings = [
  [ 'token', 'tokenAddress' ],
  [ 'voteTime', 'voteTime', 'time' ],
  [ 'PCT_BASE', 'pctBase', 'number' ],
  [ 'globalCandidateSupportPct', 'globalCandidateSupportPct', 'number' ],
  [ 'globalMinQuorum', 'globalMinQuorum', 'number' ],
]

export const hasLoadedVoteSettings = (state) => {
  state = state || {}
  return voteSettings.reduce((loaded, [key]) => loaded && !!state[key], true)
}

export const loadVoteSettings =  () => {
  return Promise.all(
    voteSettings.map(
      ([ name, key, type = 'string' ]) =>
        new Promise((resolve, reject) =>
          app
            .call(name)
            .pipe(
              first(),
              map(val => {
                if (type === 'number') {
                  return parseInt(val, 10)
                }
                if (type === 'time') {
                  // Adjust for js time (in ms vs s)
                  return parseInt(val, 10) * 1000
                }
                return val
              })
            )
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
      console.error('Failed to load Vote settings', err)
      // Return an empty object to try again later
      return {}
    })
}
