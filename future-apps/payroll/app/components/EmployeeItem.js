import React from "react";
import styled from "styled-components";
import copy from "copy-to-clipboard";
import { format } from "date-fns/esm";
import { TableRow, TableCell, formatHtmlDatetime, theme, IconTime, IconCheck } from "@aragon/ui";
import provideNetwork from "../lib/provideNetwork";
import { formatTokenAmount } from "../lib/utils";

class EmployeeItem extends React.Component {
  splitAmount = amount => {
    const [integer, fractional] = formatTokenAmount(amount).split(".");
    return (
      <span>
        <span className="integer">{integer}</span>
        {fractional && <span className="fractional">.{fractional}</span>}
      </span>
    );
  };

  render() {
    const { name, startDate, endDate, role, salary, totalPaidYr, tx } = this.props;

    const dateObj = new Date(startDate * 1000);
    const formattedDate = formatHtmlDatetime(dateObj);

    const dateObjEnd = new Date(endDate * 1000);
    const formattedDateEnd = formatHtmlDatetime(dateObj);

    console.log("props", this.props);
    return (
      <TableRow onClick={this.props.handleEmployeeDetailsChange}>
        <NoWrapCell>
          <TextOverflow>{name}</TextOverflow>
        </NoWrapCell>
        <NoWrapCell>
          <time dateTime={formattedDate} title={formattedDate}>
            {format(dateObj, "dd/MM/YY")}
          </time>
        </NoWrapCell>
        <NoWrapCell>
          <time dateTime={formattedDateEnd} title={formattedDateEnd}>
            {format(dateObjEnd, "dd/MM/YY")}
          </time>
        </NoWrapCell>
        <NoWrapCell>
          <TextOverflow>{role}</TextOverflow>
        </NoWrapCell>
        <NoWrapCell align="right">
          <Exchange>${this.splitAmount(salary.toFixed(2))}</Exchange>
        </NoWrapCell>
        <NoWrapCell align="right">
          <Exchange>${this.splitAmount(totalPaidYr.toFixed(2))}</Exchange>
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
  font-weight: 400;
`;

const StatusStyle = styled.div`
  margin-left: 5px;
`;

const StatusHolder = styled.div`
  display: flex;
  align-items: center;
`;

export default provideNetwork(EmployeeItem);
