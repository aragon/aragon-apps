import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { useNetwork } from '@aragon/api-react'
import { IdentityBadge, Tag, GU } from '@aragon/ui'
import { useIdentity } from '../IdentityManager/IdentityManager'

const LocalIdentityBadge = ({ entity, ...props }) => {
  const network = useNetwork()
  const [label, showLocalIdentityModal] = useIdentity(entity)
  const handleClick = () => showLocalIdentityModal(entity)
  return (
    <IdentityBadge
      customLabel={label || ''}
      entity={entity}
      networkType={network && network.type}
      popoverAction={{
        label: `${label ? 'Edit' : 'Add'} custom label`,
        onClick: handleClick,
      }}
      popoverTitle={
        label ? (
          <Wrap>
            <Label>{label}</Label>
            <Tag
              css={`
                margin-left: ${2 * GU}px;
              `}
            >
              Custom label
            </Tag>
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
  padding-right: ${3 * GU}px;
`

const Label = styled.span`
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export default LocalIdentityBadge
