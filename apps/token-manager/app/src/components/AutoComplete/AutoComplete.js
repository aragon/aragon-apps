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
        itemButtonStyles,
        items,
        onSelect,
        onChange,
        renderItem,
        required,
        value,
        wide,
      },
      ref
    ) => {
      const [opened, setOpened] = useState(true)
      const selectedRef = useRef()
      const wrapRef = useRef()

      const handleClose = useCallback(() => setOpened(false))
      const handleFocus = useCallback(() => setOpened(true))
      const handleSelect = useCallback(
        item => e => {
          e.preventDefault()
          onSelect(item)
        },
        [onSelect]
      )
      const handleChange = useCallback(
        ({ target: { value } }) => onChange(value),
        [onChange, value]
      )

      useClickOutside(handleClose, wrapRef)
      const { handleBlur } = useOnBlur(handleClose, wrapRef)

      return (
        <div css="position: relative" ref={wrapRef} onBlur={handleBlur}>
          <TextInput
            css={`
              caret-color: ${accent};
              padding-right: 35px;
            `}
            ref={ref}
            wide={wide}
            required={required}
            onChange={handleChange}
            onFocus={handleFocus}
            value={value}
          />
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
                        onClick={handleSelect(item)}
                        css={`
                          width: 100%;
                          ${itemButtonStyles}
                        `}
                      >
                        {renderItem(item, value)}
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
  itemButtonStyles: PropTypes.string,
  items: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  renderItem: PropTypes.func,
  required: PropTypes.bool,
  value: PropTypes.string,
  wide: PropTypes.bool,
}

AutoComplete.defaultProps = {
  renderItem: identity,
}

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
