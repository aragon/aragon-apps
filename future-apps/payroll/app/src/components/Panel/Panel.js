import styled from 'styled-components'
import { theme } from '@aragon/ui'

const Panel = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: ${theme.contentBackground};
  border: 1px solid ${theme.contentBorder};
  border-radius: 3px;

  a {
    text-decoration: underline;
    color: ${theme.accent};
    cursor: pointer;
  }
`

export default Panel
