import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Badge, IdentityBadge, font } from '@aragon/ui'
import { CustomLabelModalContext } from '../CustomLabelModal/CustomLabelModalManager'
import { IdentityContext } from '../IdentityManager/IdentityManager'

const CustomLabelIdentityBadge = ({ address, ...props }) => {
  const { resolve } = React.useContext(IdentityContext)
  const { showCustomLabelModal, updates$ } = React.useContext(
    CustomLabelModalContext
  )
  const [label, setLabel] = React.useState()
  const handleResolve = async () => {
    try {
      const { name = null } = await resolve(address)
      setLabel(name)
    } catch (e) {
      // address does not ressolve to identity
    }
  }
  const handleClick = () => {
    showCustomLabelModal(address)
      .then(handleResolve)
      .catch(e => {
        /* user cancelled modify intent */
      })
  }
  React.useEffect(() => {
    handleResolve(address)
    const subscription = updates$.subscribe(addr => {
      if (addr === address) {
        handleResolve(address)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <IdentityBadge
      {...props}
      customLabel={label || ''}
      address={address}
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

CustomLabelIdentityBadge.propTypes = {
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

export default CustomLabelIdentityBadge
