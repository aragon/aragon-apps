import React from 'react';
import { AragonApp, Button, Text, observe, AppBar, SidePanel, theme, Countdown } from '@aragon/ui';
import Aragon, { providers } from '@aragon/client';
import styled from 'styled-components';
import Transfers from './components/Transfers'
import { networkContextType } from './lib/provideNetwork'


const DAY_IN_MS = 1000 * 60 * 60 * 24;
const endDate = new Date(Date.now() + 5 * DAY_IN_MS);

export default class App extends React.Component {
  constructor() {
    super();

    this.app = new Aragon(new providers.WindowMessage(window.parent));
    this.state$ = this.app.state();
  }

  state = {
    newTransferOpened: false
  };

  handleNewTransferOpen = () => {
    this.setState({ newTransferOpened: true });
  };
  handleNewTransferClose = () => {
    this.setState({ newTransferOpened: false });
  };

  render() {
    console.log(this.state.newTransferOpened);
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
          <Layout.ScrollWrapper>
            <Content>
              <Text size="large">Available salary</Text>
              <AvaliableSalaryTitleGrid>
                <HeaderCell style={{ marginLeft: '20px' }}>
                  <Text size="small" color={theme.textSecondary}>
                    TIME SINCE LAST SALARY
                  </Text>
                </HeaderCell>
                <HeaderCell>
                  <Text size="small" color={theme.textSecondary}>
                    AVALIABLE BALANCE
                  </Text>
                </HeaderCell>
                <HeaderCell>
                  <Text size="small" color={theme.textSecondary}>
                    TOTAL TRANSFERED
                  </Text>
                </HeaderCell>
                <HeaderCell>
                  <Text size="small" color={theme.textSecondary}>
                    YOUR YEARLY SALARY
                  </Text>
                </HeaderCell>

                <WhiteCell border="1px 0px 1px 1px" style={{ paddingLeft: '22px', paddingTop: '27px' }}>
                  <CountdownWStyle end={endDate} />
                </WhiteCell>
                <WhiteCell border="1px 0px 1px 0px">
                  <Text size="xxlarge" color="#21D48E">
                    +$6,245.52
                  </Text>
                </WhiteCell>
                <WhiteCell border="1px 0px 1px 0px">
                  <Text size="xxlarge">$45,352.27</Text>
                </WhiteCell>
                <WhiteCell border="1px 1px 1px 0px">
                  <Text size="xxlarge">$80,000</Text>
                </WhiteCell>
              </AvaliableSalaryTitleGrid>

               <SpacedBlock>
                {/* <Transfers transactions={transactions} tokens={tokens} /> */}
                <Transfers />
              </SpacedBlock>

              <PreviousSalaryGrid>
                <Text size="large">Previous salary</Text>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Text Text size="small" color={theme.textSecondary}>
                    DATE RANGE:
                  </Text>
                  <input  style={{marginLeft:'8px'}} placeholder='00/00/00 - 00/00/00' />
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Text Text size="small" color={theme.textSecondary}>
                    TOKEN:
                  </Text>
                  <select style={{marginLeft:'8px'}}>
                    <option value="all">All</option>
                    <option value="saab">Saab</option>
                    <option value="mercedes">Mercedes</option>
                    <option value="audi">Audi</option>
                  </select>
                </div>
              </PreviousSalaryGrid>

              <div>
                <ObservedCount observable={this.state$} />
                <Button onClick={() => this.app.decrement(1)}>Decrement</Button>
                <Button onClick={() => this.app.increment(1)}>Increment</Button>
              </div>
            </Content>
          </Layout.ScrollWrapper>
        </Layout>
        <SidePanel opened={newTransferOpened} onClose={this.handleNewTransferClose} title="New Transfer">
          {/* <NewTransfer opened={newTransferOpened} onClose={this.handleNewTransferClose} /> */}
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
`

const ListItem = styled.div`
  padding: 25px;
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
