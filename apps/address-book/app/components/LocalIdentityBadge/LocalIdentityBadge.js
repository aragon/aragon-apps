import React from 'react'
import PropTypes from 'prop-types'
import { useNetwork } from '@aragon/api-react'
import { IdentityBadge } from '@aragon/ui'
import { useIdentity } from './IdentityManager'
import LocalLabelPopoverTitle from './LocalLabelPopoverTitle'
import LocalLabelPopoverActionLabel from './LocalLabelPopoverActionLabel'

const LocalIdentityBadge = ({ entity, forceAddress, ...props }) => {
  const network = useNetwork()
  const [ label, showLocalIdentityModal ] = useIdentity(entity)
  const handleClick = () => showLocalIdentityModal(entity)
  return (
    <IdentityBadge
      label={(!forceAddress && label) || ''}
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
  ...IdentityBadge.propTypes,
  forceAddress: PropTypes.bool
}

export default LocalIdentityBadge
