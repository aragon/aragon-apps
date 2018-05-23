import React from 'react';
import styled from 'styled-components';
import { Text, theme, Button, Info, DropDown, TextInput, Slider } from '@aragon/ui';
import { sciNot } from '../math-utils';

class SidePanelContent extends React.Component {
  state = {
    tokenList: ['ETH', 'ANT', 'SNT'],
    distribution: [{ symbol: 'ETH', value: 0.5 }, { symbol: 'ANT', value: 0.5 }],
    activeItem: 0
  };

  handleSliderChange = (value, index) => {
    this.setState(({ distribution }) => {

      console.log("distribution", distribution)
      console.log({value});

      let d = this.updateDistributionValue(index, value, distribution);
      console.log('d', d);
      return { distribution: d };
    });
  };

  distributionPairs() {
    const { distribution } = this.state;
    const pairs = distribution.map(item => ({
      value: item.value,
      percentage: Math.round(item.value * 100),
      symbol: item.symbol
    }));

    // Add / remove the missing percentage after rounding the values
    pairs[0].percentage += pairs.reduce((total, { percentage }) => total - percentage, 100);
    return pairs;
  }

  // Update the distribution by changing one of the values
  updateDistributionValue(index, value, distribution) {
    // Other values than the one being directly updated

    console.log('updateDistributionValue', value);

    const othersTotal = distribution.reduce((total, { value }, i) => total + (i === index ? 0 : value), 0);

    const updateOtherValue = prevValue =>
      prevValue === 0 ? 0 : prevValue - (othersTotal + value - 1) * prevValue / othersTotal;

    return distribution.map((item, i) => ({ ...item, value: i === index ? value : updateOtherValue(item.value) }));
  }

  addToken() {
    //check if this symbol is already in the list/ if not then add it to the list with 0
    let tokenList = [...this.state.tokenList];
    let list = [...this.state.list];

    list.forEach(item => {
      let indexOfToken = tokenList.indexOf(item.symbol);

      if (indexOfToken !== -1) {
        tokenList.splice(indexOfToken, 1);
      }
    });

    if (tokenList.length) {
      list.push({ symbol: tokenList[0], value: 0 });
      this.setState({ list });
      return;
    }
    console.log('no more tokens');
  }

  handleUpdate = (index, value) => {
    const { distribution } = this.state;
    this.setState({
      distribution: this.updateDistributionValue(index, value, distribution)
    });
  };

  // add = () => {
  //   this.setState(({ distribution }) => ({
  //     distribution: this.updateDistributionValue(0, distribution[0], [...distribution, 0.1].slice(0, ROWS_MAX))
  //   }));
  // };

  //rename to token something
  handleChange(targetIndex, localTokenList) {
    let list = [...this.state.distribution];
    let indexToRemove;
    list = list.map((item, index) => {
      if (item.symbol == localTokenList[0]) {
        let obj = { ...item, symbol: localTokenList[targetIndex] };

        return obj;
      } else {
        return item;
      }
    });

    this.setState({ list });
  }

  getTokenList(symbol) {
    let list = this.state.distribution;
    let tokenList = [...this.state.tokenList];

    list.forEach(item => {
      let index = tokenList.indexOf(item.symbol);
      if (index !== -1) {
        tokenList.splice(index, 1);
      }
    });
    tokenList.unshift(symbol);

    return tokenList;
  }

  render() {
    const distributionPairs = this.distributionPairs();

    return (
      <Container>
        <Info.Action title="Choose which tokens you get paid in">
          You can add as many tokens as you like, as long as your DAO has these tokens.
        </Info.Action>
        <div>
          <SliderHeader>
            <Text color="textSecondary" smallcaps>
              token
            </Text>
            <Text style={{ textAlign: 'right' }} color="textSecondary" smallcaps>
              percentage
            </Text>
          </SliderHeader>
          {distributionPairs.map((item, index) => {
            let newTokenList = this.getTokenList(item.symbol);
            let tokenNumber = newTokenList.indexOf(item.symbol);
            console.log({item});
            return (
              <TokenInfo key={index}>
                <DropDown
                  items={newTokenList}
                  active={tokenNumber}
                  onChange={e => this.handleChange(e, newTokenList)}
                />
                <SliderWrapper
                  index={index}
                  onChange={this.handleSliderChange}
                  value={item.value}
                  percentage={item.percentage}
                />

                <TextInputWrapper>
                  <NumberInput id={index} type="text" value={item.value} onChange={e => this.updatePercent(e, index)} />
                </TextInputWrapper>
              </TokenInfo>
            );
          })}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end'
            }}
          >
            <Button mode="secondary" onClick={() => this.addToken()}>
              + New token
            </Button>
          </div>
        </div>

        <Info.Permissions title="Submission note">
          Your split contract will be updated on the blockchain, and you cannot request salary until it’s complete{' '}
        </Info.Permissions>

        <Button mode="strong">Submit split configuration</Button>
      </Container>
    );
  }
}

class SliderWrapper extends React.Component {
  handleChange = value => {
    console.log('value', value);
    this.props.onChange(value, this.props.id);
  };
  render() {
    const { value } = this.props;
    console.log("this is in render sW", this.props.value)
    return (
      <div>
        <Slider onUpdate={this.handleChange} value={value} />
      </div>
    );
  }
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 100px 380px 100px 50px;
  grid-gap: 30px;
`;

const TokenInfo = styled.div`
  display: grid;
  grid-template-columns: 75px auto 70px;
  align-self: center;

  height: 40px;
  margin-bottom: 32px;
`;

const TextInputWrapper = styled.div`
  display: inline-block;
  position: relative;
  height: 40px;
  &:after {
    content: '%';
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: #b3b3b3;
  }
`;

const NumberInput = styled(TextInput)`
  align-content: center;
  width: 70px;
  padding-left: 16px;
  height: 40px;
`;

const SliderHeader = styled.div`
  display: grid;
  grid-template-columns: auto auto;
  margin: 20px 0px 10px 0px;
`;

export default SidePanelContent;
