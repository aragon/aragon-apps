import React from 'react'
import { Card, Link, GU, Tag, textStyle, useTheme } from '@aragon/ui'
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
      <Tag
        mode="new"
        css={`
          margin-bottom: ${2 * GU}px;
        `}
      >
        Coming soon
      </Tag>
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
        We have released the new Agent UI. To obtain it, you must update your
        app to the latest version.
        <Link href="https://aragon.org/agent">
          Learn how you can start using it today
        </Link>
      </div>
    </Card>
  )
}

export default ComingSoon
