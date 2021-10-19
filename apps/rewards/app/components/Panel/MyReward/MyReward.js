import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'
import { provideNetwork } from '../../../../../../shared/ui'
import { blocksToMilliseconds } from '../../../../../../shared/ui/utils'

import {
  Button,
  Field,
  IconCheck,
  IconFundraising,
  IconTime,
  Info,
  SafeLink,
  SidePanelSplit,
  Text,
} from '@aragon/ui'

import { displayCurrency } from '../../../utils/helpers'

class MyReward extends React.Component {
  static propTypes = {
    onClaimReward: PropTypes.func.isRequired,
    onClosePanel: PropTypes.func.isRequired,
    viewReward: PropTypes.func.isRequired,
    reward: PropTypes.object.isRequired,
  }

  onClosePanel = () => this.props.onClosePanel()

  onClaimReward = () => this.props.onClaimReward(this.props.reward)

  onViewOrigin = e => {
    this.props.viewReward(this.props.reward)
    e.preventDefault()
  }

  formatDate = date => Intl.DateTimeFormat().format(date)

  render() {
    const {
      rewardId,
      isMerit,
      referenceTokenSymbol,
      startDate,
      endDate,
      delay,
      claimed,
      userRewardAmount
    } = this.props.reward

    return (
      <div>
        <SidePanelSplit>
          <Field label={'Origin'} >
            <SafeLink
              href="#"
              onClick={this.onViewOrigin}
              style={{ textDecoration: 'none', color: '#21AAE7' }}
            >
            Reward #{rewardId}
            </SafeLink>
          </Field>
          <Field label={'Status'} >
            {claimed ? (
              <div>
                <IconCheck /> Claimed
              </div>
            ) : (
              <div style={{ color: '#D2C558' }}>
                <IconTime foreground="#D2C558" /> Unclaimed
              </div>
            )}
          </Field>
        </SidePanelSplit>
        <Part>
          <Text size='large' weight='bold' >Reward Summary</Text>
        </Part>
        <Info style={{ marginBottom: '10px' }}>
          <TokenIcon />
          <Summary>
            {isMerit === true ? (
              <p>
                You have been granted a one-time <SummaryBold>{displayCurrency(userRewardAmount)} {referenceTokenSymbol}</SummaryBold> reward, based on the <SummaryBold>{referenceTokenSymbol}</SummaryBold> you earned from <SummaryBold>{this.formatDate(startDate)}</SummaryBold> to <SummaryBold>{this.formatDate(endDate)}</SummaryBold>.
              </p>
            ) : (
              <p>
              A dividend, currently worth <SummaryBold>{displayCurrency(userRewardAmount)} {referenceTokenSymbol}</SummaryBold>, will be distributed to you based on your holdings of <SummaryBold>{referenceTokenSymbol}</SummaryBold> on <SummaryBold>{this.formatDate(endDate)}</SummaryBold>.
              You will be able to claim it after <SummaryBold>{this.formatDate(endDate + blocksToMilliseconds(0,delay))}</SummaryBold>.
              </p>
            )}
            <p>
              {'For more details, refer to the origin, '}
              <SafeLink
                href="#"
                onClick={this.onViewOrigin}
                style={{ textDecoration: 'none', color: '#21AAE7' }}
              >
                Reward #{rewardId}
              </SafeLink>
            </p>
          </Summary>
        </Info>

        {claimed ? (
          <Button mode="strong" wide onClick={this.onClosePanel}>Close</Button>
        ) : (
          Date.now() > endDate ?
            <Button mode="strong" wide onClick={this.onClaimReward}>Claim Reward</Button>
            : null
        )}
      </div>
    )
  }
}

const Part = styled.div`
  padding: 20px 0;
  h2 {
    margin-top: 20px;
    &:first-child {
      margin-top: 0;
    }
  }
`

const Summary = styled.div`
  padding-bottom: 2px;
  padding-left: 35px;
  > :not(:last-child) {
    margin-bottom: 10px;
  }
`
const SummaryBold = styled.span`
  font-weight: bold;
  text-decoration: underline;
`
const TokenIcon = styled(IconFundraising)`
  float: left;
`
export default provideNetwork(MyReward)
