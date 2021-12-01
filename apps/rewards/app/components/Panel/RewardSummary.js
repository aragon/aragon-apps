import React from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'
import { Button, Info, Text } from '@aragon/ui'
import { useAppState } from '@aragon/api-react'
import Header from '../Styles/Header'
import BigNumber from 'bignumber.js'

import {
  ONE_TIME_DIVIDEND,
  RECURRING_DIVIDEND,
  ONE_TIME_MERIT,
} from '../../utils/constants'

const RewardSummary = ({ reward, theme, onCancel, onSubmit }) => {
  const {
    description,
    rewardType,
    referenceTokenSymbol,
    amount,
    amountToken,
    dateReference,
    startDate,
    endDate,
    disbursements,
    disbursementBlocks,
  } = reward
  const { amountTokens } = useAppState()
  return (
    <VerticalContainer>
      <VerticalSpace />
      <GreyBox theme={theme}>
        <Title>{description}</Title>
        <SubTitle theme={theme}>{rewardType}</SubTitle>
        <Header>Reference Asset</Header>
        <Content>
          {referenceTokenSymbol}
        </Content>
        <Header>
          {rewardType === ONE_TIME_MERIT && 'Total'}
          {' Amount '}
          {rewardType === RECURRING_DIVIDEND && 'per Cycle'}
        </Header>
        <Content>{BigNumber(amount).div(BigNumber(10).pow(amountTokens.find(t => t.symbol === amountToken).decimals)).toString(10)} {amountToken}</Content>
        <Header>
          {rewardType === ONE_TIME_MERIT ?
            'Start and End Date' : 'Disbursement Date'}
          {rewardType === RECURRING_DIVIDEND && 's'}
        </Header>
        {rewardType === ONE_TIME_DIVIDEND && (
          <Content>{dateReference.toDateString()} (block: {disbursementBlocks[0]})</Content>
        )}
        {rewardType === RECURRING_DIVIDEND &&
         disbursements.map((disbursement, i) => (
           <Content key={i}>
             {disbursement.toDateString()} (block: {disbursementBlocks[i]})
           </Content>
         ))}
        {rewardType === ONE_TIME_MERIT && (
          <Content>
            {(new Date(startDate)).toDateString()}{' - '}{(new Date(endDate)).toDateString()}
          </Content>
        )}
      </GreyBox>
      <VerticalSpace />
      <Info>
        {rewardType === ONE_TIME_MERIT ?  'Earning the reference asset between the start and end date'
          : 'Holding the reference asset at the disbursement date' 
            + (rewardType === 'RECURRING_DIVIDEND' ? 's' : '')
        }
          
        {' will issue a proportionally split reward across all token holders.'}
      </Info>
      { onCancel && onSubmit && (
        <HorizontalContainer>
          <VerticalSpace />
          <Button
            label="Go back"
            mode="normal"
            css={{ fontWeight: 700, marginRight: '4px' }}
            onClick={onCancel}
            wide
          />
          <Button
            label="Submit"
            mode="strong"
            css={{ fontWeight: 700, marginLeft: '4px' }}
            wide
            onClick={onSubmit}
          />
        </HorizontalContainer>
      )}
    </VerticalContainer>
  )
}

RewardSummary.propTypes = {
  reward: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
  onCancel: PropTypes.func,
  onSubmit: PropTypes.func,
}

const VerticalContainer = styled.div`
  display: flex;
  flex-direction: column;
`
const HorizontalContainer = styled.div`
  display: flex;
  justify-content: space-between;
`
const VerticalSpace = styled.div`
  height: 24px;
`
const GreyBox = styled.div`
  background-color: ${({ theme }) => theme.background};
  border: 1px solid ${({ theme }) => theme.border};
  padding: 24px;
  display: flex;
  flex-direction: column;
  border-radius: 4px;
`
const Title = styled(Text).attrs({
  size: 'xlarge',
})``
const SubTitle = styled(Text).attrs({
  size: 'xsmall',
})`
  color: ${({ theme }) => theme.contentSecondary};
  margin-bottom: 8px;
`
const Content = styled(Text).attrs({})``

export default RewardSummary
