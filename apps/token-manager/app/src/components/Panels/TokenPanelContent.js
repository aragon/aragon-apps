import React, { useCallback, useState } from 'react'
import PropTypes from 'prop-types'
import {
  Button,
  Field,
  IconCross,
  Info,
  TextInput,
  GU,
  textStyle,
  useTheme,
  useSidePanelFocusOnReady,
} from '@aragon/ui'
import { isAddress } from '../../web3-utils'
import { fromDecimals, toDecimals, formatBalance } from '../../utils'
import LocalIdentitiesAutoComplete from '../LocalIdentitiesAutoComplete/LocalIdentitiesAutoComplete'

// Any more and the number input field starts to put numbers in scientific notation
const MAX_INPUT_DECIMAL_BASE = 6

function usePanelForm({
  getHolderBalance,
  initialHolder,
  maxAccountTokens,
  mode,
  tokenDecimals,
  tokenDecimalsBase,
}) {
  const [holderField, setHolderField] = useState({
    error: null,
    warning: null,
    value: initialHolder,
  })

  const [amountField, setAmountField] = useState({
    error: null,
    warning: null,
    value: '',
    max: '',
  })

  const errorMessage = holderField.error || amountField.error
  const warningMessage = holderField.warning || amountField.warning

  const submitDisabled = Boolean(
    errorMessage ||
      amountField.max === '0' ||
      !holderField.value ||
      !amountField.value ||
      amountField.value === '0'
  )

  const filterAmount = useCallback(
    () => toDecimals(amountField.value.trim(), tokenDecimals),
    [tokenDecimals, amountField]
  )

  const filterHolder = useCallback(() => holderField.value.trim(), [
    holderField,
  ])

  const updateHolder = useCallback(
    value => {
      const holderBalance = getHolderBalance(value.trim())
      const maxAmount =
        mode === 'assign' ? maxAccountTokens.sub(holderBalance) : holderBalance

      setHolderField({ ...holderField, value, error: null })
      setAmountField({
        ...amountField,
        max: formatBalance(maxAmount, tokenDecimalsBase, tokenDecimals),
        warning:
          maxAmount.isZero() &&
          (mode === 'assign'
            ? `
              The maximum amount of tokens that can be assigned has already
              been reached.
            `
            : `
              This account doesn’t have any tokens to remove.
            `),
      })
    },
    [
      amountField,
      getHolderBalance,
      holderField,
      maxAccountTokens,
      mode,
      tokenDecimals,
      tokenDecimalsBase,
    ]
  )

  const updateAmount = useCallback(
    value => {
      setAmountField({ ...amountField, value })
    },
    [amountField]
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

    return { holder: filterHolder(), amount: filterAmount() }
  }, [mode, holderField, filterHolder, filterAmount])

  return {
    amountField,
    errorMessage,
    holderField,
    submitDisabled,
    updateAmount,
    updateHolder,
    validateFields,
    warningMessage,
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
}) {
  const holderInputRef = useSidePanelFocusOnReady()

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
    <div>
      <form
        css={`
          margin-top: ${3 * GU}px;
        `}
        onSubmit={handleSubmit}
      >
        <InfoMessage
          title="Action"
          text={`This action will ${
            mode === 'assign'
              ? 'create tokens and transfer them to the recipient below'
              : 'remove tokens from the account below'
          }.`}
        />
        <Field
          label={`${
            mode === 'assign' ? 'Recipient' : 'Account'
          } (must be a valid Ethereum address)`}
          css="height: 62px"
        >
          <LocalIdentitiesAutoComplete
            ref={holderInputRef}
            value={holderField.value}
            onChange={updateHolder}
            wide
            required
          />
        </Field>

        <Field label="Number of tokens">
          <TextInput.Number
            value={amountField.value}
            onChange={handleAmountChange}
            min={tokenStep}
            max={amountField.max}
            step={tokenStep}
            required
            wide
          />
        </Field>
        <Button mode="strong" type="submit" disabled={submitDisabled} wide>
          {mode === 'assign' ? 'Add' : 'Remove'} tokens
        </Button>
        <div
          css={`
            margin-top: ${2 * GU}px;
          `}
        >
          {errorMessage && <ErrorMessage message={errorMessage} />}
          {warningMessage && <WarningMessage message={warningMessage} />}
        </div>
      </form>
    </div>
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

function InfoMessage({ title, text }) {
  return (
    <div
      css={`
        margin-bottom: ${3 * GU}px;
      `}
    >
      <Info title={title}>{text}</Info>
    </div>
  )
}

function WarningMessage({ message }) {
  return (
    <div
      css={`
        & + & {
          margin-top: ${2 * GU}px;
        }
      `}
    >
      <Info mode="warning">{message}</Info>
    </div>
  )
}

function ErrorMessage({ message }) {
  const theme = useTheme()
  return (
    <div
      css={`
        display: flex;
        align-items: center;
        & + & {
          margin-top: ${2 * GU}px;
        }
      `}
    >
      <IconCross
        size="tiny"
        css={`
          color: ${theme.negative};
          margin-right: ${1 * GU}px;
        `}
      />
      <span
        css={`
          ${textStyle('body3')}
        `}
      >
        {message}
      </span>
    </div>
  )
}

export default TokenPanelContent
