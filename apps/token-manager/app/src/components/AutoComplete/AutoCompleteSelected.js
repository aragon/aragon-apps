import React, { useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { ButtonBase, theme } from '@aragon/ui'
import AutoComplete from './AutoComplete'

const identity = x => x
const noop = () => null

function AutoCompleteSelected({
  forwardedRef,
  itemButtonStyles,
  items,
  onChange,
  onSelect, // user clicks on an item (selecting the item)
  onSelectedClick = noop, // user clicks on the rendered selected item (opens the input for typing)
  renderItem,
  required,
  renderSelected = identity,
  selected,
  selectedButtonStyles = '',
  value,
  wide,
}) {
  const ref = forwardedRef
  const selectedRef = useRef()

  const handleSelect = useCallback(
    selected => {
      onSelect(selected)
      setTimeout(() => {
        selectedRef.current.focus()
      }, 0)
    },
    [onChange]
  )
  const handleSelectedClick = useCallback(
    () => {
      onSelectedClick()
      setTimeout(() => {
        ref.current.select()
        ref.current.focus()
      }, 0)
    },
    [ref, selected, onChange]
  )

  if (selected) {
    return (
      <ButtonBase
        onClick={handleSelectedClick}
        ref={selectedRef}
        css={`
          height: 40px;
          width: 100%;
          background: #fff;
          cursor: pointer;
          border: 1px solid ${theme.contentBorder};
          border-radius: 3px;
          ${selectedButtonStyles};
        `}
      >
        {renderSelected(selected)}
      </ButtonBase>
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
      onChange={onChange}
      onSelect={handleSelect}
      ref={ref}
      renderItem={renderItem}
      required={required}
      value={value}
      wide={wide}
    />
  )
}

AutoCompleteSelected.propTypes = {
  forwardedRef: PropTypes.object,
  itemButtonStyles: PropTypes.string,
  items: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  onSelectedClick: PropTypes.func,
  renderItem: PropTypes.func,
  renderSelected: PropTypes.func,
  required: PropTypes.bool,
  selected: PropTypes.object,
  selectedButtonStyles: PropTypes.string,
  value: PropTypes.string,
  wide: PropTypes.bool,
}

const AutoCompleteSelectedMemo = React.memo(AutoCompleteSelected)

export default React.forwardRef((props, ref) => (
  <AutoCompleteSelectedMemo {...props} forwardedRef={ref} />
))
