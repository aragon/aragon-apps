import React from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'
import { TextInput, theme } from '@aragon/ui'

const BaseInput = styled(TextInput).attrs({
  wide: true
})``

const Container = styled.div`
  position: relative;
`

const IconStyled = styled(
    ({ component, ...props }) => React.cloneElement(component, props)
)`
  position: absolute;
  top: 5px;
  color: ${theme.textSecondary};
  ${props => props.icon && iconPositionCss(props.iconPosition)}
`

const BaseInputStyled = styled(BaseInput)`
  ${props => props.icon && inputPaddingCss(props.iconPosition)}
`

const iconPositionCss = (position = 'left') => {
  switch (position) {
    case 'right': return `right: 4px;`
    case 'left':
    default: return `left: 4px;`
  }
}

const inputPaddingCss = (position = 'left') => {
   switch (position) {
    case 'right': return `padding-right: 30px;`
    case 'left':
    default: return `padding-left: 30px;`
  }
}

class  WrapperBaseInput extends React.Component {
  render () {
    const { icon } = this.props;
    return (
      <Container>
        <BaseInputStyled {...this.props} />
        { icon && <IconStyled component={icon} {...this.props} /> }
      </Container>
    )
  }
}

WrapperBaseInput.propTypes = {
  iconPosition: PropTypes.string,
  icon: PropTypes.any
}

WrapperBaseInput.defaultProps = {
  iconPosition: 'left'
}

export default WrapperBaseInput
