import { createContext } from 'react'
import BN from 'bn.js'

export const NetworkContext = createContext('')
export const SettingsContext = createContext({
  pctBase: new BN(-1),
  voteTime: -1,
})
