import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Button, EmptyStateCard, GU, LoadingRing, unselectable } from '@aragon/ui'
import icon from '../../assets/empty-rewards.svg'

const Icon = () => <img src={icon} height={20 * GU} />

const Empty = ({ action, isSyncing, noButton=false }) => (

  <EmptyWrapper>
    <EmptyStateCard
      text={
        isSyncing ? (
          <div
            css={`
              display: grid;
              align-items: center;
              justify-content: center;
              grid-template-columns: auto auto;
              grid-gap: ${1 * GU}px;
            `}
          >
            <LoadingRing />
            <span>Syncing…</span>
          </div>
        ) : (
          'No rewards here!'
        )}
      illustration={<Icon />}
      action={noButton ? '' : <Button label="New reward" onClick={action} />}
    />
  </EmptyWrapper>
)

Empty.propTypes = {
  action: PropTypes.func,
  isSyncing: PropTypes.bool.isRequired,
}

const EmptyWrapper = styled.div`
  ${unselectable};
  height: 70vh;
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`

export default Empty
