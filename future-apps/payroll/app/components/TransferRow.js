import React from "react";
import styled from "styled-components";
import copy from "copy-to-clipboard";
import { format } from "date-fns/esm";
import {
  TableRow,
  TableCell,
  formatHtmlDatetime,
  theme,
  IconTime,
  IconCheck
} from "@aragon/ui";
import provideNetwork from "../lib/provideNetwork";
import { formatTokenAmount } from "../lib/utils";

class TransferRow extends React.Component {
  handleCopyTransferUrl = () => {
    copy(
      "https://app.aragon.one/#/finance/finance?params=" +
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

  
  handleConfirmMessageDone = () => {
    this.setState({
      showCopyTransferMessage: false
    });
  };
  render() {
    const {
      amount,
      date,      
      symbol,
      status,
      transactionHash,
      exchangeRate
    } = this.props;

    const dateObj = new Date(date * 1000);

    
    const formattedDate = formatHtmlDatetime(dateObj);

    return (
      <TableRow>
        <NoWrapCell>
          <time dateTime={formattedDate} title={formattedDate}>
            {format(dateObj, "dd/MM/YY")}
          </time>
        </NoWrapCell>
        <NoWrapCell>
          <TextOverflow>
            <StatusHolder>
              {status == "Complete" ? <IconCheck /> : <IconTime style={{ marginTop: "-2px" }} />}
              <StatusStyle>{status}</StatusStyle>
            </StatusHolder>
          </TextOverflow>
        </NoWrapCell>
        <NoWrapCell>
          <TextOverflow>{transactionHash}</TextOverflow>
        </NoWrapCell>
        <NoWrapCell align="right">
          <Amount positive={true}>
            +{amount} {symbol}
          </Amount>
        </NoWrapCell>
        <NoWrapCell align="right">
          <Exchange>
            {"$"}
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
  color: ${({ positive }) => (positive ? theme.positive : theme.negative)};
`;

const Exchange = styled.span`
  font-weight: 600;
`;

const StatusStyle = styled.div`
  margin-left: 5px;
`;

const StatusHolder = styled.div`
  display: flex;
  align-items: center;
`;

export default provideNetwork(TransferRow);
