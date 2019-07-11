import React from 'react'
import styled from 'styled-components'
import { Box, TokenBadge, Text, breakpoint, theme, useTheme } from '@aragon/ui'
import { useNetwork } from '@aragon/api-react'
import { formatBalance, stakesPercentages } from '../utils'
import You from './You'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'

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

const displayedStakes = (accounts, total) => {
  return stakesPercentages(accounts.map(({ balance }) => balance), {
    total,
    maxIncluded: DISTRIBUTION_ITEMS_MAX,
  }).map((stake, index) => ({
    name: stake.index === -1 ? 'Rest' : accounts[index].address,
    stake: stake.percentage,
    color: DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length],
  }))
}

class InfoBoxes extends React.PureComponent {
  static defaultProps = {
    holders: [],
  }
  transferableLabel() {
    const { tokenTransfersEnabled } = this.props
    if (tokenTransfersEnabled === undefined) {
      return 'Unknown'
    }
    return tokenTransfersEnabled ? 'Yes' : 'No'
  }
  render() {
    const {
      holders,
      network,
      tokenAddress,
      tokenDecimalsBase,
      tokenName,
      tokenSupply,
      tokenSymbol,
      userAccount,
      theme,
      ...rest
    } = this.props
    const stakes = displayedStakes(holders, tokenSupply)
    return (
      <React.Fragment>
        <Box heading="Token Info">
          <ul
            css={`
              color: ${theme.surfaceContent};
            `}
          >
            <InfoRow>
              <span>Total Supply</span>
              <span>:</span>
              <strong>{formatBalance(tokenSupply, tokenDecimalsBase)}</strong>
            </InfoRow>
            <InfoRow>
              <span>Transferable</span>
              <span>:</span>
              <strong>{this.transferableLabel()}</strong>
            </InfoRow>
            <InfoRow>
              <span>Token</span>
              <span>:</span>
              <TokenBadge
                address={tokenAddress}
                name={tokenName}
                symbol={tokenSymbol}
                networkType={network.type}
              />
            </InfoRow>
          </ul>
        </Box>
        <Box heading="Ownership Distribution">
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
                  <LocalIdentityBadge
                    entity={name}
                    networkType={network.type}
                    connectedAccount={name === userAccount}
                  />
                  {name === userAccount && <You />}
                </span>
                <strong>{stake}%</strong>
              </StakesListItem>
            ))}
          </ul>
        </Box>
      </React.Fragment>
    )
  }
}

const InfoRow = styled.li`
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  list-style: none;

  > span:nth-child(1) {
    font-weight: 400;
  }
  > span:nth-child(2) {
    opacity: 0;
    width: 10px;
  }
  > span:nth-child(3) {
    flex-shrink: 1;
  }
  > strong {
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

export default props => {
  const network = useNetwork()
  const theme = useTheme()
  return <InfoBoxes theme={theme} network={network} {...props} />
}
