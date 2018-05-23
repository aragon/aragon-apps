import React from 'react';
import { AragonApp, Button, Text, observe, AppBar, SidePanel, theme, Countdown, Info, DropDown } from '@aragon/ui';
import Aragon, { providers } from '@aragon/client';
import styled from 'styled-components';
import Transfers from './components/Transfers';
import { networkContextType } from './lib/provideNetwork';
import Holders from './screens/Holders'; //not working
import SideChart from './components/SideChart';
import AvaliableSalary from './components/AvailableSalary';
import './styles/datepicker.css';
import moment from 'moment';
import 'react-dates/initialize';
import SidePanelContent from './components/SidePanelContent';

const fiveDaysAgo = 1000 * 60 * 60 * 24 * 5;

const transactions = [
  {
    token: '0x00be01CAF657Ff277269f169bd5220A390f791f7',
    isIncoming: false,
    transactionHash: '0x09d846935dba964e33dcba4cd5',
    amount: 3.0,
    date: 1526978544,
    exchangeRate: 43.302,
    decimals: 4,
    entity: 'none',
    isIncoming: false,
    reference: 'none',
    status: 'Pending...',
    symbol: 'ETH'
  },
  {
    token: '0x00be01CAF657Ff277269f169bd5220A390f791f7',
    isIncoming: false,
    transactionHash: '0x09d846935dba964ebbdcba4cd5',
    amount: 32.4747,
    date: 1526632944,
    exchangeRate: 94.302,
    decimals: 4,
    entity: 'none',
    isIncoming: false,
    reference: 'none',
    status: 'Complete',
    symbol: 'ETH'
  },
  {
    token: '0x00be01CAF657Ff277269f169bd5220A390f791f7',
    isIncoming: false,
    transactionHash: '0x234846935dba964ebbdcba4cd5',
    amount: 103.1,
    date: 1522658544,
    decimals: 4,
    exchangeRate: 3.2,
    entity: 'none',
    isIncoming: false,
    reference: 'none',
    symbol: 'ANT',
    status: 'Complete'
  }
];

export default class App extends React.Component {
  constructor() {
    super();
    this.app = new Aragon(new providers.WindowMessage(window.parent));
    this.state$ = this.app.state();
  }

  state = {
    newTransferOpened: false,
    activeItem: 0
  };

  handleNewTransferOpen = () => {
    this.setState({ newTransferOpened: true });
  };
  handleNewTransferClose = () => {
    this.setState({ newTransferOpened: false });
  };

  render() {
    let { newTransferOpened } = this.state;
    return (
      <AragonApp>
        <Layout>
          <Layout.FixedHeader>
            <AppBar
              title="Payroll"
              endContent={
                <Button mode="strong">
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
                  targetDate={fiveDaysAgo}
                  avaliableBalance={5902.54}
                  totalTransfered={45352.27}
                  yrSalary={80000.0}
                />

                <SpacedBlock>
                  <Transfers transactions={transactions} />
                </SpacedBlock>
              </Content>
            </Layout.ScrollWrapper>
            <SideBarHolder>
              <SideChart
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
          <SidePanelContent />
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
