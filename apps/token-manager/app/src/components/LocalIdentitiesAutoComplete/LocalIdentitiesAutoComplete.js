import React, { useState, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { ButtonBase, EthIdenticon, IdentityBadge, theme } from '@aragon/ui'
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
    const [selected, setSelected] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const selectedRef = useRef()

    const handleSelectedClick = useCallback(() => {
      setSelected(null)
      onChange(selected.name)
      setTimeout(() => {
        ref.current.select()
        ref.current.focus()
      }, 0)
    }, [ref, selected, onChange])
    const handleSearch = useCallback(
      term => {
        if (term.length < 3) {
          setItems([])
          return
        }
        const items = search(term)
        setItems(items)
      },
      [search]
    )
    const handleChange = useCallback(
      value => {
        setSearchTerm(value)
        handleSearch(value)
        onChange(value)
      },
      [onChange]
    )
    const handleSelect = useCallback(
      selected => {
        const { name, address } = selected
        setSearchTerm(name)
        handleSearch(name)
        setSelected(selected)
        onChange(address)
        setTimeout(() => {
          selectedRef.current.focus()
        }, 0)
      },
      [onChange]
    )
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

    useEffect(() => {
      // reset
      if (value === '') {
        setSelected(null)
        setSearchTerm(value)
        handleSearch(value)
        return
      }
      // value coming from up the tree not from typing
      if (searchTerm === '') {
        const exists = search(value)
        if (exists && exists.length === 1) {
          const item = exists[0]
          if (
            item.name.toLowerCase() === value.toLowerCase() ||
            item.address.toLowerCase() === value.toLowerCase()
          ) {
            setSelected(item)
            setSearchTerm(item.name)
            handleSearch(item.name)
            return
          }
        }
        setSearchTerm(value)
      }
    }, [selected, value])

    if (selected) {
      const { address, name } = selected
      return (
        <SelectedWrap onClick={handleSelectedClick} ref={selectedRef}>
          <Option selected>
            <EthIdenticon address={address} scale={0.6} radius={2} />
            <Name>{name}</Name>
          </Option>
        </SelectedWrap>
      )
    }

    return (
      <AutoComplete
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
        items={items}
        onChange={handleChange}
        onSelect={handleSelect}
        ref={ref}
        renderItem={renderItem}
        required={required}
        value={searchTerm}
        wide={wide}
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

const SelectedWrap = styled(ButtonBase)`
  height: 40px;
  width: 100%;
  background: #fff;
  display: grid;
  align-items: center;
  grid-gap: 8px;
  grid-template-columns: auto 1fr;
  padding: 0 8px;
  cursor: pointer;
  border: 1px solid ${theme.contentBorder};
  border-radius: 3px;

  &:hover,
  &:focus {
    outline: none;
    border: 1px solid ${theme.accent};
    border-radius: 3px;
  }
`

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
