import React from 'react'
import PropTypes from 'prop-types'
import { useNetwork } from '@aragon/api-react'
import { IdentityBadge } from '@aragon/ui'
import { useIdentity } from '../IdentityManager/IdentityManager'
import LocalLabelPopoverTitle from './LocalLabelPopoverTitle'
import LocalLabelPopoverActionLabel from './LocalLabelPopoverActionLabel'

const LocalIdentityBadge = ({ defaultLabel, entity, ...props }) => {
  const network = useNetwork()
  const [label, showLocalIdentityModal] = useIdentity(entity)
  const handleClick = () => showLocalIdentityModal(entity)
  return (
    <IdentityBadge
      label={label || defaultLabel}
      entity={entity}
      networkType={network && network.type}
      popoverAction={{
        label: <LocalLabelPopoverActionLabel hasLabel={Boolean(label)} />,
        onClick: handleClick,
      }}
      popoverTitle={
        label ? <LocalLabelPopoverTitle label={label} /> : undefined
      }
      {...props}
    />
  )
}

LocalIdentityBadge.propTypes = {
  defaultLabel: PropTypes.string,
  ...IdentityBadge.propTypes,
}

export default LocalIdentityBadge
