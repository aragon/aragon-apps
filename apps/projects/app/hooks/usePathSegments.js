import { useCallback, useMemo } from 'react'
import { usePath } from '@aragon/api-react'

const PATH_REGEX = /^\/(settings|issues)(?:\/([a-zA-Z0-9=]{24})?)?($|\?|#)/
const SEARCH_REGEX = /\?(.+)($|#)/ // everything between ? and end-of-line or a hash sign
const SEARCH_PARAM_REGEX = /([a-zA-Z0-9]+)=([a-zA-Z0-9=]+)/

export default function usePathSegments() {
  const [ path, requestPath ] = usePath()
  const [ , selectedTab, selectedIssueId ] = path.match(PATH_REGEX) || []
  const [ , search ] = path.match(SEARCH_REGEX) || []

  const selectIssue = useCallback(issueId => {
    requestPath && requestPath(`/issues/${issueId || ''}`)
  }, [requestPath])

  const query = useMemo(() => {
    if (!search) return {}

    return search.split('&').reduce(
      (acc, param) => {
        const [ , key, value ] = param.match(SEARCH_PARAM_REGEX)
        acc[key] = value
        return acc
      },
      {}
    )
  }, [search])

  return {
    selectedTab: selectedTab || 'overview',
    selectedIssueId,
    selectIssue,
    query,
  }
}
