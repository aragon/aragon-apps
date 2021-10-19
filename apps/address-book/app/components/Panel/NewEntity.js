import React from 'react'
import PropTypes from 'prop-types'
import { Form, FormField } from '../Form'
import { DropDown, IconClose, TextInput, theme } from '@aragon/ui'
import styled from 'styled-components'
import web3Utils from 'web3-utils'

const isCustomType = type => type === 'Custom type...'

const ENTITY_TYPES = [ 'Individual', 'Organization' ]
const INITIAL_STATE = {
  name: '',
  address: '',
  type: 'Individual',
  customType: ''
}

const ErrorText = styled.div`
  font-size: small;
  display: flex;
  align-items: center;
  margin-top: 24px;
`

const ErrorMessage = ({ children }) => (
  <ErrorText>
    <IconClose
      size="tiny"
      css={{
        marginRight: '8px',
        color: theme.negative,
      }}
    />
    {children}
  </ErrorText>
)

ErrorMessage.propTypes = {
  children: PropTypes.node,
}

class NewEntity extends React.Component {
  static propTypes = {
    onCreateEntity: PropTypes.func.isRequired,
    addressList: PropTypes.arrayOf(PropTypes.string).isRequired,
  }

  state = INITIAL_STATE

  changeField = ({ target: { name, value } }) => {
    this.setState({
      [name]: value,
    })
  }

  changeType = type => {
    this.setState({
      type: ENTITY_TYPES[type],
    })
  }

  handleSubmit = () => {
    const { name, address, type, customType } = this.state
    const data = {
      name: name,
      address: address,
      type: isCustomType(type) ? customType : type,
    }

    this.setState(INITIAL_STATE)
    this.props.onCreateEntity(data)
  }

  render() {
    const { addressList } = this.props
    const { address, name, type, customType } = this.state
    const { handleSubmit, changeField, changeType } = this

    const emptyName = name.trim() === ''
    const emptyAddress = address.trim() === ''
    const emptyCustomType = customType.trim() === ''
    const errorBlock = []

    const errorAddress = !emptyAddress && !web3Utils.isAddress(address) ?
      <ErrorMessage key="errorAddress">
        Please provide a valid ethereum address
      </ErrorMessage>
      : null
    errorBlock.push(errorAddress)

    const errorDuplicate = addressList.includes(address) ?
      <ErrorMessage key="errorDuplicate">
        This address already exists in the address book
      </ErrorMessage>
      : null
    errorBlock.push(errorDuplicate)

    const formDisabled = emptyName || emptyAddress || (isCustomType(type) && emptyCustomType) || errorAddress || errorDuplicate

    const customTypeFormField =
      type === 'Custom type...' ? (
        <FormField
          required
          label="Custom type"
          input={
            <TextInput
              name="customType"
              onChange={changeField}
              value={customType}
              wide
            />
          }
        />
      ) : null

    return (
      <Form
        onSubmit={handleSubmit}
        disabled={!!formDisabled}
        submitText="Submit entity"
        error={errorBlock}
      >
        <FormField
          required
          label="Name"
          input={
            <TextInput
              name="name"
              onChange={changeField}
              value={name}
              wide
              aria-label="Entity name"
            />
          }
        />

        <FormField
          required
          label="Address"
          input={
            <TextInput
              name="address"
              onChange={changeField}
              value={address}
              wide
              aria-label="Entity address"
            />
          }
        />

        <FormField
          label="Type"
          input={
            <DropDown
              name="type"
              items={ENTITY_TYPES}
              onChange={changeType}
              selected={ENTITY_TYPES.indexOf(type)}
              wide
            />
          }
        />

        {customTypeFormField}
      </Form>
    )
  }
}

export default NewEntity
