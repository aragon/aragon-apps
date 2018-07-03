import React from "react";
import styled from "styled-components";
import { Slider } from "@aragon/ui";

class PercentageRow extends React.Component {
  handleUpdate = value => {
    this.props.onUpdate(this.props.index, value);
  };
  render() {
    const { value } = this.props;
    return (
      <Row>
        <SliderWrapper>
          <Slider value={value} onUpdate={this.handleUpdate} />
        </SliderWrapper>
      </Row>
    );
  }
}

const Row = styled.div`
  display: flex;
  margin-top: 3px;
`;

const SliderWrapper = styled.div`
  width: 100%;
`;

export default PercentageRow;
