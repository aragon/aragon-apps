import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Button, EmptyStateCard, GU, Info, Link, LoadingRing } from '@aragon/ui'
import emptyStatePng from '../../assets/no-contacts.png'

const illustration = <img src={emptyStatePng} alt="" height="160" />

// We need a third item on the page so flex box placement puts the card in the
// center and the info box at the top
const Spacer = () => <span>&nbsp;</span>

const BetterLink = styled(Link)`
  display: inline;
  white-space: initial;
`

const Empty = ({ action, isSyncing }) => (
  <EmptyWrapper>
    <Info style={{ margin: 3 * GU }} mode="warning">
      Note: The Address Book application is designed to act as a new Identity
      Provider for Aragon Organizations, so you can assign a name to an
      Ethereum address and have that name be displayed in all of your Aragon
      apps in place of the address. This requires <BetterLink
        href="https://github.com/aragon/aragon.js/pull/391">an enhancement to
      aragonSDK</BetterLink>, which is scheduled for an upcoming release. We will
      remove this note once it’s fully available, but until then you can begin
      naming and categorizing addresses.
    </Info>
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
          'No entities here!'
        )}
      illustration={illustration}
      actionText="New Entity"
      action={
        <Button onClick={action}>New entity</Button>
      }
    />
    <Spacer />
  </EmptyWrapper>
)

Empty.propTypes = {
  action: PropTypes.func.isRequired,
  isSyncing: PropTypes.bool.isRequired,
}

const EmptyWrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  height: calc(100vh - ${14 * GU}px);
  justify-content: space-between;
`

export default Empty
