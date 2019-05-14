import React from 'react'
import PropTypes from 'prop-types'
import BN from 'bn.js'
import Section from '../components/Layout/Section'
import EmployeeList from './components/EmployeeList'
import KeyStats from './components/KeyStats'
import TotalPayroll from './components/TotalPayroll'

const TeamPayroll = ({ vaultCashReserves }) => (
  <Section>
    <Section.Left>
      <TotalPayroll />
      <EmployeeList />
    </Section.Left>
    <Section.Right>
      <KeyStats vaultCashReserves={vaultCashReserves} />
    </Section.Right>
  </Section>
)

TeamPayroll.propTypes = {
  vaultCashReserves: PropTypes.instanceOf(BN),
}

export default TeamPayroll
