import React from 'react';
import styled from 'styled-components';
import { Text, theme, Button, Info, DropDown,TextInput } from '@aragon/ui';
import { sciNot } from '../math-utils';

class SidePanelContent extends React.Component {
  state = {
    tokenList: ['ETH', 'ANT', 'SNT'],
    list: [{ symbol: 'ETH', percentage: 50 }, { symbol: 'ANT', percentage: 50 }],
    activeItem: 0
  };

  handleChange(index) {
    //check if this symbol is already in the list/ if not then add it to the list with 0
    let symbol = this.state.tokenList[index];
    let taken = false;
    let list = this.state.list;
    list.forEach(item => {
      if (item.symbol == symbol) taken = true;
    });

    if (!taken) {
      list.push({ symbol, percentage: 0 });
      this.setState({ list });
    } else {
    }
  }

  updatePercent(e, i) {
    let list = this.state.list;
    let prevVal = list[i].percentage;
    list[i].percentage = e.target.value;

    let increase;
    if (prevVal < e.target.value) {
      increase = true;
    } else {
      increase = false;
    }

    let split = list.length - 1;
    // list.forEach((item, index) => {
    //   if (i !== index) {
    //     if (increase) {
    //       item.percentage -= 1 / split;
    //     } else {
    //       item.percentage += 1 / split;
    //     }
    //   }
    // });

    this.setState({ list });
  }

  getTokenList(list, symbol) {
    let tokenList = [...this.state.tokenList];

    list.forEach(item => {
      let index = tokenList[item.symbol];
      if (index !== -1) {
        tokenList.splice(index, 1);
      }
    });

    tokenList.unshift(symbol);

    return tokenList;
  }

  render() {
    return (
      <Container>
        <Info.Action title="Choose which tokens you get paid in">
          You can add as many tokens as you like, as long as your DAO has these tokens.
        </Info.Action>

        {this.state.list.map((item, index) => {
          let newTokenList = this.getTokenList(this.state.list, item.symbol);
          let tokenNumber = newTokenList.indexOf(item.symbol);

          return (
            <TokenInfo>
              <DropDown items={newTokenList} active={tokenNumber} onChange={this.handleChange} />

              <input
                id={index}
                value={this.state.list[index].percentage}
                onChange={e => this.updatePercent(e, index)}
                type="range"
              />
              <TextInput
                id={index}
                type="text"
                value={this.state.list[index].percentage}
                onChange={e => this.updatePercent(e, index)}
              />
            </TokenInfo>
          );
        })}

        <DropDown
          mode="secondary"
          items={this.state.tokenList}
          active={this.state.activeItem}
          onChange={e => this.handleChange(e)}
        />

        <Info.Permissions title="Submission note">
          Your split contract will be updated on the blockchain, and you cannot request salary until it’s complete{' '}
        </Info.Permissions>

        <Button mode="strong">Submit split configuration</Button>
      </Container>
    );
  }
}

const Container = styled.div`
  height: 100vh;
  display: grid;
`;

const TokenInfo = styled.div`
  display: flex;
  align-self: center;
  flex-direction: row;
`;

const NumberInput = styled(TextInput)`
align-content: center;
width: 70px;
padding-left: 15px;
`

export default SidePanelContent;
