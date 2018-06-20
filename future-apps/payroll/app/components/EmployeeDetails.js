import React from "react";
import styled from "styled-components";
import { Slider } from "@aragon/ui";
import EmployeesList from "./EmployeeList";

const transactions = [
  {
    name: "Miles Davis",
    startDate: 1526632944,
    endDate: 1527742944,
    role: "CEO",
    salary: 80000,
    totalPaidYr: 54343.32,
    tx: 1
  }
];

class EmployeeDetails extends React.Component {
  render() {
    return (
      <GridLayout>
        <Layout.ScrollWrapper>
          <Content>
            <EmployeesList transactions={transactions}  noHeader={this.props.noHeader} />
          </Content>
        </Layout.ScrollWrapper>
      </GridLayout>
    );
  }
}

export default EmployeeDetails;

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
