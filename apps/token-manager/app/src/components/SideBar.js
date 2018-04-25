import React from 'react'
import styled from 'styled-components'
import { Text, theme } from '@aragon/ui'
import { sciNot } from '../math-utils'

// Number of digits before "Total Supply" gets wrapped into two lines
const TOTAL_SUPPLY_CUTOFF_LENGTH = 18

const DISTRIBUTION_ITEMS_MAX = 7
const DISTRIBUTION_COLORS = [
  '#000000',
  '#57666F',
  '#028CD1',
  '#21AAE7',
  '#39CAD0',
  '#ADE9EC',
  '#80AEDC',
]

const calculateStakes = (accounts, total) => {
  const maxDisplayed = DISTRIBUTION_ITEMS_MAX - 1
  const byStake = (a, b) => b.stake - a.stake

  const stakes = accounts.map(({ address, balance }) => ({
    name: address,
    stake: Math.floor(balance / total * 100),
  }))

  stakes.push({
    name: 'Organization Reserves',
    stake: Math.floor(
      (total - accounts.reduce((total, { balance }) => total + balance, 0)) /
        total *
        100
    ),
  })

  const displayedStakes = stakes
    .filter(({ stake }) => stake > 0)
    .sort(byStake)
    .slice(0, maxDisplayed)

  const rest =
    100 - displayedStakes.reduce((total, { stake }) => total + stake, 0)

  return displayedStakes.length < accounts.length
    ? [...displayedStakes, { name: 'Rest', stake: rest }].sort(byStake)
    : displayedStakes
}

class SideBar extends React.Component {
  static defaultProps = {
    holders: [],
  }
  render() {
    const { holders, tokenDecimalsBase, tokenSupply } = this.props
    const stakes = calculateStakes(holders, tokenSupply).map((stake, i) => ({
      ...stake,
      color: DISTRIBUTION_COLORS[i] || '#000000',
    }))

    const adjustedTokenSupply = sciNot(
      tokenSupply / tokenDecimalsBase,
      TOTAL_SUPPLY_CUTOFF_LENGTH,
      { rounding: 5 }
    )

    return (
      <Main>
        <Part>
          <h1>
            <Text color={theme.textSecondary} smallcaps>
              Token Info
            </Text>
          </h1>
          <ul>
            <InfoRow>
              <span>Total Supply</span>
              <span>:</span>
              <strong>{adjustedTokenSupply}</strong>
            </InfoRow>
          </ul>
        </Part>
        <Part>
          <h1>
            <Text color={theme.textSecondary} smallcaps>
              Ownership Distribution
            </Text>
          </h1>
          <Text size="large" weight="bold">
            Token Holder Stakes
          </Text>
          <StakesBar>
            {stakes.map(({ name, stake, color }) => (
              <div
                key={name}
                title={`${name}: ${stake}%`}
                style={{
                  width: `${stake}%`,
                  height: '10px',
                  background: color,
                }}
              />
            ))}
          </StakesBar>
          <ul>
            {stakes.map(({ name, stake, color }) => (
              <StakesListItem key={name}>
                <span>
                  <StakesListBullet style={{ background: color }} />
                  <Text title={name} color={theme.textSecondary}>
                    {name}
                  </Text>
                </span>
                <strong>{stake}%</strong>
              </StakesListItem>
            ))}
          </ul>
        </Part>
      </Main>
    )
  }
}

const Main = styled.aside`
  flex-shrink: 0;
  flex-grow: 0;
  width: 260px;
  margin-left: 30px;
  min-height: 100%;
`

const Part = styled.div`
  margin-bottom: 55px;
  h1 {
    margin-bottom: 15px;
    color: ${theme.textSecondary};
    text-transform: lowercase;
    line-height: 30px;
    font-variant: small-caps;
    font-weight: 600;
    font-size: 16px;
    border-bottom: 1px solid ${theme.contentBorder};
  }
`

const InfoRow = styled.li`
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  list-style: none;

  > span:nth-child(1) {
    font-weight: 400;
    color: ${theme.textSecondary};
  }
  > span:nth-child(2) {
    display: none;
  }
  strong {
    text-transform: uppercase;
  }
`

const StakesBar = styled.div`
  display: flex;
  width: 100%;
  overflow: hidden;
  margin: 10px 0 30px;
  border-radius: 3px;
`

const StakesListItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  list-style: none;

  > span:first-child {
    display: flex;
    align-items: center;
    max-width: 80%;
  }
`

const StakesListBullet = styled.span`
  width: 10px;
  height: 10px;
  margin-right: 15px;
  border-radius: 5px;
  flex-shrink: 0;
  & + span {
    flex-shrink: 1;
    text-overflow: ellipsis;
    overflow: hidden;
  }
`

export default SideBar
