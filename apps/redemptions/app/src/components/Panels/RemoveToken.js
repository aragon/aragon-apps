import React, { useMemo, useState } from 'react'
import { Button, DropDown, Field } from '@aragon/ui'
import { InfoMessage, ErrorMessage } from '../Message'
import TokenSelectorInstance from './TokenSelectorInstance'
import { isAddress } from '../../lib/web3-utils'

const NO_ERROR = Symbol('NO_ERROR')
const TOKEN_NOT_FOUND_ERROR = Symbol('TOKEN_NOT_FOUND_ERROR')
const initialState = { index: -1, address: '', error: NO_ERROR }

const RemoveToken = React.memo(({ tokens, onRemoveToken }) => {
  const [selectedToken, setSelectedToken] = useState(initialState)

  const handleFormSubmit = () => {
    const { address } = selectedToken
    if (!isAddress(address)) setSelectedToken(token => ({ ...token, error: TOKEN_NOT_FOUND_ERROR }))
    else {
      onRemoveToken(selectedToken.address)
    }
  }

  const handleChange = newIndex => {
    setSelectedToken({ index: newIndex, address: tokens[newIndex].address })
  }

  const items = useMemo(
    () =>
      tokens.map(({ address, name, symbol, verified }) => (
        <TokenSelectorInstance address={address} name={name} showIcon={verified} symbol={symbol} />
      )),
    [tokens]
  )

  let errorMessage
  if (selectedToken.error === TOKEN_NOT_FOUND_ERROR) errorMessage = 'Selected token not found'

  return (
    <div>
      <form onSubmit={handleFormSubmit}>
        <InfoMessage
          title="Redemption action"
          text={'This action will remove the selected token from the redeemable tokens'}
        />
        <div
          css={`
            margin-top: 1rem;
          `}
        >
          <Field label={'Token'}>
            <DropDown
              header="Token"
              placeholder="Select a token"
              items={items}
              selected={selectedToken.index}
              onChange={handleChange}
              required
              wide
            />
          </Field>
          <Button mode="strong" wide type="submit" disabled={selectedToken.index === -1}>
            Remove token
          </Button>
          {errorMessage && <ErrorMessage text={errorMessage} />}
        </div>
      </form>
    </div>
  )
})

export default RemoveToken
