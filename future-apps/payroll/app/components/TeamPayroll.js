import React from "react";
import styled from "styled-components";
import EmployeesList from "./EmployeeList";
import KeyStats from "./KeyStats";
import "../styles/datepicker.css";
import "react-dates/initialize";
import TotalPayroll from "./TotalPayroll";

export class TeamPayroll extends React.Component {
  render() {
    const { employees, avgSalary, monthlyBurnRate, totalPaidThisYear } = this.props.totalPayroll;

    return (
      <GridLayout>
        <Layout.ScrollWrapper>
          <Content>
            {/* Total payroll */}
            <TotalPayroll
              numberOfEmployees={employees}
              avgSalary={avgSalary}
              monthlyBurnRate={monthlyBurnRate}
              totalPaidYr={totalPaidThisYear}
            />

            {/* Previous salary */}
            <EmployeesList
              transactions={this.props.transactions}
              handleEmployeeDetailsChange={this.props.handleEmployeeDetailsChange}
            />
          </Content>
        </Layout.ScrollWrapper>

        <SideBarHolder>
          <KeyStats paidSalaries={this.props.paidSalaries} openSlider={this.props.handleNewTransferOpen} />
        </SideBarHolder>
      </GridLayout>
    );
  }
}

export default TeamPayroll;

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

Layout.ScrollWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  overflow: auto;
  flex-grow: 1;
`;
