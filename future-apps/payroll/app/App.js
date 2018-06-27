import React from "react";
import { AragonApp, Button, Text, AppBar, SidePanel } from "@aragon/ui";
import Aragon, { providers } from "@aragon/client";
import styled from "styled-components";
import "./styles/datepicker.css";
import "react-dates/initialize";
import SidePanelContent from "./components/SidePanelContent";
import TeamPayroll from "./components/TeamPayroll";
import MyPayroll from "./components/MyPayroll";
import SidePanelEmpAdd from "./components/SidePanelEmpAdd";
import EmployeeDetails from "./components/EmployeeDetails";
import axios from "axios";
import { Employees } from "./mockData";

export default class App extends React.Component {
  app = new Aragon(new providers.WindowMessage(window.parent));
  state$ = this.app.state();

  state = {
    newTransferOpened: false,
    empSliderOpen: false,
    activeItem: 0,
    requestSalary: false,
    teamPayrollTab: false,
    employeeDetails: false,
    noHeader: false
  };

  async componentDidMount() {
    // let test = await axios.get("http://ppf.aragon.one/api/rates");
    // console.log("test", test);
  }

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

  handleEmpSlider = () => {
    let value = !this.state.empSliderOpen;
    this.setState({ empSliderOpen: value });
  };

  appbarButtonClicked = () => {
    if (this.state.teamPayrollTab) {
      this.handleEmpSlider();
    }
    return;
  };

  handleEmployeeDetailsChange = () => {
    let value = !this.state.employeeDetails;

    this.setState({ employeeDetails: value });
  };

  render() {
    let { newTransferOpened, requestSalary, teamPayrollTab, empSliderOpen, employeeDetails, noHeader } = this.state;
    return (
      <AragonApp publicUrl="/aragon-ui">
        {/* header display */}
        {employeeDetails ? (
          <Layout>
            <Layout.FixedHeader>
              <AppBar
                title="Payroll"
                endContent={
                  <Button onClick={this.handleEmployeeDetailsChange} mode="strong">
                    {"Back"}
                  </Button>
                }
              >
                Employee details
              </AppBar>
            </Layout.FixedHeader>
            <EmployeeDetails noHeader={true} />
          </Layout>
        ) : (
          <Layout>
            <Layout.FixedHeader>
              <AppBarRedux
                title="Payroll"
                endContent={
                  <Button onClick={this.appbarButtonClicked} mode="strong">
                    {teamPayrollTab ? "Add new employee" : "Request salary"}
                  </Button>
                }
              />
              <TabGrid>
                <Tabs teamPayrollTab={!teamPayrollTab} onClick={() => this.handleTabChange(false)}>
                  <div>My payroll</div>
                </Tabs>
                <Tabs teamPayrollTab={teamPayrollTab} onClick={() => this.handleTabChange(true)}>
                  <div>Team payroll</div>
                </Tabs>
              </TabGrid>
            </Layout.FixedHeader>

            {/* page content */}
            {teamPayrollTab ? (
              <TeamPayroll
                transactions={Employees}
                handleNewTransferOpen={this.handleNewTransferOpen}
                handleEmployeeDetailsChange={this.handleEmployeeDetailsChange}
              />
            ) : (
              <MyPayroll handleNewTransferOpen={this.handleNewTransferOpen} />
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
  border-bottom: 0.5px solid #e8e8e8;
`;

const Layout = styled.div`
  display: flex;
  height: 100vh;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
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
