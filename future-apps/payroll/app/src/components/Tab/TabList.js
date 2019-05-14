import styled, { css } from 'styled-components'
import { theme } from '@aragon/ui'

import TabItem from './TabItem'

const TabList = styled.ul`
  margin: 0;
  padding: 0 30px;
  list-style-type: none;
  background: ${theme.contentBackground};

  ${({ border = true }) =>
    border &&
    css`
      border-bottom: 1px solid ${theme.contentBorder};
      margin-top: -1px; // Overlap AppBar border
    `}

  ${TabItem} {
    margin-right: 30px;
  }
`

export default TabList
