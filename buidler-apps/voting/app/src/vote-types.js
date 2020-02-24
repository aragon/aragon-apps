// Because these are passed between the background script and the app, we don't use symbols
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#Supported_types
export const VOTE_ABSENT = 'VOTE_ABSENT'
export const VOTE_YEA = 'VOTE_YEA'
export const VOTE_NAY = 'VOTE_NAY'

export const VOTE_STATUS_ONGOING = Symbol('VOTE_STATUS_ONGOING')
export const VOTE_STATUS_REJECTED = Symbol('VOTE_STATUS_REJECTED')
export const VOTE_STATUS_ACCEPTED = Symbol('VOTE_STATUS_ACCEPTED')
export const VOTE_STATUS_ENACTED = Symbol('VOTE_STATUS_ENACTED')
export const VOTE_STATUS_PENDING_ENACTMENT = Symbol(
  'VOTE_STATUS_PENDING_ENACTMENT'
)
