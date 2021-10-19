import React, { useCallback, useEffect, useState } from 'react'
import { useAragonApi } from '../../../api-react'
import { Button, GU, Link, Text } from '@aragon/ui'
import { LoadingAnimation } from '../../Shared'
import {
  REQUESTED_GITHUB_TOKEN_SUCCESS,
  REQUESTED_GITHUB_TOKEN_FAILURE,
} from '../../../store/eventTypes'
import { getToken, githubPopup, STATUS } from '../../../utils/github'

const Loading = () => (
  <div css={`text-align: center; margin-top: ${15 * GU}px`}>
    <LoadingAnimation />
  </div>
)

const SCOPE = 'public_repo'
let popupRef = null

export default function AuthorizeGitHub() {
  const { api } = useAragonApi()
  const [ githubLoading, setGithubLoading ] = useState(false)

  useEffect(() => {
    window.addEventListener('message', handlePopupMessage)
    return () => {
      window.removeEventListener('message', handlePopupMessage)
    }
  })

  const handlePopupMessage = useCallback(async message => {
    if (!popupRef) return
    if (message.source !== popupRef) return

    popupRef = null

    if (message.data.from !== 'popup') return
    if (message.data.name === 'code') {
      const code = message.data.value
      try {
        const token = await getToken(code)
        api.emitTrigger(REQUESTED_GITHUB_TOKEN_SUCCESS, {
          status: STATUS.AUTHENTICATED,
          scope: SCOPE,
          token
        })
      } catch (err) {
        api.emitTrigger(REQUESTED_GITHUB_TOKEN_FAILURE, {
          status: STATUS.FAILED,
          scope: null,
          token: null,
        })
      }
    }
  }, [])

  const requestExtraPermissions = useCallback(() => {
    setGithubLoading(true)
    popupRef = githubPopup(popupRef, SCOPE)
  }, [])

  if (githubLoading) return <Loading />

  return (
    <>
      <br />
      <Text.Block size="xlarge">We’re going to need more permissions</Text.Block>
      <br />
      <Text.Block>
        The Projects app can make GitHub issues on your behalf, but to do that
        you need to increase the level of authorization granted to the app.
        GitHub calls this level of permissions the “
        <Link
          href="https://developer.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/#available-scopes"
        >public_repo scope</Link>”.
        <br /><br />
        Granting this permission does not give any third party access to your
        GitHub account.{' '}
        <Link
          href="https://autark.gitbook.io/open-enterprise/apps/projects#github-authorization"
        >Read here</Link> for more details.
      </Text.Block>
      <br />
      <Button onClick={requestExtraPermissions} mode="strong">
        I’m ready, authorize extra GitHub permissions
      </Button>
    </>
  )
}
