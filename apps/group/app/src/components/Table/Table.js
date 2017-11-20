import React from 'react'
import styled from 'styled-components'
import { Text, theme } from '@aragon/ui'

const StyledTable = styled.table`
  width: 100%;
  border-spacing: 0;
  thead th {
    padding-left: 21px;
    text-align: left;
    font-weight: normal;
  }
  tbody td {
    padding: 20px;
    background: ${theme.contentBackground};
    border-bottom: 1px solid ${theme.contentBorder};
  }
  tbody td:first-child {
    border-left: 1px solid ${theme.contentBorder};
  }
  tbody td:last-child {
    border-right: 1px solid ${theme.contentBorder};
  }
  tbody tr:first-child td {
    border-top: 1px solid ${theme.contentBorder};
  }
  tbody tr:first-child td:first-child {
    border-top-left-radius: 3px;
  }
  tbody tr:first-child td:last-child {
    border-top-right-radius: 3px;
  }
  tbody tr:last-child td:first-child {
    border-bottom-left-radius: 3px;
  }
  tbody tr:last-child td:last-child {
    border-bottom-right-radius: 3px;
  }
`

const Table = ({ title, children }) => (
  <StyledTable>
    <thead>
      <tr>
        <th>
          <Text color={theme.textSecondary} smallcaps>
            {title}
          </Text>
        </th>
      </tr>
    </thead>
    <tbody>
      {children}
    </tbody>
  </StyledTable>
)

export default Table
