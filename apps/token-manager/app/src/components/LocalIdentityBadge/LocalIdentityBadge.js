import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { useNetwork } from '@aragon/api-react'
import { IconLabel, IdentityBadge, Tag, GU } from '@aragon/ui'
import { useIdentity } from '../IdentityManager/IdentityManager'

const LocalIdentityBadge = ({ entity, ...props }) => {
  const network = useNetwork()
  const [label, showLocalIdentityModal] = useIdentity(entity)
  const handleClick = () => showLocalIdentityModal(entity)
  return (
    <IdentityBadge
      label={label || ''}
      entity={entity}
      networkType={network && network.type}
      popoverAction={{
        label: (
          <div
            css={`
              display: flex;
              align-items: center;
            `}
          >
            <IconLabel
              css={`
                margin-right: ${1 * GU}px;
              `}
            />
            {label ? 'Edit' : 'Add'} custom label
          </div>
        ),
        onClick: handleClick,
      }}
      popoverTitle={
        label ? (
          <Wrap>
            <Label>{label}</Label>
            <Tag
              mode="identifier"
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
`

const Label = styled.span`
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export default LocalIdentityBadge
