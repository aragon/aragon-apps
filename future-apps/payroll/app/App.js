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

export default class App extends React.Component {
  app = new Aragon(new providers.WindowMessage(window.parent));
  state$ = this.app.state();

  state = {
    newTransferOpened: false,
    empSliderOpen: false,
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

  handleEmpSlider = () => {
    let value = !this.state.empSliderOpen;
    this.setState({ empSliderOpen: value });
  };

  AppBarButtonClicked = () => {
    if (this.state.teamPayrollTab) {
      this.handleEmpSlider();
    }
    return;
  };

  render() {
    let { newTransferOpened, requestSalary, teamPayrollTab, empSliderOpen } = this.state;
    return (
      <AragonApp publicUrl="/aragon-ui">
        <Layout>
          <Layout.FixedHeader>
            <AppBarRedux
              title="Payroll"
              endContent={
                <Button onClick={this.AppBarButtonClicked} mode="strong">
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
          {teamPayrollTab ? (
            <TeamPayroll
              handleNewTransferOpen={this.handleNewTransferOpen}
              handleNewTransferClose={this.handleNewTransferClose}
              handleSidePanelChange={this.handleSidePanelChange}
            />
          ) : (
            <MyPayroll
              handleNewTransferClose={this.handleNewTransferClose}
              handleNewTransferOpen={this.handleNewTransferOpen}
              handleSidePanelChange={this.handleSidePanelChange}
            />
          )}
        </Layout>

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
