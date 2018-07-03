import React from "react";
import { Button, AppBar } from "@aragon/ui";
import styled from "styled-components";

class Header extends React.Component {
  render() {
    let { teamPayrollTab } = this.props;

    return (
      <Layout.FixedHeader>
        <AppBarRedux
          title="Payroll"
          endContent={
            <Button onClick={this.props.navbarButtonClicked} mode="strong">
              {teamPayrollTab ? "Add new employee" : "Request salary"}
            </Button>
          }
        />
        <TabGrid>
          <Tabs teamPayrollTab={!teamPayrollTab} onClick={() => this.props.handleTabChange(false)}>
            <div>My payroll</div>
          </Tabs>
          <Tabs teamPayrollTab={teamPayrollTab} onClick={() => this.props.handleTabChange(true)}>
            <div>Team payroll</div>
          </Tabs>
        </TabGrid>
      </Layout.FixedHeader>
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

Layout.FixedHeader = styled.div`
  flex-shrink: 0;
`;

const AppBarRedux = styled(AppBar)`
  border-bottom: none;
`;

const Tabs = styled.div`
  border-bottom: ${props => (props.teamPayrollTab ? "4px solid #1dd9d5" : "")};
  text-align: center;
  font-weight: ${props => (props.teamPayrollTab ? "bold" : "400")};
  height: 30px;
  cursor: pointer;
`;

const TabGrid = styled.div`
  display: grid;
  grid-template-columns: auto auto 5fr;
  padding-left: 31px;
  background-color: white;
  grid-gap: 30px;
  border-bottom: 0.5px solid #e8e8e8;
`;

export default Header;
