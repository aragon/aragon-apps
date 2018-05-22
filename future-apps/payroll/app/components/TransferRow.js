import React from 'react';
import styled from 'styled-components';
import copy from 'copy-to-clipboard';
import { format } from 'date-fns/esm';
import { TableRow, TableCell, ContextMenu, ContextMenuItem, SafeLink, formatHtmlDatetime, theme } from '@aragon/ui';
import provideNetwork from '../lib/provideNetwork';
import { formatTokenAmount } from '../lib/utils';
import IconTokens from './icons/IconTokens';

class TransferRow extends React.Component {
  handleCopyTransferUrl = () => {
    copy(
      'https://app.aragon.one/#/finance/finance?params=' +
        encodeURIComponent(
          JSON.stringify({
            transaction: this.props.transactionHash
          })
        )
    );
    this.setState({
      showCopyTransferMessage: true
    });
  };
  //   handleViewTransaction = () => {
  //       console.log('here2')
  //     const { network: { etherscanBaseUrl }, transactionHash } = this.props
  //     window.open(`${etherscanBaseUrl}/tx/${transactionHash}`, '_blank')
  //   }
  
  handleConfirmMessageDone = () => {
    this.setState({
      showCopyTransferMessage: false
    });
  };
  render() {
    const {
      amount,
      date,
      decimals,
      entity,
      isIncoming,
      reference,
      symbol,
      status,
      transactionHash,
      exchangeRate
    } = this.props;

    const dateObj = new Date(date*1000);

    const formattedAmount = formatTokenAmount(amount, isIncoming, decimals, true, { rounding: 5 });
    const formattedDate = formatHtmlDatetime(dateObj);

    return (
      <TableRow>
        <NoWrapCell>
          <time dateTime={formattedDate} title={formattedDate}>
            {format(dateObj, 'dd/MM/YY')}
          </time>
        </NoWrapCell>
        <NoWrapCell>
          <TextOverflow>{status}</TextOverflow>
        </NoWrapCell>
        <NoWrapCell>
          <TextOverflow>{transactionHash}</TextOverflow>
        </NoWrapCell>
        <NoWrapCell align="right">
          <Amount positive={true}>
            {amount} {symbol}
          </Amount>
        </NoWrapCell>
        <NoWrapCell align="right">
          <Exchange>
            {'$'}
            {exchangeRate}
          </Exchange>
        </NoWrapCell>
      </TableRow>
    );
  }
}

const NoWrapCell = styled(TableCell)`
  white-space: nowrap;
`;

const TextOverflow = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Amount = styled.span`
  font-weight: 600;
  color: ${({ positive }) => (positive ? theme.positive : theme.negative)};
`;

const Exchange = styled.span`
  font-weight: 600;
`;

const ActionsWrapper = styled.div`
  position: relative;
`;

const ActionLabel = styled.span`
  margin-left: 15px;
`;

const ConfirmMessageWrapper = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
`;

export default provideNetwork(TransferRow);
