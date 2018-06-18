import React from "react";
import {SidePanel } from "@aragon/ui";
import styled from "styled-components";
import EmployeesList from "./EmployeeList";
import KeyStats from "./KeyStats";

import "../styles/datepicker.css";
import "react-dates/initialize";
import SidePanelContent from "./SidePanelContent";
import TotalPayroll from "./TotalPayroll";
import AddEmpSlider from './AddEmpSlider'

const transactions = [
  {
    name: "Miles Davis",
    startDate: 1526632944,
    endDate: 1527742944,
    role: "CEO",
    salary: 80000,
    totalPaidYr: 54343.32,
    tx: 1
  },
  {
    name: "May Davis",
    startDate: 1526632944,
    endDate: 1527742944,
    role: "CFO",
    salary: 80000,
    totalPaidYr: 5343.32,
    tx: 2
  },
  {
    name: "John Davis",
    startDate: 1526632944,
    endDate: 1527742944,
    role: "CZO",
    salary: 80000,
    totalPaidYr: 343.32,
    tx: 3
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
            {/* Total payroll */}
            <TotalPayroll numberOfEmployees={9} avgSalary={80000.0} monthlyBurnRate={59994.94} totalPaidYr={11989.88} />

            {/* Previous salary */}
            <EmployeesList transactions={transactions} />
          </Content>
        </Layout.ScrollWrapper>


        <SideBarHolder>
          <KeyStats
            holders={[{ name: "ETH", balance: 1329 }, { name: "ANT", balance: 3321 }, { name: "SNT", balance: 1131 }]}
            tokenSupply={10000}
            tokenDecimalsBase={5}
            openSlider={this.props.handleNewTransferOpen}
          />
        </SideBarHolder>

        {/* <AddEmpSlider
          opened={newTransferOpened}
          onClose={this.props.handleNewTransferClose}
          title={requestSalary ? "Request salary" : "Edit salary allocation"}
        >
          <SidePanelContent
            requestSalary={this.state.requestSalary}
            handleSidePanelChange={this.props.handleSidePanelChange}
          />
        </AddEmpSlider> */}
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
