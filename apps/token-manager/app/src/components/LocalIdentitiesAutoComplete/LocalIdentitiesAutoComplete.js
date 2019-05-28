import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAragonApi } from '@aragon/api-react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { ButtonBase, EthIdenticon, IdentityBadge, theme } from '@aragon/ui'
import AutoComplete from '../AutoComplete/AutoComplete'

const LocalAutoComplete = React.memo(
  React.forwardRef(({ onChange, wide, value, required }, ref) => {
    const { api } = useAragonApi()
    const [items, setItems] = useState([])
    const [selected, setSelected] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const selectedRef = useRef()

    const handleSelectedClick = useCallback(
      () => {
        setSelected(null)
        onChange(selected.name)
        setTimeout(() => {
          ref.current.select()
          ref.current.focus()
        }, 0)
      },
      [ref, selected, onChange]
    )
    const handleSearch = useCallback(
      async term => {
        if (term.length < 3) {
          setItems([])
          return
        }
        const items = await api.searchIdentities(term).toPromise()
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
    const renderItem = useCallback(({ address, name }, searchTerm) => {
      if (searchTerm.indexOf('0x') === 0) {
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

    useEffect(
      () => {
        const effect = async () => {
          // reset
          if (value === '') {
            setSelected(null)
            setSearchTerm(value)
            handleSearch(value)
            return
          }
          // value coming from up the tree not from typing
          if (searchTerm === '') {
            const exists = await api.searchIdentities(value).toPromise()
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
        }
        effect()
      },
      [selected, value]
    )

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
