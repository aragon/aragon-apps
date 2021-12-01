import React, { useEffect, useState, useRef } from 'react'
import { Field, TextInput, Button } from '@aragon/ui'

import { isAddress, addressesEqual } from '../../lib/web3-utils'
import { ErrorMessage, InfoMessage } from '../Message'

const NO_ERROR = Symbol('NO_ERROR')
const TOKEN_ADDRESS_NOT_VALID = Symbol('TOKEN_ADDRESS_NOT_VALID')
const TOKEN_ADDRESS_ALREADY_ADDED = Symbol('TOKEN_ADDRESS_ALREADY_ADDED')
const initialState = { value: '', error: NO_ERROR }

const AddToken = React.memo(({ tokens, onAddToken, panelVisible, panelOpened }) => {
  const [address, setAddress, setError] = useAddress(panelVisible)

  const inputRef = useRef(null)
  // Panel opens =>  Focus input
  useEffect(() => {
    if (panelOpened) {
      inputRef.current.focus()
    }
  }, [panelOpened])

  const handleFormSubmit = event => {
    event.preventDefault()

    const error = validate(address.value, tokens)
    if (error) {
      setError(error)
      return
    }

    onAddToken(address.value)
  }

  let errorMessage
  if (address.error === TOKEN_ADDRESS_NOT_VALID)
    errorMessage = 'Token address is not a valid Ethereum address'
  else if (address.error === TOKEN_ADDRESS_ALREADY_ADDED)
    errorMessage = 'Token already added to redemption list'
  return (
    <div>
      <form onSubmit={handleFormSubmit}>
        <InfoMessage
          title="Redemption action"
          text={'This action will add a token to the redeemable tokens'}
        />
        <Field label="Token address">
          <TextInput
            name="address"
            wide
            onChange={setAddress}
            value={address.value}
            ref={inputRef}
            required
          />
        </Field>
        <Button mode="strong" wide type="submit">
          Add token
        </Button>
        {errorMessage && <ErrorMessage text={errorMessage} />}
      </form>
    </div>
  )
})

const useAddress = panelVisible => {
  const [address, setAddress] = useState(initialState)

  const handleAddressChange = event => {
    const { value } = event.target
    setAddress(address => ({ ...address, value }))
  }

  const handleAddressError = error => {
    setAddress(address => ({ ...address, error }))
  }

  // Panel closes => Reset address and error state
  useEffect(() => {
    if (!panelVisible) {
      setAddress(initialState)
    }
  }, [panelVisible])

  return [address, handleAddressChange, handleAddressError]
}

const validate = (address, tokens) => {
  if (!isAddress(address)) return TOKEN_ADDRESS_NOT_VALID

  const exists = tokens.some(t => addressesEqual(t.address, address))
  if (exists) return TOKEN_ADDRESS_ALREADY_ADDED

  return null
}

export default AddToken
