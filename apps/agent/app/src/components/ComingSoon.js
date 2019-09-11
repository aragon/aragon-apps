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
        `}
      >
        Agent transaction list is coming soon!
      </h2>
      <div
        css={`
          text-align: center;
          max-width: ${52 * GU}px;
          color: ${theme.contentSecondary};
          ${textStyle('body2')};
        `}
      >
        We are currently working on the full version of this app. You’ll soon be
        able to browse Agent interactions with other Ethereum applications
        from here.
        <Link href="https://aragon.org/agent">Learn how you can start using it today</Link>
      </div>
    </Card>
  )
}

export default ComingSoon
