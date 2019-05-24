import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { EthIdenticon, IdentityBadge, theme } from '@aragon/ui'
import AutoComplete from '../AutoComplete/AutoComplete'

const mockItems = [
  {
    name: 'A good soul',
    address: '0x39a4d265db942361d92e2b0039cae73ea72a2ff9',
  },
  {
    name: 'Vault app',
    address: '0x3b72de356b960974deaaa5f25ad6dead0dff5e05',
  },
  {
    name:
      'Somebody (maybe @ Aragon) and this is very large, indeed very large, come on large',
    address: '0x3bd60bafea8a7768c6f4352af4cfe01701884ff2',
  },
  {
    name: 'Metamask @ Chrome',
    address: '0x447ae38c0dc4126b10b5560bedb2c9c837b69dc9',
  },
  {
    name: 'Voting app',
    address: '0x4fcd89c67a296756187be2962c6e4719c4a89cab',
  },
  {
    name: 'dev.aragon.id',
    address: '0x52d709f95d940d474d01c6f50d7686c3eff03831',
  },
  {
    name: 'Token Manager app',
    address: '0x7aa282a67195b5bca2295cddaedb62516898e7d0',
  },
  {
    name: 'Aragon default 2',
    address: '0x8401eb5ff34cc943f096a32ef3d5113febe8d4eb',
  },
  {
    name: 'Coinbase @ iPhone',
    address: '0xa244ebd51056cd9fdc476b87028c2a372bc64c9e',
  },
  {
    name: 'Status @ iPhone',
    address: '0xa47967b5127ef0dfaaef1d607e53eab00285c84f',
  },
  {
    name: 'Aragon default 1',
    address: '0xb4124ceb3451635dacedd11767f004d8a28c6ee7',
  },
  {
    name: 'Finance app',
    address: '0xb983e1754e96144bedacbaa249fda8ac300ccdaf',
  },
  {
    name: '0x Who is this dude?',
    address: '0xd395d4a9753310f3940de2673c70c251224e3d07',
  },
]

const search = value => {
  const searchAddress = value.substr(0, 2) === '0x'
  const items = mockItems
    .filter(
      ({ address, name }) =>
        (searchAddress &&
          value.length > 3 &&
          address.toLowerCase().indexOf(value.toLowerCase()) === 0) ||
        name.toLowerCase().indexOf(value.toLowerCase()) > -1
    )
    .map(i => ({ ...i, key: i.address }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return items
}

const LocalAutoComplete = React.memo(
  React.forwardRef(({ onChange, wide, value, required }, ref) => {
    const [items, setItems] = useState([])
    const [defaultSelected, setDefaultSelected] = useState(null)

    const handleChange = data => {
      if (data && data.address) {
        onChange(data.address)
        return
      }
      onChange(data || '')
    }
    const handleSearch = value => {
      if (value.length < 3) {
        setItems([])
        return
      }
      const items = search(value)
      setItems(items)
    }
    const renderItem = useCallback(({ address, name }, search) => {
      if (search.indexOf('0x') === 0) {
        return (
          <Option>
            <IdentityBadge compact badgeOnly entity={address} />
            <Name>{name}</Name>
          </Option>
        )
      }

      return (
        <Option>
          <Name>{name}</Name>
          <IdentityBadge compact badgeOnly entity={address} />
        </Option>
      )
    })

    const renderSelected = useCallback(({ address, name }) => {
      return (
        <Option selected>
          <EthIdenticon address={address} scale={0.6} radius={2} />
          <Name>{name}</Name>
        </Option>
      )
    })

    useEffect(() => {
      const exists = search(value)
      if (exists && exists.length === 1) {
        const item = exists[0]
        if (
          item.name.toLowerCase() === value.toLowerCase() ||
          item.address.toLowerCase() === value.toLowerCase()
        ) {
          setDefaultSelected(item)
        }
      } else {
        setDefaultSelected(null)
      }
    }, [value, search])

    return (
      <AutoComplete
        ref={ref}
        items={items}
        onChange={handleChange}
        onSearch={handleSearch}
        renderItem={renderItem}
        itemButtonStyles={`
          border-left: 3px solid transparent;
          cursor: pointer;
          border-radius: 0;

          &:hover,
          &:focus {
            outline: 2px solid ${theme.accent};
            background: #f9fafc;
            border-left: 3px solid ${theme.accent}
          }
        `}
        renderSelected={renderSelected}
        selectedButtonStyles={`
          &:hover,
          &:focus {
            outline: none;
            border: 1px solid ${theme.accent};
            border-radius: 3px;
          }
        `}
        wide={wide}
        required={required}
        defaultSelected={defaultSelected}
        defaultValue={(defaultSelected && defaultSelected.name) || value || ''}
      />
    )
  })
)

LocalAutoComplete.propTypes = {
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  value: PropTypes.string,
  wide: PropTypes.bool,
}

const Option = styled.div`
  padding: 8px;
  display: grid;
  grid-template-columns: auto minmax(140px, 1fr);
  grid-gap: 8px;
  align-items: center;
`

const Name = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  text-align: left;
  color: #000;
`

export default LocalAutoComplete
