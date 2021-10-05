import PropTypes from 'prop-types'
import React from 'react'

import {
  ContextMenu,
  ContextMenuItem,
  DataView,
  Tag,
  Text,
  useTheme,
} from '@aragon/ui'

import LocalIdentityBadge from '../LocalIdentityBadge/LocalIdentityBadge'
import { IconDelete } from '../../../../../shared/ui'

const entitiesSort = (a, b) => a.data.name.toUpperCase() > b.data.name.toUpperCase() ? 1 : -1

const Entities = ({ entities, onRemoveEntity }) => {
  const theme = useTheme()
  const ENTITY_TYPES = [
    {
      name: 'Individual',
      fg: theme.tagIdentifierContent.toString(),
      bg: theme.tagIdentifier.toString(),
    },
    { name: 'Organization',
      fg: theme.warningSurfaceContent.toString(),
      bg: theme.warningSurface.toString(),
    },
  ]
  const removeEntity = address => () => onRemoveEntity(address)

  return (
    <DataView
      mode="adaptive"
      fields={[ 'Name', 'Address', 'Type' ]}
      entries={
        entities.sort(entitiesSort).map(({ addr: entryAddress, data: { name, type: entryType } }) =>
          [ name, entryAddress, entryType ]
        )
      }

      renderEntry={([ name, entryAddress, entryType ]) => {
        const type = ENTITY_TYPES.find(t => t.name === entryType)
        return [
          <Text key="1" size="large">{name}</Text>,
          <LocalIdentityBadge
            entity={entryAddress}
            forceAddress
            key="2"
            shorten
          />,
          <Tag
            background={type.bg}
            css="font-weight: bold"
            color={type.fg}
            key="3"
            mode="identifier"
          >
            {type.name}
          </Tag>
        ]
      }}

      renderEntryActions={([ , entryAddress ]) => (
        <ContextMenu>
          <ContextMenuItem onClick={removeEntity(entryAddress)}>
            <IconDelete />
            <span css="padding: 4px 8px 0px">Remove</span>
          </ContextMenuItem>
        </ContextMenu>
      )}
    />
  )
}

Entities.propTypes = {
  // TODO: shape better
  entities: PropTypes.array.isRequired,
  onRemoveEntity: PropTypes.func.isRequired,
}

export default Entities
