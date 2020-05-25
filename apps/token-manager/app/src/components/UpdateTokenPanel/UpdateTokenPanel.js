import React, { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import BN from 'bn.js'
import {
  Button,
  Field,
  GU,
  Info,
  SidePanel,
  useSidePanelFocusOnReady,
} from '@aragon/ui'
import { isAddress } from '../../web3-utils'
import {
  fromDecimals,
  toDecimals,
  formatBalance,
  splitDecimalNumber,
} from '../../utils'
import LocalIdentitiesAutoComplete from '../LocalIdentitiesAutoComplete/LocalIdentitiesAutoComplete'
import AmountInput from '../AmountInput'

// Any more and the number input field starts to put numbers in scientific notation
const MAX_INPUT_DECIMAL_BASE = 6

function UpdateTokenPanel({
  getHolderBalance,
  holderAddress,
  maxAccountTokens,
  mode,
  onClose,
  onTransitionEnd,
  onUpdateTokens,
  opened,
  tokenDecimals,
  tokenDecimalsBase,
  tokenSymbol,
}) {
  return (
    <SidePanel
      title={mode === 'assign' ? 'Add tokens' : 'Remove tokens'}
      opened={opened}
      onClose={onClose}
      onTransitionEnd={onTransitionEnd}
    >
      <TokenPanelContent
        getHolderBalance={getHolderBalance}
        holderAddress={holderAddress}
        maxAccountTokens={maxAccountTokens}
        mode={mode}
        onUpdateTokens={onUpdateTokens}
        opened={opened}
        tokenDecimals={tokenDecimals}
        tokenDecimalsBase={tokenDecimalsBase}
        tokenSymbol={tokenSymbol}
      />
    </SidePanel>
  )
}

function usePanelForm({
  getHolderBalance,
  initialHolder,
  maxAccountTokens,
  mode,
  tokenDecimals,
  tokenDecimalsBase,
  tokenSymbol,
}) {
  const [holderField, setHolderField] = useState({
    error: null,
    value: initialHolder,
    warning: null,
  })

  const [amountField, setAmountField] = useState({
    error: null,
    max: '',
    value: '',
    warning: null,
  })

  const holderBalance =
    holderField.value && !holderField.error
      ? getHolderBalance(holderField.value)
      : new BN('0')

  const errorMessage = holderField.error || amountField.error
  const warningMessage = holderField.warning || amountField.warning

  const submitDisabled = Boolean(
    errorMessage ||
      warningMessage ||
      !holderField.value ||
      !amountField.value ||
      amountField.max === '0' ||
      amountField.value === '0'
  )

  const getMaxAmountFromBalance = useCallback(
    balance => (mode === 'assign' ? maxAccountTokens.sub(balance) : balance),
    [mode, maxAccountTokens]
  )

  const updateHolder = useCallback(
    value => {
      const maxAmount = getMaxAmountFromBalance(getHolderBalance(value.trim()))

      const maxAmountLabel = formatBalance(
        maxAmount,
        tokenDecimalsBase,
        tokenDecimals
      )

      setHolderField(holderField => ({
        ...holderField,
        error: null,
        value,
        warning:
          maxAmount.isZero() &&
          (mode === 'assign'
            ? `The maximum amount of tokens that can be assigned
               (${maxAmountLabel} ${tokenSymbol}) has already been reached.`
            : 'This account doesn’t have any tokens to remove.'),
      }))

      setAmountField(amountField => ({
        ...amountField,
        max: formatBalance(maxAmount, tokenDecimalsBase, tokenDecimals),
      }))
    },
    [
      getHolderBalance,
      getMaxAmountFromBalance,
      mode,
      tokenDecimals,
      tokenDecimalsBase,
      tokenSymbol,
    ]
  )

  const updateAmount = useCallback(
    value => {
      const formattedAmount = toDecimals(value.trim(), tokenDecimals)
      if (formattedAmount === '0') {
        // Given value is smaller than the accepted decimal base (e.g. gave 0.5 to a token base of 1)
        setAmountField(amountField => ({
          ...amountField,
          value,
          warning: `You are trying to ${
            mode === 'assign' ? 'assign' : 'remove'
          } an amount that is smaller than the minimum amount of tokens possible.`,
        }))
        return
      }

      const decimals = splitDecimalNumber(value.trim())[1]
      if (decimals.length > tokenDecimals) {
        // Given value has more precision than we expected
        setAmountField(amountField => ({
          ...amountField,
          value,
          warning: `You are trying to ${
            mode === 'assign' ? 'assign' : 'remove'
          } an amount that includes more decimals than the token allows.`,
        }))
        return
      }

      const amount = new BN(formattedAmount)
      const maxAmount = getMaxAmountFromBalance(holderBalance)

      setAmountField(amountField => ({
        ...amountField,
        value,
        warning: amount.gt(maxAmount)
          ? `You are trying to ${
              mode === 'assign' ? 'assign' : 'remove'
            } an amount that is greater than the
             maximum amount of tokens that can be ${
               mode === 'assign' ? 'assigned' : 'removed'
             } (${formatBalance(
              maxAmount,
              tokenDecimalsBase,
              tokenDecimals
            )} ${tokenSymbol}).`
          : null,
      }))
    },
    [
      mode,
      holderBalance,
      tokenDecimals,
      tokenDecimalsBase,
      tokenSymbol,
      getMaxAmountFromBalance,
    ]
  )

  const validateFields = useCallback(() => {
    const holderAddress = holderField.value.trim()
    const holderError = isAddress(holderAddress)
      ? null
      : mode === 'assign'
      ? 'The recipient must be a valid Ethereum address.'
      : 'The account must be a valid Ethereum address.'

    if (holderError) {
      setHolderField({ ...holderField, error: holderError })
      return null
    }

    return {
      holder: holderField.value.trim(),
      amount: toDecimals(amountField.value.trim(), tokenDecimals),
    }
  }, [mode, holderField, amountField, tokenDecimals])

  useEffect(() => {
    updateHolder(initialHolder)
  }, [initialHolder, updateHolder])

  return {
    amountField,
    errorMessage,
    holderField,
    submitDisabled,
    updateAmount,
    updateHolder,
    validateFields,
    warningMessage,
    holderBalance,
  }
}

function TokenPanelContent({
  getHolderBalance,
  holderAddress,
  maxAccountTokens,
  mode,
  onUpdateTokens,
  tokenDecimals,
  tokenDecimalsBase,
  tokenSymbol,
}) {
  const holderInputRef = useSidePanelFocusOnReady()
  const amountInputRef = useSidePanelFocusOnReady()

  const {
    amountField,
    errorMessage,
    holderField,
    submitDisabled,
    updateAmount,
    updateHolder,
    validateFields,
    warningMessage,
  } = usePanelForm({
    getHolderBalance,
    initialHolder: holderAddress,
    maxAccountTokens,
    mode,
    onUpdateTokens,
    tokenDecimals,
    tokenDecimalsBase,
    tokenSymbol,
  })

  const tokenStep = fromDecimals(
    '1',
    Math.min(MAX_INPUT_DECIMAL_BASE, tokenDecimals)
  )

  const handleAmountChange = useCallback(
    event => updateAmount(event.target.value),
    [updateAmount]
  )

  const handleSubmit = useCallback(
    event => {
      event.preventDefault()

      const fieldsData = validateFields()

      if (!fieldsData) {
        return
      }

      onUpdateTokens({
        amount: fieldsData.amount,
        holder: fieldsData.holder,
        mode,
      })
    },
    [mode, validateFields, onUpdateTokens]
  )

  return (
    <form
      css={`
        margin-top: ${3 * GU}px;
      `}
      onSubmit={handleSubmit}
    >
      <Info
        title="Action"
        css={`
          margin-bottom: ${3 * GU}px;
        `}
      >
        {mode === 'assign'
          ? 'This action will create tokens and transfer them to the recipient below.'
          : 'This action will remove tokens from the account below.'}
      </Info>
      <Field
        label={
          mode === 'assign'
            ? 'Recipient (must be a valid Ethereum address)'
            : 'Account (must be a valid Ethereum address)'
        }
      >
        <LocalIdentitiesAutoComplete
          ref={holderAddress ? undefined : holderInputRef}
          value={holderField.value}
          onChange={updateHolder}
          wide
          required
        />
      </Field>

      <Field
        label={
          mode === 'assign'
            ? 'Number of tokens to add'
            : 'Number of tokens to remove'
        }
      >
        <AmountInput
          ref={holderAddress ? amountInputRef : undefined}
          max={amountField.max}
          min={tokenStep}
          onChange={handleAmountChange}
          onMaxClick={() => updateAmount(amountField.max)}
          step={tokenStep}
          value={amountField.value}
          required
          showMax
          wide
        />
      </Field>

      <Button mode="strong" type="submit" disabled={submitDisabled} wide>
        {mode === 'assign' ? 'Add tokens' : 'Remove tokens'}
      </Button>

      <div
        css={`
          margin-top: ${2 * GU}px;
        `}
      >
        {errorMessage && <Message mode="error">{errorMessage}</Message>}
        {warningMessage && <Message mode="warning">{warningMessage}</Message>}
      </div>
    </form>
  )
}

TokenPanelContent.propTypes = {
  onUpdateTokens: PropTypes.func,
  mode: PropTypes.string,
  holderAddress: PropTypes.string,
}

TokenPanelContent.defaultProps = {
  onUpdateTokens: () => {},
  holderAddress: '',
}

function Message({ children, mode, title }) {
  return (
    <div
      css={`
        & + & {
          margin-top: ${2 * GU}px;
        }
      `}
    >
      <Info mode={mode} title={title}>
        {children}
      </Info>
    </div>
  )
}

export default UpdateTokenPanel
