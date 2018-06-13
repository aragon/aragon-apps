import React from "react";
import { AragonApp, Button, Text, AppBar, SidePanel } from "@aragon/ui";
import Aragon, { providers } from "@aragon/client";
import styled from "styled-components";
import Transfers from "./components/Transfers";
import { networkContextType } from "./lib/provideNetwork";
import SideChart from "./components/SideChart";
import AvaliableSalary from "./components/AvailableSalary";
import "./styles/datepicker.css";
import "react-dates/initialize";
import SidePanelContent from "./components/SidePanelContent";
import TeamPayroll from "./components/TeamPayroll";

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

export default class App extends React.Component {
  app = new Aragon(new providers.WindowMessage(window.parent));
  state$ = this.app.state();

  state = {
    newTransferOpened: false,
    activeItem: 0,
    requestSalary: false,
    teamPayrollTab: false
  };

  handleNewTransferOpen = () => {
    this.setState({ newTransferOpened: true });
  };
  handleNewTransferClose = () => {
    this.setState({ newTransferOpened: false });
  };

  handleSidePanelChange = () => {
    let value = !this.state.requestSalary;
    this.setState({ requestSalary: value });
  };

  handleTabChange = bool => {
    this.setState({ teamPayrollTab: bool });
  };

  render() {
    let { newTransferOpened, requestSalary, teamPayrollTab } = this.state;
    return (
      <AragonApp publicUrl="/aragon-ui">
        <Layout>
          <Layout.FixedHeader>
            <AppBarRedux title="Payroll" endContent={<Button mode="strong">Request salary</Button>} />
            <TabGrid>
              <Tabs teamPayrollTab={!teamPayrollTab} onClick={() => this.handleTabChange(false)}>
                <div>My payroll</div>
              </Tabs>
              <Tabs teamPayrollTab={teamPayrollTab} onClick={() => this.handleTabChange(true)}>
                <div>Team payroll</div>
              </Tabs>
            </TabGrid>
          </Layout.FixedHeader>
          {teamPayrollTab ? (
            <TeamPayroll />
          ) : (
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
                  holders={[
                    { name: "ETH", balance: 1329 },
                    { name: "ANT", balance: 3321 },
                    { name: "SNT", balance: 1131 }
                  ]}
                  tokenSupply={10000}
                  tokenDecimalsBase={5}
                  openSlider={this.handleNewTransferOpen}
                />
              </SideBarHolder>
            </GridLayout>
          )}
        </Layout>

        <SidePanel
          opened={newTransferOpened}
          onClose={this.handleNewTransferClose}
          title={requestSalary ? "Request salary" : "Edit salary allocation"}
        >
          <SidePanelContent
            requestSalary={this.state.requestSalary}
            handleSidePanelChange={this.handleSidePanelChange}
          />
        </SidePanel>
      </AragonApp>
    );
  }
}

const SpacedBlock = styled.div`
  margin-top: 30px;
  &:first-child {
    margin-top: 0;
  }
`;

const AppBarRedux = styled(AppBar)`
  border-bottom: none;
`;

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
  border-bottom: .5px solid #e8e8e8
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
