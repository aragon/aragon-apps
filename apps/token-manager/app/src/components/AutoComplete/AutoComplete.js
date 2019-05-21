import React, { useState, useRef, useEffect } from 'react'
import styled from 'styled-components'
import { ButtonBase, TextInput, theme, unselectable } from '@aragon/ui'
import { useClickOutside, useOnBlur } from '../../hooks'

const { contentBackground, contentBorder, textPrimary } = theme

const AutoComplete = React.forwardRef(
  (
    {
      defaultValue,
      defaultSelected,
      onChange,
      onSearch,
      items,
      renderItem,
      renderSelected,
      wide,
      required,
    },
    ref
  ) => {
    const [opened, setOpened] = useState(false)
    const [searchValue, setSearchValue] = useState('')
    const [selected, setSelected] = useState(null)

    const selectedRef = useRef()
    const wrapRef = useRef()
    const handleClose = () => {
      setOpened(false)
      if (!selected) {
        onChange(searchValue)
      }
    }
    const handleSearch = ({ target: { value = '' } }) => {
      if (value === '') {
        setTimeout(() => onChange(), 0)
      }
      onSearch(value)
      setOpened(value.length > 2)
      setSearchValue(value)
      setSelected(null)
    }
    const handleChange = item => e => {
      e.preventDefault()
      const { name } = item
      onChange(item)
      onSearch(name)
      setOpened(false)
      setSearchValue(name)
      setSelected(item)
      setTimeout(() => selectedRef.current && selectedRef.current.focus(), 0)
    }
    const handleFocus = () => {
      setSelected(null)
      setOpened(true)
      setTimeout(() => ref.current && ref.current.focus(), 0)
    }
    const handleInputFocus = () => {
      setOpened(true)
    }

    useClickOutside(handleClose, wrapRef)
    const { handleBlur } = useOnBlur(handleClose, wrapRef)
    useEffect(() => {
      setSearchValue(defaultValue)
      onSearch(defaultValue)
    }, [defaultValue])
    useEffect(() => {
      setSelected(defaultSelected)
    }, [defaultSelected])

    return (
      <div css="position: relative" onBlur={handleBlur} ref={wrapRef}>
        {!selected && (
          <TextInput
            ref={ref}
            wide={wide}
            required={required}
            onChange={handleSearch}
            value={searchValue}
            onFocus={handleInputFocus}
          />
        )}
        {selected && (
          <Selected ref={selectedRef} onClick={handleFocus}>
            {renderSelected(selected)}
          </Selected>
        )}
        {opened && !!items.length && (
          <Items role="listbox">
            {items.map(item => (
              <Item role="option" key={item.key}>
                <ButtonBase onClick={handleChange(item)} css="width: 100%">
                  {renderItem(item, searchValue)}
                </ButtonBase>
              </Item>
            ))}
          </Items>
        )}
      </div>
    )
  }
)

const Selected = styled(ButtonBase)`
  height: 40px;
  width: 100%;
  background: #fff;
  display: grid;
  align-items: center;
  grid-gap: 8px;
  grid-template-columns: auto 1fr;
  padding: 0 8px;
  cursor: pointer;
  border: 1px solid ${contentBorder};
  border-radius: 3px;
`

const Item = styled.li`
  ${unselectable()};
`

const Items = styled.ul`
  position: absolute;
  z-index: 2;
  top: 100%;
  width: 100%;
  padding: 8px 0;
  color: ${textPrimary};
  background: ${contentBackground};
  border: 1px solid ${contentBorder};
  box-shadow: 0 4px 4px 0 rgba(0, 0, 0, 0.06);
  border-radius: 3px;
  padding: 0;
  margin: 0;
  list-style: none;
`

export default AutoComplete
