import React from "react";
import styled from "styled-components";
import Transfers from "./transfers/Transfers";
import SideChart from "./sides/SideChart";
import AvaliableSalary from "./AvailableSalary";
import "../styles/datepicker.css";
import "react-dates/initialize";

class MyPayroll extends React.Component {

  render() {
    return (
      <GridLayout>
        <Layout.ScrollWrapper>
          <Content>

            {/* Available salary */}
            <AvaliableSalary
             {...this.props.avaliableSalaryData}
            />

            {/* Previous salary */}
            <Transfers transactions={this.props.salaryTransactions} />
            
          </Content>
        </Layout.ScrollWrapper>
        
        <SideBarHolder>
          <SideChart
            {...this.props.salaryAllocData}
            openSlider={this.props.handleNewTransferOpen}
          />
        </SideBarHolder>              
      </GridLayout>
    );
  }
}


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
  min-width: 815px;
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


export default MyPayroll;

