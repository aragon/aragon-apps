import React from "react";
import styled from "styled-components";
import { Text, Button, Info, TextInput, IconFundraising, theme, IconTime } from "@aragon/ui";
import "react-dates/initialize";
import { SingleDatePicker } from "react-dates";
import calIcon from "../../../icons/Icon_calendar.svg";
import questionIcon from "../../../icons/question-icon.png";

class SidePanelEmpAdd extends React.Component {
  state = {
    SidePanelEmpAdd: true
  };

  render() {
    return (
      <div>
        <Container>
          <TextInputHolderFull>
            <Text smallcaps color="#6D777B">
              ENTITY
            </Text>

            <InputWithIcon>
              <input placeholder="ivanka.trump.eth" style={{ border: "none", outline: "none" }} type="text" />
              <div style={{ marginTop: "6px" }}>
                <img src={questionIcon} />
              </div>
            </InputWithIcon>
          </TextInputHolderFull>

          <TextInputHolder>
            <Text smallcaps color="#6D777B">
              Salary
            </Text>

            <InputWithIcon>
              <div style={{ color: "#C4C4C4" }}>{"$"}</div>
              <input placeholder="80,000" style={{ border: "none", outline: "none", paddingLeft: "8px" }} type="text" />
            </InputWithIcon>
          </TextInputHolder>

          <TextInputHolder>
            <Text smallcaps color="#6D777B">
              Start date
            </Text>

            <InputWithIcon style={{ paddingLeft: "0px" }}>
              <SingleDatePicker
                placeholder={"DD/MM/YY"}
                noBorder={true}
                small={true}
                numberOfMonths={1}
                displayFormat={"DD/MM/YY"}
                date={this.state.date} // momentPropTypes.momentObj or null
                onDateChange={date => this.setState({ date })} // PropTypes.func.isRequired
                focused={this.state.focused} // PropTypes.bool
                onFocusChange={({ focused }) => this.setState({ focused })} // PropTypes.func.isRequired
                id="your_unique_id" // PropTypes.string.isRequired,
              />
              <div>
                <img src={calIcon} />
              </div>
            </InputWithIcon>
          </TextInputHolder>
          <TextInputHolder>
            <Text smallcaps color="#6D777B">
              Name
            </Text>
            <TextInput placeholder="Ivanka Trump" />
          </TextInputHolder>
          <TextInputHolder>
            <Text smallcaps color="#6D777B">
              Role
            </Text>
            <TextInput placeholder="Senior Barista" />
          </TextInputHolder>
          <TextInputHolderFull>
            <Text smallcaps color="#6D777B">
              Account Address
            </Text>
            <TextInput placeholder="0xf29bf836c16891c85cc5e973d49909ba54d714d4" />
          </TextInputHolderFull>
          <TextInputHolderFull>
            <Button mode="strong" onClick={() => {}}>
              Add new employeee
            </Button>
          </TextInputHolderFull>
        </Container>
      </div>
    );
  }
}

const InputWithIcon = styled.div`
  display: flex;
  align-items: center;
  line-height: 1.5;
  justify-content: space-between;

  font-size: 14px;
  font-weight: 400;
  width: auto;
  padding: 5px 10px;
  background: #ffffff;
  border: 1px solid #e6e6e6;
  border-radius: 3px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
  color: #000000;
  -webkit-appearance: none;
  height: 35px;
  padding-top: 0px;
  padding-bottom: 0px;
`;

const TextInputWrapper = styled.div`
  display: inline-block;
  position: relative;
  height: 40px;
  &:after {
    content: "$";
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: #b3b3b3;
  }
`;

const SalaryContainer = styled.div`
  padding-bottom: 0px;
`;

const SalaryGrid = styled.div`
  // display: grid;
  grid-template-rows: 40px 115px 152px 70px 50px;
  grid-gap: 20px;
`;

const Line = styled.div`
  border: 0.5px solid #d1d1d1;
`;

const Flexbox = styled.div`
  display: flex;
`;

const Title = styled.div`
  margin-top: 20px;
  margin-bottom: 20px;
`;

const MoneyBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #edf8fe;
  padding: 25px;
`;

const Container = styled.div`
  display: grid;
  grid-template-columns: auto auto;
  grid-gap: 30px;
`;

const TextInputHolder = styled.div`
  display: flex;
  flex-direction: column;
`;

const TextInputHolderFull = TextInputHolder.extend`
  grid-column: 1/3;
`;

export default SidePanelEmpAdd;
