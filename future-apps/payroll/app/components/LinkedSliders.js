import React from "react";
import styled from "styled-components";
import { Text, theme, Button, Info, DropDown, TextInput, Slider } from "@aragon/ui";
import PercentageRow from "./PercentageRow";

const ROWS_MIN = 2;
const ROWS_MAX = 7;

class LinkedSliders extends React.Component {
  state = {
    tokenList: ["ETH", "ANT", "SNT", "WOW", "XHR", "DEX", "YYY"],
    distribution: [{ symbol: "ETH", value: 0.2 }, { symbol: "WOW", value: 0.3 }, { symbol: "ANT", value: 0.5 }]
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

  handleUpdate = (index, value) => {
    const { distribution } = this.state;

    let newDistro = this.updateDistributionValue(index, value, distribution);

    this.setState({
      distribution: newDistro
    });
  };

  // Update the distribution by changing one of the values
  updateDistributionValue(index, value, distribution) {
    // Other values than the one being directly updated

    const othersTotal = distribution.reduce((total, { value }, i) => total + (i === index ? 0 : value), 0);

    const updateOtherValue = prevValue => {
      return prevValue === 0 ? 0 : prevValue - ((othersTotal + value - 1) * prevValue) / othersTotal;
    };

    return distribution.map((item, i) => {
      return { ...item, value: i === index ? value : updateOtherValue(item.value) };
    });
  }

  addToken = () => {
    //check if this symbol is already in the list/ if not then add it to the list with 0
    let tokenList = [...this.state.tokenList];
    let distribution = [...this.state.distribution];

    distribution.forEach(item => {
      let indexOfToken = tokenList.indexOf(item.symbol);
      if (indexOfToken !== -1) {
        tokenList.splice(indexOfToken, 1);
      }
    });

    if (tokenList.length) {
      distribution.push({ symbol: tokenList[0], value: 0 });
      this.setState({ distribution });
      return;
    }
  };

  // add = () => {
  //   this.setState(({ distribution }) => ({
  //     distribution: this.updateDistributionValue(0, distribution[0], [...distribution, 0.1].slice(0, ROWS_MAX))
  //   }));
  // };

  // remove = () => {
  //   this.setState(({ distribution }) => ({
  //     distribution: this.updateDistributionValue(0, distribution[0], [
  //       ...distribution.slice(0, ROWS_MIN),
  //       ...distribution.slice(ROWS_MIN, -1)
  //     ])
  //   }));
  // };

  //rename to token something
  handleChange(targetIndex, localTokenList) {
    let distribution = [...this.state.distribution];

    distribution = distribution.map(item => {
      if (item.symbol == localTokenList[0]) {
        let obj = { ...item, symbol: localTokenList[targetIndex] };
        return obj;
      } else {
        return item;
      }
    });

    this.setState({ distribution });
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
      <div>
        <SliderHeader>
          <Text color="textSecondary" smallcaps>
            token
          </Text>
          <Text style={{ textAlign: "right" }} color="textSecondary" smallcaps>
            percentage
          </Text>
        </SliderHeader>
        <ScrollBox>
          {distributionPairs.map((item, index) => {
            let newTokenList = this.getTokenList(item.symbol);
            let tokenNumber = newTokenList.indexOf(item.symbol);
            return (
              <TokenInfo key={index}>
                <div>
                  <DropDown wide
                    items={newTokenList}
                    active={tokenNumber}
                    onChange={e => this.handleChange(e, newTokenList)}
                  />
                </div>

                <PercentageRow
                  key={index}
                  index={index}
                  value={item.value}
                  percentage={item.percentage}
                  onUpdate={this.handleUpdate}
                />

                <TextInputWrapper>
                  <NumberInput
                    id={index}
                    type="text"
                    value={item.percentage}
                    onChange={e => this.updatePercent(e, index)}
                  />
                </TextInputWrapper>
              </TokenInfo>
            );
          })}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end"
            }}
          >
            <Button mode="secondary" onClick={() => this.addToken()}>
              + New token
            </Button>
          </div>
        </ScrollBox>
      </div>
    );
  }
}

const ScrollBox = styled.div`
  overflow-y: scroll;
  height: 90%;
`;

const SliderHeader = styled.div`
  display: grid;
  grid-template-columns: auto auto;
  margin: 20px 0px 10px 0px;
`;

const TokenInfo = styled.div`
  display: grid;
  grid-template-columns: 85px auto 70px;
  align-self: center;

  height: 40px;
  margin-bottom: 32px;
`;

const TextInputWrapper = styled.div`
  display: inline-block;
  position: relative;
  height: 40px;
  &:after {
    content: "%";
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

const DropDownWidth = styled(DropDown)`
  width: 100%;
  display:block;
`;

export default LinkedSliders;
