import { useContext } from 'react'
import { NetworkContext, SettingsContext } from './app-contexts'

export const useNetwork = () => useContext(NetworkContext)
export const useSettings = () => useContext(SettingsContext)
