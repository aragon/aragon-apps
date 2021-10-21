import PropTypes from 'prop-types'
import React from 'react'
import { useAragonApi } from '../../api-react'
import {
  DropDown,
  Field,
  GU,
  Help,
  IconClose,
  Text,
  TextInput,
  font,
  theme
} from '@aragon/ui'
import web3Utils from 'web3-utils'
import styled from 'styled-components'
import { BigNumber } from 'bignumber.js'

import { addressesEqual } from '../../../../../shared/lib/web3-utils'
import { RecipientsInput } from '../../../../../shared/ui'
import { MIN_AMOUNT } from '../../utils/constants'
import { usePanel } from '../../context/Panel'
import { formatDate, isStringEmpty } from '../../utils/helpers'
import { displayCurrency } from '../../../../../shared/ui/helpers'
import { DescriptionInput, Form } from '../Form'
import CurrencyBox from '../Form/Field/CurrencyBox'

const INITIAL_STATE = {
  budgetValue: {},
  budgetEmpty: true,
  descriptionValue: '',
  descriptionEmpty: true,
  amountValue: '',
  amountInvalid: true,
  amountOverBudget: false,
  amountOverFunds: false,
  recipients: {},
  recipientsValid: {},
  recipientsDuplicate: false,
  tokenValue: {},
}

const errorMessages = {
  amountOverBudget: 'Amount must be smaller than available budget',
  amountOverFunds: 'Amount must be smaller than funds available in Vault',
  recipientsDuplicate: 'Recipients must be unique',
}

const isRecipientValid = (current) => {
  return web3Utils.isAddress(current)
}

const recipientsDuplicate = (recipients) => {
  const values = Object.values(recipients)
  const set = new Set(values)
  return set.size !== values.length
}

function BudgetDropDown({ onChange, value }) {
  const budgets = useAragonApi().appState.budgets.filter(b => b.active)
  return (
    <Field label="Budget" required>
      <DropDown
        name="budget"
        items={budgets.map(b => b.name)}
        selected={budgets.indexOf(value)}
        onChange={i => onChange({ target: {
          name: 'budget',
          value: budgets[i],
        } })}
        wide
      />
    </Field>
  )
}

BudgetDropDown.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.object.isRequired,
}

const DescriptionField = ({ onChange, value }) => (
  <Field label="Description" required>
    <DescriptionInput
      name="description"
      onChange={onChange}
      value={value}
    />
  </Field>
)

DescriptionField.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
}

function AmountField({ budget, onChange, value, token }) {
  const { balances, period } = useAragonApi().appState
  const periodEndDate = formatDate({ date: period.endDate, short: true })

  const remainingBudget = BigNumber(budget.remaining)
  const inVault =
    balances.find(b => addressesEqual(b.address, token.address)).amount
  const vaultLow = inVault.lt(remainingBudget)

  return (
    <Field label="Amount" required>
      <div css={`
        display: flex;
        flex-direction: column-reverse;
        align-items: flex-end;
        color: ${theme.textSecondary};
        ${font({ size: 'small' })}
      `}>
        <div css={`
          display: flex;
          line-height: 18px;
          vertical-align: middle;
        `}>
          <Text css='margin-right: 6px'>
            Available funds:{' '}
            {displayCurrency(vaultLow ? inVault : remainingBudget)}{' '}
            {token.symbol}
          </Text>
          <Help hint="Available funds">
            There’s {displayCurrency(remainingBudget)} {token.symbol}
            {' '}left in this budget until {periodEndDate}{vaultLow ? `, but
            only ${displayCurrency(inVault)} ${token.symbol} left in the
            organization’s vault` : '' }.
          </Help>
        </div>
        <InputGroup css={`margin-bottom: ${GU}px; width: 100%`}>
          <TextInput
            name="amount"
            type="number"
            min={MIN_AMOUNT}
            step="any"
            value={value}
            onChange={onChange}
            wide
            css={{ borderRadius: '4px 0px 0px 4px' }}
          />
          <CurrencyBox>{token.symbol}</CurrencyBox>
        </InputGroup>
      </div>
    </Field>
  )
}

AmountField.propTypes = {
  budget: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  token: PropTypes.shape({
    address: PropTypes.string.isRequired,
    symbol: PropTypes.string.isRequired,
  }).isRequired,
  value: PropTypes.string.isRequired,
}

const UserRecipientsField = ({ onChange, valid, value }) => (
  <Field label="Recipients" required>
    <RecipientsInput
      recipients={value}
      recipientsValid={valid}
      onChange={onChange}
    />
  </Field>
)

UserRecipientsField.propTypes = {
  onChange: PropTypes.func.isRequired,
  valid: PropTypes.object.isRequired,
  value: PropTypes.object.isRequired,
}

class NewAllocation extends React.Component {
  static propTypes = {
    budgetId: PropTypes.string,
    onSubmitAllocation: PropTypes.func.isRequired,
    budgets: PropTypes.arrayOf(PropTypes.object).isRequired,
    balances: PropTypes.arrayOf(PropTypes.object).isRequired,
  }

  constructor(props) {
    super(props)
    const { budgets, budgetId } = props
    this.state = { ...INITIAL_STATE }
    this.state.recipients = {}
    this.state.recipientsValid = {}
    const recipientId = Date.now()
    this.state.recipients[recipientId] = ''
    this.state.recipientsValid[recipientId] = false
    if (budgetId) {
      const budgetValue = budgets.find(b => b.id === budgetId)
      this.state.budgetValue = budgetValue
      this.state.budgetEmpty = false
      this.state.tokenValue = props.balances.find(
        b => b.symbol === budgetValue.token.symbol
      )
    }
  }

