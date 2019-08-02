import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { IdentityBadge, Tag, font } from '@aragon/ui'
import { useNetwork } from '@aragon/api-react'
import { useIdentity } from '../../identity-manager'

const LocalIdentityBadge = ({ entity, ...props }) => {
  const network = useNetwork()
  const [label, showLocalIdentityModal] = useIdentity(entity)
  const handleClick = () => showLocalIdentityModal(entity)
  return (
    <IdentityBadge
      networkType={network && network.type}
      customLabel={label || ''}
      entity={entity}
      popoverAction={{
        label: `${label ? 'Edit' : 'Add'} custom label`,
        onClick: handleClick,
      }}
      popoverTitle={
        label ? (
          <Wrap>
            <Label>{label}</Label>
            <StyledBadge>Custom label</StyledBadge>
          </Wrap>
        ) : (
          'Address'
        )
      }
      {...props}
    />
  )
}

LocalIdentityBadge.propTypes = {
  entity: PropTypes.string.isRequired,
}

const Wrap = styled.div`
  display: grid;
  align-items: center;
  grid-template-columns: auto 1fr;
  padding-right: 24px;
`

const Label = styled.span`
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const StyledBadge = styled(Tag).attrs({ mode: 'app' })`
  margin-left: 16px;
  text-transform: uppercase;
  ${font({ size: 'xxsmall' })};
`

export default LocalIdentityBadge
