import React from 'react'
import { Card, Link, GU, textStyle, useTheme } from '@aragon/ui'
import AgentSvg from './AgentSvg'

function ComingSoon() {
  const theme = useTheme()

  return (
    <Card
      css={`
        width: 100%;
        min-height: ${72 * GU}px;
        text-align: center;
      `}
    >
      <div
        css={`
          margin-bottom: ${2 * GU}px;
        `}
      >
        <AgentSvg />
      </div>
      <h2
        css={`
          color: ${theme.content};
          ${textStyle('title2')};
          margin-bottom: ${2 * GU}px;
          padding: 0 ${2 * GU}px;
        `}
      >
        Agent transaction list is here!
      </h2>
      <div
        css={`
          text-align: center;
          max-width: ${52 * GU}px;
          color: ${theme.contentSecondary};
          ${textStyle('body2')};
          padding: 0 ${2 * GU}px;
        `}
      >
        <p>We have released the new Agent UI in v5.</p>
        <p>
          To obtain it, you must update your app to the latest version through
          the{' '}
          <Link href="https://help.aragon.org/article/22-app-center">
            App Center
          </Link>
          .
        </p>
      </div>
    </Card>
  )
}

export default ComingSoon
