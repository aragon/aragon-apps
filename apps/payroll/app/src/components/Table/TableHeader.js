import PropTypes from 'prop-types'
import styled, { css } from 'styled-components'
import { TableHeader as BaseTableHeader, theme } from '@aragon/ui'

const TableHeader = styled(BaseTableHeader)`
  position: relative;
  padding-right: 21px;

  ${({ sortable, sortDirection }) =>
    sortable &&
    css`
      cursor: pointer;
      user-select: none;

      :before {
        position: absolute;
        content: '';
        right: 7px;
        top: calc(50% - 3px);
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-bottom: 4px solid ${theme.textSecondary};
        opacity: ${sortDirection < 0 ? 1 : 0.2};
      }

      :after {
        position: absolute;
        content: '';
        right: 7px;
        top: calc(50% + 3px);
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-top: 4px solid ${theme.textSecondary};
        opacity: ${sortDirection > 0 ? 1 : 0.2};
      }
    `}
`

TableHeader.propTypes = {
  sortable: PropTypes.bool,
  sortDirection: PropTypes.number,
}

TableHeader.defaultProps = {
  sortable: false,
  sortDirection: 0,
}

export default TableHeader
