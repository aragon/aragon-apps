import styled from 'styled-components'
import { theme } from '@aragon/ui'

const TabItem = styled.li`
  display: inline-block;
  padding: 8px 0 4px;
  cursor: pointer;
  border-bottom: 4px solid
    ${({ active }) => (active ? theme.gradientEndActive : 'transparent')};
`

export default TabItem
