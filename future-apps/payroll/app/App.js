import React from 'react';
import { AragonApp, Button, Text, observe, AppBar, SidePanel, theme, Countdown, Info, DropDown } from '@aragon/ui';
import Aragon, { providers } from '@aragon/client';
import styled from 'styled-components';
import Transfers from './components/Transfers';
import { networkContextType } from './lib/provideNetwork';
import Holders from './screens/Holders'; //not working
import SideBar2 from './components/SideBar2';
import AvaliableSalary from './components/AvailableSalary';
import './styles/datepicker.css';

import 'react-dates/initialize';

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const endDate = new Date(Date.now() + 5 * DAY_IN_MS);

export default class App extends React.Component {
  constructor() {
    super();

    this.app = new Aragon(new providers.WindowMessage(window.parent));
    this.state$ = this.app.state();
  }

  state = {
    newTransferOpened: false,
    activeItem: 0,
    items: ['Wandering Thunder', 'Black Wildflower', 'Ancient Paper']
  };

  handleNewTransferOpen = () => {
    this.setState({ newTransferOpened: true });
  };
  handleNewTransferClose = () => {
    this.setState({ newTransferOpened: false });
  };

  handleChange(index) {
    this.setState({ activeItem: index });
  }

  render() {
    let { newTransferOpened } = this.state;
    return (
      <AragonApp>
        <Layout>
          <Layout.FixedHeader>
            <AppBar
              title="Payroll"
              endContent={
                <Button mode="strong" onClick={this.handleNewTransferOpen}>
                  Request salary
                </Button>
              }
            />
          </Layout.FixedHeader>
          <GridLayout>
            <Layout.ScrollWrapper>
              <Content>
                <Text size="large">Available salary</Text>

                <AvaliableSalary
                  endDate={endDate}
                  avaliableBalance={'5,902.54'}
                  totalTransfered={'45,352.27'}
                  yrSalary={'80,000'}
                />

                <SpacedBlock>
                  {/* <Transfers transactions={transactions} tokens={tokens} /> */}
                  <Transfers />
                </SpacedBlock>
              </Content>
            </Layout.ScrollWrapper>
            <SideBarHolder>
              <SideBar2
                holders={[
                  { name: 'ETH', balance: 1329 },
                  { name: 'ANT', balance: 3321 },
                  { name: 'SNT', balance: 1131 }
                ]}
                tokenSupply={10000}
                tokenDecimalsBase={5}
                openSlider={this.handleNewTransferOpen}
              />
            </SideBarHolder>
          </GridLayout>
        </Layout>

        <SidePanel opened={newTransferOpened} onClose={this.handleNewTransferClose} title="Edit salary allocation">
          <Info.Action title="Choose which tokens you get paid in">
            You can add as many tokens as you like, as long as your DAO has these tokens.
          </Info.Action>

          <DropDown items={this.state.items} active={this.state.activeItem} onChange={this.handleChange} />
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

const ListItem = styled.div`
  padding: 25px;
`;

const SideBarHolder = styled.div`
  margin-right: 50px;
  margin-top: 25px;
  margin-left: -10px;
`;

const List = styled.div`
  display: flex;
  list-style: none;
  padding: 0 10px;
  background-color: white;
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

const Title = styled(Text)`
  margin-top: 10px;
  margin-bottom: 20px;
  font-weight: 600;
`;

const AvaliableSalaryTitleGrid = styled.div`
  margin-top: 15px;
  display: grid;
  grid-template-columns: auto auto auto auto;
  grid-template-rows: auto;
`;

const PreviousSalaryGrid = styled.div`
  margin-top: 15px;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
`;

const WhiteCell = styled.div`
  background-color: white;
  padding: 20px 0px 20px 0px;

  border: solid #e8e8e8 0px;
  border-width: ${props => props.border};
`;

const HeaderCell = styled.div`
  margin-bottom: 8px;
`;

const CountdownWStyle = styled(Countdown)`
  display: flex;
  margin-top: 10px;
`;

const ObservedCount = observe(state$ => state$, { count: 0 })(({ count }) => (
  <Text.Block style={{ textAlign: 'center' }} size="xxlarge">
    {count}
  </Text.Block>
));
