import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Badge, IdentityBadge, font } from '@aragon/ui'
import { LocalIdentityModalContext } from '../LocalIdentityModal/LocalIdentityModalManager'
import { IdentityContext } from '../IdentityManager/IdentityManager'

function useIdentity(address) {
  const [name, setName] = React.useState(null)
  const { resolve } = React.useContext(IdentityContext)
  const { updates$, showLocalIdentityModal } = React.useContext(
    LocalIdentityModalContext
  )

  const handleNameChange = metadata => {
    setName(metadata.name)
  }

  React.useEffect(() => {
    resolve(address).then(handleNameChange)

    const subscription = updates$.subscribe(updatedAddress => {
      if (updatedAddress.toLowerCase() === address.toLowerCase()) {
        resolve(address).then(handleNameChange)
      }
    })
    return () => subscription.unsubscribe()
  }, [address])

  return [name, showLocalIdentityModal]
}

const LocalIdentityBadge = ({ address, ...props }) => {
  const [label, showLocalIdentityModal] = useIdentity(address)
  const handleClick = () => showLocalIdentityModal(address)
  return (
    <IdentityBadge
      {...props}
      customLabel={label || ''}
      entity={address}
      popoverAction={{
        label: `${label ? 'Edit' : 'Add'} custom label`,
        onClick: handleClick,
      }}
      popoverTitle={
        label ? (
          <Wrap>
            <Address>{label}</Address>
            <StyledBadge>Custom label</StyledBadge>
          </Wrap>
        ) : (
          'Address'
        )
      }
    />
  )
}

LocalIdentityBadge.propTypes = {
  address: PropTypes.string.isRequired,
}

const Wrap = styled.div`
  display: grid;
  align-items: center;
  grid-template-columns: auto 1fr;
  padding-right: 24px;
`

const Address = styled.span`
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const StyledBadge = styled(Badge)`
  margin-left: 16px;
  text-transform: uppercase;
  ${font({ size: 'xxsmall' })};
`

export default LocalIdentityBadge
