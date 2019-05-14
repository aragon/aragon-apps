import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import BN from 'bn.js'
import Section from '../../components/Layout/Section'
import PaidSalaries from './PaidSalaries'
import YearlySalarySummary from './YearlySalarySummary'

const KeyStats = React.memo(({ vaultCashReserves }) => {
  return (
    <Container>
      <Section.SideBarTitle>Key Stats</Section.SideBarTitle>
      <PaidSalaries />
      <YearlySalarySummary vaultCashReserves={vaultCashReserves} />
    </Container>
  )
})

KeyStats.propTypes = {
  vaultCashReserves: PropTypes.instanceOf(BN),
}

const Container = styled.section`
  display: flex;
  flex-direction: column;
`

export default KeyStats
