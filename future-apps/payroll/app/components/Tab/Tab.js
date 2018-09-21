import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import { theme } from '@aragon/ui'

const Tab = styled.li`
  display: inline-block;
  padding: 8px 0 4px;
  cursor: pointer;
  border-bottom: 4px solid ${({ active }) => active ? theme.gradientEndActive : 'transparent'};
`

Tab.propTypes = {
  active: PropTypes.bool,
  name: PropTypes.string,
  title: PropTypes.string,
  children: PropTypes.node,
}

export default Tab
