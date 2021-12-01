import { Text } from '@aragon/ui'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'
import { MenuButton } from '.'

const Wrap = styled.div`
  display: flex;
  align-items: center;
`

// TODO: Remove the className logic once aragonUI introduces new,
// responsive-friendly components to replace AppBar and NavigationBar
const AppTitle = props => (
  <Wrap className={props.className}>
    {props.displayMenuButton && <MenuButton />}
    <Text size="xxlarge">{props.title}</Text>
  </Wrap>
)

AppTitle.propTypes = {
  title: PropTypes.string.isRequired,
  displayMenuButton: PropTypes.bool.isRequired,
}

export default AppTitle