  changeField = e => {
    const { name, value } = e.target
    const { balances } = this.props
    const { recipients, recipientsValid, budgetValue, tokenValue } = this.state
    if (name === 'budget') {
      this.setState({
        budgetValue: value,
        budgetEmpty: false,
        tokenValue: balances.find(b => b.symbol === value.token.symbol)
      })
    }

    else if (name === 'description') {
      this.setState({
        descriptionValue: value,
        descriptionEmpty: isStringEmpty(value),
      })
    }

    else if (name === 'amount') {
      this.setState({
        amountValue: value,
        amountInvalid: isStringEmpty(value)
          || BigNumber(value).lt(MIN_AMOUNT),
        amountOverBudget: BigNumber(value + 'e18').gt(budgetValue.remaining),
        amountOverFunds: BigNumber(value + 'e18').gt(tokenValue.amount),
      })
    }

    else if (name === 'recipientsChange') {
      recipients[e.target.id] = value
      recipientsValid[e.target.id] = isRecipientValid(value)
      this.setState({
        recipients,
        recipientsValid,
        recipientsDuplicate: recipientsDuplicate(recipients),
      })
    }

    else if (name === 'recipientsAdd') {
      const id = Date.now()
      this.setState({
        recipients: { [id]: '', ...recipients },
        recipientsValid: { [id]: false, ...recipientsValid },
        recipientsDuplicate: recipientsDuplicate(recipients),
      })
    }

    else if (name === 'recipientsRemove') {
      delete recipients[e.target.id]
      delete recipientsValid[e.target.id]
      this.setState({
        recipients,
        recipientsValid,
        recipientsDuplicate: recipientsDuplicate(recipients),
      })
    }
  }

  submitAllocation = () => {
    const {
      budgetValue,
      descriptionValue,
      amountValue,
      recipients,
      tokenValue
    } = this.state
    const allocation = {
      budgetId: budgetValue.id,
      budgetName: budgetValue,
      balance: BigNumber(amountValue).times(BigNumber(10).pow(tokenValue.decimals)).toString(10),
      description: descriptionValue,
      addresses: Object.values(recipients),
    }
    this.props.onSubmitAllocation(allocation)
  }

  render() {
    const {
      budgetValue,
      descriptionValue,
      amountValue,
      recipients,
      recipientsValid,
      budgetEmpty,
      descriptionEmpty,
      amountInvalid,
      amountOverBudget,
      amountOverFunds,
      recipientsDuplicate,
      tokenValue,
    } = this.state

    const errorBlocks = Object.keys(errorMessages).map((e, i) => (
      <div key={i}>
        <ErrorMessage hasError={this.state[e]} type={e} />
      </div>
    ))

    const areRecipientsInvalid = () => {
      return Object.values(this.state.recipientsValid).includes(false)
    }

    return (
      <div>
        <Form
          onSubmit={this.submitAllocation}
          submitText="Submit"
          disabled={ budgetEmpty || descriptionEmpty || amountInvalid
                     || amountOverBudget || amountOverFunds
                     || areRecipientsInvalid() || recipientsDuplicate }
          errors={errorBlocks}
        >
          <BudgetDropDown onChange={this.changeField} value={budgetValue} />
          {budgetValue.id && (
            <>
              <DescriptionField
                onChange={this.changeField}
                value={descriptionValue}
              />
              <AmountField
                budget={budgetValue}
                onChange={this.changeField}
                token={tokenValue}
                value={amountValue}
              />
              <UserRecipientsField
                onChange={this.changeField}
                value={recipients}
                valid={recipientsValid}
              />
            </>
          )}
        </Form>
      </div>
    )
  }
}

const NewAllocationWrap = props => {
  const { api, appState } = useAragonApi()
  const { balances } = appState
  const budgets = appState.budgets.filter(b => b.active)
  const { setPanel } = usePanel()

  const onSubmitAllocation = ({
    addresses,
    description,
    budgetId,
    period = 0,
    balance,
  }) => {
    const emptyIntArray = new Array(addresses.length).fill(0)
    api.setDistribution(
      addresses,
      emptyIntArray, // unused
      emptyIntArray, // unused
      '', // unused
      description,
      emptyIntArray, // unused
      emptyIntArray, // unused
      budgetId, // account or allocation id...budgetId
      '1', // recurrences, 1 for now
      Math.floor(new Date().getTime()/1000), // startTime, now for now
      period,
      balance, // amount
    ).toPromise()
    setPanel(null)
  }

  return (
    <NewAllocation
      balances={balances}
      budgets={budgets}
      onSubmitAllocation={onSubmitAllocation}
      {...props}
    />
  )
}

const ErrorMessage = ({ hasError, type }) => {
  return hasError ? (
    <ErrorText>
      <IconClose
        size="tiny"
        css={{
          marginRight: '8px',
          color: theme.negative,
        }}
      />
      {errorMessages[type]}
    </ErrorText>
  ) : null
}

ErrorMessage.propTypes = {
  hasError: PropTypes.bool,
  type: PropTypes.string,
}

const InputGroup = styled.div`
  display: flex;
`

const ErrorText = styled.div`
  font-size: small;
  display: flex;
  align-items: center;
`

// eslint-disable-next-line import/no-unused-modules
export default NewAllocationWrap
