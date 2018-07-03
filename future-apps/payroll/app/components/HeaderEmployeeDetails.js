import React from "react";
import { Button, AppBar } from "@aragon/ui";
import EmployeeDetails from "./EmployeeDetails";
import styled from "styled-components";

class HeaderEmployeeDetails extends React.Component {
  render() {
    return (
      <Layout>
        <Layout.FixedHeader>
          <AppBar
            title="Payroll"
            endContent={
              <Button onClick={this.props.handleEmployeeDetailsChange} mode="strong">
                {"Back"}
              </Button>
            }
          >
            Employee details
          </AppBar>
        </Layout.FixedHeader>
        <EmployeeDetails noHeader={true} />
      </Layout>
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

export default HeaderEmployeeDetails;
