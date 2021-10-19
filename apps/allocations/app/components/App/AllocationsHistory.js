import React from 'react'
import { useAppState, useNetwork } from '@aragon/api-react'
import {
  DataView,
  IconCheck,
  IconCross,
  ProgressBar,
  Text,
  useLayout,
  useTheme,
} from '@aragon/ui'
import LocalIdentityBadge from '../LocalIdentityBadge/LocalIdentityBadge'
import { BigNumber } from 'bignumber.js'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import { STATUSES } from '../../utils/constants'
import { displayCurrency } from '../../../../../shared/ui/helpers'
import { addressesEqual } from '../../../../../shared/lib/web3-utils'

const AllocationsHistory = ({ allocations, skipBudgetColumn }) => {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const { balances = [], budgets = [] } = useAppState()
  const network = useNetwork()
  const getTokenSymbol = inputAddress => {
    const matchingBalance = balances.find(({ address }) => addressesEqual(inputAddress, address))
    return matchingBalance ? matchingBalance.symbol : ''
  }
  const getBudgetName = inputId => {
    const matchingName = budgets.find(({ id }) => inputId === id)
    return matchingName ? matchingName.name : `# ${inputId}`
  }
  const fields = [
    'Date',
    { label: 'Recipients', childStart: true },
    'Description',
    'Status',
    'Amount'
  ]
  if (!skipBudgetColumn) {
    fields.splice(1, 0, 'Budget')
  }
  return (
    <DataView
      mode="adaptive"
      tableRowHeight={92}
      heading={
        <Text size="xlarge">Allocations history</Text>
      }
      fields={fields}
      entries={allocations}
      renderEntry={({
        date,
        accountId,
        recipients,
        description,
        status,
        amount,
        token,
        tokenDecimal
      }, index) => {
        const entry = [
          new Date(Number(date)).toLocaleDateString(),
          recipients.length === 1 ? '1 entity'
            : recipients.length + ' entities',
          description,
          <Status key={index} code={status} />,
          <Amount key={index} theme={theme} >
            { displayCurrency(-amount, tokenDecimal) } { getTokenSymbol(token) }
          </Amount>
        ]
        if (!skipBudgetColumn) {
          entry.splice(1, 0, (
            <div key={index}>
              {getBudgetName(accountId)}
            </div>
          ))
        }
        return entry
      }}
      renderEntryExpansion={({ recipients, amount, token, tokenDecimal }) => {
        const totalSupports = recipients.reduce((total, recipient) => {
          return total + Number(recipient.supports)
        }, 0)
        return recipients.map(recipient => {
          const allocated = BigNumber(recipient.supports).div(totalSupports)
          return (
            <RecipientContainer
              key={recipient.candidateAddress}
              layoutName={layoutName}
            >
              <LocalIdentityBadge
                entity={recipient.candidateAddress}
                networkType={network && network.type}
              />
              <RecipientProgress theme={theme}>
                <ProgressBar
                  value={allocated.toNumber()}
                  color={String(theme.accentEnd)}
                />
              </RecipientProgress>
              <RecipientAmount theme={theme}>
                { displayCurrency(BigNumber(amount).times(allocated), tokenDecimal) } {' '}
                {getTokenSymbol(token)} {' • '}
                { allocated.times(100).dp(0).toNumber() }{'%'}
              </RecipientAmount>
            </RecipientContainer>
          )
        })
      }}
    />
  )
}

AllocationsHistory.propTypes = {
  allocations: PropTypes.arrayOf(PropTypes.object).isRequired,
  skipBudgetColumn: PropTypes.bool,
}

const Status = ({ code }) => {
  const theme = useTheme()
  return (
    <StatusContent theme={theme} code={code}>
      { code === 1 && <IconCross size="medium" color={theme.negative} /> }
      { code > 1 && <IconCheck size="medium" color={theme.positive} /> }
      <StatusText>
        {STATUSES[code]}
      </StatusText>
    </StatusContent>
  )
}

Status.propTypes = {
  code: PropTypes.number.isRequired,
}

const Amount = styled.div`
  font-weight: 600;
`

const RecipientContainer = styled.div`
  width: ${({ layoutName }) => layoutName === 'large' ? 50 : 100}%;
`

const RecipientProgress = styled.div`
   margin-top: 8px;
   margin-bottom: 4px;
   width: 100%;

   div {
     background: ${({ theme }) => theme.overlay};
   }
 `

const RecipientAmount = styled.div`
   color: ${({ theme }) => theme.contentSecondary};
   font-size: 12px;
   text-align: right;
 `

const StatusContent = styled.div`
  color: ${({ code, theme }) => code === 0 ?
    theme.contentSecondary : theme.content};
  display: flex;
  align-items: center;
`

const StatusText = styled.div`
  padding-top: 4px;
`

export default AllocationsHistory
