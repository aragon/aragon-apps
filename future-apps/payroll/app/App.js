import React from "react";
import { AragonApp, SidePanel } from "@aragon/ui";
import Aragon, { providers } from "@aragon/client";
import styled from "styled-components";
import "./styles/datepicker.css";
import "react-dates/initialize";
import SidePanelContent from "./components/sidepanels/salary/SidePanelContent";
import TeamPayroll from "./components/team-payroll/TeamPayroll";
import MyPayroll from "./components/my-payroll/MyPayroll";
import SidePanelEmpAdd from "./components/sidepanels/employee/SidePanelEmpAdd";
import HeaderEmployeeDetails from "./components/headers/HeaderEmployeeDetails";
import Header from "./components/headers/Header";

import {
  employees,
  totalPayroll,
  paidSalaries,
  salaryTransactions,
  avaliableSalaryData,
  salaryAllocData
} from "./mockData";

class App extends React.Component {
  state = {
    newTransferOpened: false,
    empSliderOpen: false,
    activeItem: 0,
    requestSalary: false,
    teamPayrollTab: false,
    employeeDetails: false
  };

  async componentDidMount() {
    try {
      let response = await fetch("http://ppf.aragon.one/api/rates");
      console.error(response);
    } catch (error) {
      console.error(error);
    }
  }

  handleNewTransferOpen = () => {
    this.setState({ newTransferOpened: true });
  };
  handleNewTransferClose = () => {
    this.setState({ newTransferOpened: false });
  };

  handleSidePanelChange = () => {
    this.setState({ requestSalary: !this.state.requestSalary });
  };

  handleTabChange = bool => {
    this.setState({ teamPayrollTab: bool });
  };

  handleEmpSlider = () => {
    this.setState({ empSliderOpen: !this.state.empSliderOpen });
  };

  navbarButtonClicked = () => {
    if (this.state.teamPayrollTab) {
      this.handleEmpSlider();
    }
  };

  handleEmployeeDetailsChange = () => {
    this.setState({ employeeDetails: !this.state.employeeDetails });
  };

  render() {
    let { newTransferOpened, requestSalary, teamPayrollTab, empSliderOpen, employeeDetails } = this.state;
    return (
      <AragonApp publicUrl="/aragon-ui/">
        {/* header display */}
        {employeeDetails ? (
          <HeaderEmployeeDetails handleEmployeeDetailsChange={this.handleEmployeeDetailsChange} />
        ) : (
          <Layout>
            <Header
              teamPayrollTab={teamPayrollTab}
              handleTabChange={this.handleTabChange}
              navbarButtonClicked={this.navbarButtonClicked}
            />

            {/* page content */}
            {teamPayrollTab ? (
              <TeamPayroll
                paidSalaries={paidSalaries}
                totalPayroll={totalPayroll}
                transactions={employees}
                handleNewTransferOpen={this.handleNewTransferOpen}
                handleEmployeeDetailsChange={this.handleEmployeeDetailsChange}
              />
            ) : (
              <MyPayroll
                salaryAllocData={salaryAllocData}
                avaliableSalaryData={avaliableSalaryData}
                salaryTransactions={salaryTransactions}
                handleNewTransferOpen={this.handleNewTransferOpen}
              />
            )}
          </Layout>
        )}

        {/* sidepanel content */}
        <SidePanel
          opened={newTransferOpened}
          onClose={this.handleNewTransferClose}
          title={requestSalary ? "Request salary" : "Edit salary allocation"}
        >
          <SidePanelContent requestSalary={requestSalary} handleSidePanelChange={this.handleSidePanelChange} />
        </SidePanel>

        <SidePanel opened={empSliderOpen} onClose={this.handleEmpSlider} title="Add new employee">
          <SidePanelEmpAdd requestSalary={requestSalary} handleSidePanelChange={this.handleEmpSlider} />
        </SidePanel>
      </AragonApp>
    );
  }
}

const Layout = styled.div`
  display: flex;
  height: 100vh;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
`;


export default App;
