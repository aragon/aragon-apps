import React from "react";
import { AragonApp, Button, Text, AppBar, SidePanel } from "@aragon/ui";
import Aragon, { providers } from "@aragon/client";
import styled from "styled-components";
import Transfers from "./Transfers";
import SideChart from "./SideChart";
import AvaliableSalary from "./AvailableSalary";
import "../styles/datepicker.css";
import "react-dates/initialize";
import SidePanelContent from "./SidePanelContent";
import TotalPayroll from "./TotalPayroll";

const fiveDaysAgo = 1000 * 60 * 60 * 24 * 5;

const transactions = [
  {
    token: "0x00be01CAF657Ff277269f169bd5220A390f791f7",
    transactionHash: "0x09d846935dba964e33dcba4cd5",
    amount: 3.0,
    date: 1526978544,
    exchangeRate: 620.23,
    decimals: 2,
    entity: "none",
    isIncoming: true,
    reference: "none",
    status: "Pending...",
    symbol: "ETH"
  },
  {
    token: "0x00be01CAF657Ff277269f169bd5220A390f791f7",
    transactionHash: "0x09d846935dba964ebbdcba4cd5",
    amount: 32.4747,
    date: 1526632944,
    exchangeRate: 620.23,
    decimals: 4,
    entity: "none",
    isIncoming: true,
    reference: "none",
    status: "Complete",
    symbol: "ETH"
  },
  {
    token: "0x00be01CAF657Ff277269f169bd5220A390f791f7",
    transactionHash: "0x234846935dba964ebbdcba4cd5",
    amount: 103.1,
    date: 1522658544,
    decimals: 4,
    exchangeRate: 6.23,
    entity: "none",
    isIncoming: true,
    reference: "none",
    symbol: "ANT",
    status: "Complete"
  }
];

export class TeamPayroll extends React.Component {
  state = {
    newTransferOpened: false,
    requestSalary: false,
    teamPayrollTab: false
  };

  render() {
    let { newTransferOpened, requestSalary, teamPayrollTab } = this.state;

    return (
      <GridLayout>
        <Layout.ScrollWrapper>
          <Content>
            {/* Available salary */}
            <AvaliableSalary
              targetDate={fiveDaysAgo}
              avaliableBalance={5902.54}
              totalTransfered={45352.27}
              yrSalary={80000.0}
            />

            {/* Previous salary */}
            <Transfers transactions={transactions} />
          </Content>
        </Layout.ScrollWrapper>
        <SideBarHolder>
          <SideChart
            holders={[{ name: "ETH", balance: 1329 }, { name: "ANT", balance: 3321 }, { name: "SNT", balance: 1131 }]}
            tokenSupply={10000}
            tokenDecimalsBase={5}
            openSlider={this.props.handleNewTransferOpen}
          />
        </SideBarHolder>

        <SidePanel
          opened={newTransferOpened}
          onClose={this.props.handleNewTransferClose}
          title={requestSalary ? "Request salary" : "Edit salary allocation"}
        >
          <SidePanelContent
            requestSalary={this.state.requestSalary}
            handleSidePanelChange={this.props.handleSidePanelChange}
          />
        </SidePanel>
      </GridLayout>
    );
  }
}

export default TeamPayroll;

const Tabs = styled.div`
  border-bottom: ${props => (props.teamPayrollTab ? "4px solid #1dd9d5" : "")};
  text-align: center;
  font-weight: ${props => (props.teamPayrollTab ? "bold" : "400")};
  height: 30px;
`;

const TabGrid = styled.div`
  display: grid;
  grid-template-columns: auto auto 5fr;
  padding-left: 31px;
  background-color: white;
  grid-gap: 30px;
`;

const SideBarHolder = styled.div`
  margin-right: 50px;
  margin-top: 25px;
  margin-left: -10px;
`;

const Layout = styled.div`
  display: flex;
  height: 100vh;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
`;

const GridLayout = styled.div`
  display: grid;
  height: 100vh;
  grid-template-columns: 2fr auto;
`;
const Content = styled.div`
  padding: 30px;
`;

Layout.FixedHeader = styled.div`
  flex-shrink: 0;
`;

Layout.ScrollWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  overflow: auto;
  flex-grow: 1;
`;
