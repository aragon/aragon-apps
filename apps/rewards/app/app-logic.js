import { useCallback, useMemo, } from 'react'
import { usePath } from '@aragon/api-react'

const PATH_REGEX = /^\/(rewards|myrewards)(?:\/([0-9])?)?(?:\/)?$/

const TABS = [ 'Overview', 'My Rewards' ]

const urlify = str => {
  if(str) {
    str = str.toLowerCase()
    str = str.replace(' ', '')
  }
  return str
}

export const usePathSegments = () => {
  const [ path, requestPath ] = usePath()

  const fromPath = useMemo(() => {
    const [ , urlTab, rewardId ] = path.match(PATH_REGEX) || []
    const tabIndex = TABS.findIndex(tab => urlify(tab) === urlify(urlTab))
    const pathSegments = {
      selected: tabIndex !== -1 ? tabIndex : 0,
      rewardId: rewardId ? String(rewardId) : null
    }
    return pathSegments
  }, [path])

  const selectTab = useCallback(
    tabIndex => {
      const tab = urlify(TABS[tabIndex])
      // For consistency "/overview/"" path will be transformed to root "/" path
      const newPath = (!tabIndex || tabIndex < 1) ? '' : `/${tab}`
      requestPath(newPath)
    },
    [requestPath]
  )

  const selectReward = useCallback(
    (selected, rewardId) => {
      if(selected === 0) {
        //If we are on 'Overview' tab, reward links will look like '/rewards/rewardId'
        requestPath(!rewardId ? '' : `/rewards/${rewardId}`)
      } else {
        //If we are on 'My Rewards' tab, reward links will look like '/myrewards/rewardId'
        requestPath(`${urlify(TABS[selected])}${rewardId ? '/' + rewardId : ''}`)
      }
    },
    [requestPath]
  )

  return { fromPath, selectReward,  selectTab }
}

// Handles the main logic of the app.
export const useAppLogic = () => {
  const { fromPath, selectReward, selectTab } = usePathSegments()
  return {
    tabs: TABS,
    fromPath,
    selectReward,
    selectTab,
  }
}
