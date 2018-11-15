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
  ${props => iconPositionCss(props.iconPosition)}
`

const BaseInputStyled = styled(BaseInput)`
  ${props => inputPaddingCss(props.iconPosition)}
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
    if (this.props.icon) {
      const { iconPosition, icon } = this.props;
      return (
        <Container>
          <BaseInputStyled {...this.props} iconPosition={this.props.iconPosition} />
          <IconStyled component={this.props.icon} iconPosition={this.props.iconPosition} />
        </Container>
      )
    }

    return <BaseInput {...this.props} />
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
