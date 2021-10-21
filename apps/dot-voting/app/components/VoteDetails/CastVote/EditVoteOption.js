import React, { useRef } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { TextInput as AragonTextInput, useTheme } from '@aragon/ui'
import Slider from '../../Slider'
import LocalIdentityBadge from '../../LocalIdentityBadge/LocalIdentityBadge'

const Label = styled.div`
  width: 100%;
`

// a11y rules say inputs must have a label;
// this adds the label for screenreaders but hides it visually
const HiddenLabel = styled.label`
  text-indent: -9999em;
`

const Inputs = styled.div`
  display: flex;
  margin: 0.5rem 0 1rem 0;
  justify-content: space-between;
  width: 100%;
`

const TextInput = styled(AragonTextInput).attrs({
  inputMode: 'numeric',
  pattern: '[0-9]*',
})`
  border-radius: 3px;
  border: 1px solid ${({ theme }) => theme.surfaceIcon};
  box-shadow: 0 4px 4px 0 rgba(0, 0, 0, 0.03);
  height: 40px;
  text-align: center;
  width: 69px;
  ::-webkit-inner-spin-button,
  ::-webkit-outer-spin-button {
    appearance: none;
    margin: 0;
  }
`

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`

const EditVoteOption = ({
  label,
  onUpdate,
  value,
}) => {
  const theme = useTheme()
  const input = useRef()
  return (
    <Wrap>
      <Label>
        <LocalIdentityBadge
          compact
          entity={label}
          fontSize="small"
          shorten
        />
      </Label>
      <Inputs>
        <Slider
          onUpdate={x => onUpdate(Math.round(x * 100))}
          value={value / 100}
        />
        <HiddenLabel htmlFor="percentage">Percentage</HiddenLabel>
        <TextInput
          name="percentage"
          min={0}
          onBlur={() => onUpdate(value) /* re-render component to reset input */}
          onChange={e => onUpdate(e.target.value)}
          ref={input}
          theme={theme}
          type="number"
          value={
            !value && input.current === document.activeElement
              ? ''
              : Number(value)
          }
        />
      </Inputs>
    </Wrap>
  )
}

EditVoteOption.propTypes = {
  onUpdate: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
}

export default EditVoteOption
