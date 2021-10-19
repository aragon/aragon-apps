import React, { Fragment } from 'react'
import { EmptyStateCard, GU, LoadingRing, font } from '@aragon/ui'
import Empty from './Empty'

export default () => (
  <EmptyStateCard
      text={
          <div
            css={`
              ${font({
                size: 'xlarge',
                weight: 'normal',
              })}
              font-family: aragon-ui,sans-serif;
              display: grid;
              align-items: center;
              justify-content: center;
              grid-template-columns: auto auto;
              grid-gap: ${1 * GU}px;
              color: #212B36;
            `}
          >
            <LoadingRing />
            <span>Syncing…</span>
          </div>

      }
      illustration={
        <Empty />
      }
    />
)
