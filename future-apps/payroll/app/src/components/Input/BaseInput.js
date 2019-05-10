import React from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'
import { TextInput, theme } from '@aragon/ui'

const BaseInput = styled(TextInput).attrs({
  wide: true,
})`
  height: ${({ height }) => `${height}px` || '39px'};
`

const Container = styled.div`
  position: relative;
`

const IconStyled = styled(({ component, parentHeight, ...props }) =>
  React.cloneElement(component, props)
)`
  position: absolute;
  top: ${({ parentHeight }) => {
    if (!parentHeight) return '5px'
    const svgHeight = 22
    const defaultInputPadding = 1
    const topHeight = parentHeight / 2 - svgHeight / 2 - defaultInputPadding
    return `${topHeight}px`
  }};
  color: ${theme.textSecondary};
  ${props => props.icon && iconPositionCss(props.iconposition)}
`

const BaseInputStyled = styled(BaseInput)`
  ${props => props.icon && inputPaddingCss(props.iconposition)}
`

const iconPositionCss = (position = 'left') => {
  switch (position) {
    case 'right':
      return `right: 4px;`
    case 'left':
    default:
      return `left: 4px;`
  }
}

const inputPaddingCss = (position = 'left') => {
  switch (position) {
    case 'right':
      return `padding-right: 30px;`
    case 'left':
    default:
      return `padding-left: 30px;`
  }
}

class WrapperBaseInput extends React.Component {
  render() {
    const { icon, iconposition, height, ref, ...rest } = this.props

    return (
      <Container>
        <BaseInputStyled {...rest} ref={ref} height={height} />
        {icon && (
          <IconStyled
            component={icon}
            icon={icon}
            iconposition={iconposition}
            parentHeight={height}
          />
        )}
      </Container>
    )
  }
}

WrapperBaseInput.propTypes = {
  iconposition: PropTypes.string,
  icon: PropTypes.any,
}

WrapperBaseInput.defaultProps = {
  iconposition: 'left',
}

export default React.forwardRef((props, ref) => (
  <WrapperBaseInput ref={ref} {...props} />
))
