import React from 'react'
import PropTypes from 'prop-types'
import styled, { css } from 'styled-components'
import { theme, font } from '@aragon/ui'

const baseStyles = css`
  ${font({ size: 'small', weight: 'normal' })};
  width: ${({ wide }) => (wide ? '100%' : 'auto')};
  height: 40px;
  padding: 0 10px;
  background: ${theme.contentBackground};
  border: 1px solid ${theme.contentBorder};
  border-radius: 3px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
  color: ${theme.textPrimary};
  appearance: none;
  &:focus {
    outline: none;
    border-color: ${theme.contentBorderActive};
  }
  &:read-only {
    color: transparent;
    text-shadow: 0 0 0 ${theme.textSecondary};
  }
`

// Simple text input
const TextInput = styled.input`
  ${baseStyles};
`

TextInput.propTypes = {
  required: PropTypes.bool,
  type: PropTypes.oneOf([
    'email',
    'number',
    'password',
    'search',
    'tel',
    'text',
    'url',
  ]),
}

TextInput.defaultProps = {
  required: false,
  type: 'text',
}

// Text input wrapped to allow adornments
const WrapperTextInput = React.forwardRef(
  (
    {
      adornment,
      adornmentPosition,
      adornmentSettings: {
        width: adornmentWidth = 34,
        padding: adornmentPadding = 4,
      },
      ...props
    },
    ref
  ) => {
    if (!adornment) {
      return <TextInput ref={ref} {...props} />
    }
    return (
      <div
        css={`
          display: inline-flex;
          position: relative;
          width: max-content;
        `}
      >
        <TextInput
          ref={ref}
          css={`
            ${adornmentPosition === 'end'
              ? 'padding-right'
              : 'padding-left'}: ${adornmentWidth - adornmentPadding * 2}px;
          `}
          {...props}
        />
        <div
          css={`
            position: absolute;
            top: 0;
            bottom: 0;
            height: 100%;
            ${adornmentPosition === 'end'
              ? 'right'
              : 'left'}: ${adornmentPadding}px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${theme.textSecondary};
          `}
        >
          {adornment}
        </div>
      </div>
    )
  }
)

WrapperTextInput.propTypes = {
  ...TextInput.propTypes,
  adornment: PropTypes.node,
  adornmentPosition: PropTypes.oneOf(['start', 'end']),
  adornmentSettings: PropTypes.shape({
    width: PropTypes.number,
    padding: PropTypes.number,
  }),
}

WrapperTextInput.defaultProps = {
  ...TextInput.defaultProps,
  adornment: null,
  adornmentPosition: 'start',
  adornmentSettings: {},
}

// <input type=number> (only for compat)
const TextInputNumber = styled.input.attrs({ type: 'number' })`
  ${baseStyles};
`

// Multiline input (textarea element)
const TextInputMultiline = styled.textarea`
  ${baseStyles};
  resize: vertical;
`
TextInputMultiline.propTypes = {
  required: PropTypes.bool,
}
TextInputMultiline.defaultProps = {
  required: false,
}

WrapperTextInput.Number = TextInputNumber
WrapperTextInput.Multiline = TextInputMultiline

export default WrapperTextInput
