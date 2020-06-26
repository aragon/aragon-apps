import React from 'react'
import { GU, Info, Link, useTheme } from '@aragon/ui'
import AgentSvg from './AgentSvg'

function AgentHelp() {
  const theme = useTheme()

  return (
    <React.Fragment>
      <Info
        css={`
          margin-bottom: ${2 * GU}px;
        `}
      >
        <div
          css={`
            display: grid;
            grid-template-rows: auto auto;
            grid-template-columns: auto 1fr;
            grid-column-gap: ${2 * GU}px;
            align-items: center;
          `}
        >
          <div
            css={`
              width: ${6 * GU}px;
              height: ${6 * GU}px;
            `}
          >
            <AgentSvg />
          </div>
          <div>
            <div
              css={`
                margin-bottom: ${0.5 * GU}px;
              `}
            >
              The Agent app can be used to interact with external contracts.
            </div>
            <div>
              <Link href="https://help.aragon.org/article/37-agent">Learn More</Link>
            </div>
          </div>
        </div>
      </Info>
    </React.Fragment>
  )
}

export default AgentHelp
