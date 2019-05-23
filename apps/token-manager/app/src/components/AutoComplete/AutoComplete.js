import React, { useState, useRef, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Transition, animated } from 'react-spring'
import { ButtonBase, TextInput, springs, theme, unselectable } from '@aragon/ui'
import { useClickOutside, useOnBlur } from '../../hooks'
import IconMagnifyingGlass from './IconMagnifyingGlass'

const { accent, contentBackground, contentBorder, textPrimary } = theme
const identity = x => x

const AutoComplete = React.memo(
  React.forwardRef(
    (
      {
        defaultSelected,
        defaultValue,
        itemButtonStyles,
        items,
        onChange,
        onSearch,
        renderItem,
        renderSelected,
        required,
        selectedButtonStyles,
        wide,
      },
      ref
    ) => {
      const [opened, setOpened] = useState(false)
      const [searchValue, setSearchValue] = useState('')
      const [selected, setSelected] = useState(null)

      const selectedRef = useRef()
      const wrapRef = useRef()
      const handleClose = useCallback(() => {
        setOpened(false)
        if (!selected) {
          onChange(searchValue)
        }
      }, [selected, onChange])
      const handleSearch = useCallback(
        ({ target: { value = '' } }) => {
          if (value === '') {
            setTimeout(() => onChange(), 0)
          }
          onSearch(value)
          setOpened(value.length > 2)
          setSearchValue(value)
          setSelected(null)
        },
        [onChange, onSearch]
      )
      const handleChange = useCallback(
        item => e => {
          e.preventDefault()
          const { name } = item
          onChange(item)
          onSearch(name)
          setOpened(false)
          setSearchValue(name)
          setSelected(item)
          setTimeout(
            () => selectedRef.current && selectedRef.current.focus(),
            0
          )
        },
        [onChange, onSearch, selectedRef]
      )
      const handleFocus = useCallback(() => {
        setSelected(null)
        setOpened(true)
        setTimeout(
          () => ref.current && ref.current.select() && ref.current.focus(),
          0
        )
      }, [ref])
      const handleInputFocus = useCallback(() => {
        setOpened(true)
      })

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
              css={`
                caret-color: ${accent};
                padding-right: 35px;
              `}
              ref={ref}
              wide={wide}
              required={required}
              onChange={handleSearch}
              value={searchValue}
              onFocus={handleInputFocus}
            />
          )}
          {selected && (
            <Selected
              ref={selectedRef}
              onClick={handleFocus}
              css={selectedButtonStyles}
            >
              {renderSelected(selected)}
            </Selected>
          )}
          <div
            css={`
              position: absolute;
              top: 0;
              right: 0;
              height: 40px;
              width: 35px;
              display: flex;
              align-items: center;
              justify-content: center;
            `}
          >
            <IconMagnifyingGlass css="color: #a8b3c8" />
          </div>
          <Transition
            config={springs.swift}
            items={opened && !!items.length}
            from={{ scale: 0.98, opacity: 0 }}
            enter={{ scale: 1, opacity: 1 }}
            leave={{ scale: 1, opacity: 0 }}
            native
          >
            {show =>
              show &&
              (({ scale, opacity }) => (
                <Items
                  role="listbox"
                  style={{
                    opacity,
                    transform: scale.interpolate(t => `scale3d(${t},${t},1)`),
                  }}
                >
                  {items.map(item => (
                    <Item role="option" key={item.key}>
                      <ButtonBase
                        onClick={handleChange(item)}
                        css={`
                          width: 100%;
                          ${itemButtonStyles}
                        `}
                      >
                        {renderItem(item, searchValue)}
                      </ButtonBase>
                    </Item>
                  ))}
                </Items>
              ))
            }
          </Transition>
        </div>
      )
    }
  )
)

AutoComplete.propTypes = {
  defaultSelected: PropTypes.object,
  defaultValue: PropTypes.string,
  itemButtonStyles: PropTypes.string,
  items: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  renderItem: PropTypes.func,
  renderSelected: PropTypes.func,
  required: PropTypes.bool,
  selectedButtonStyles: PropTypes.string,
  wide: PropTypes.bool,
}

AutoComplete.defaultProps = {
  renderItem: identity,
  renderSelected: identity,
}

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
  overflow: hidden;
  cursor: pointer;
`

const Items = styled(animated.ul)`
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

  & ${Item}:first-child {
    border-top-left-radius: 3px;
    border-top-right-radius: 3px;
  }
  & ${Item}:last-child {
    border-bottom-left-radius: 3px;
    border-bottom-right-radius: 3px;
  }
`

export default AutoComplete
