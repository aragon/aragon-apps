import React from "react";
import styled from "styled-components";
import { Trail, animated } from "react-spring";
import { theme, unselectable } from "@aragon/ui";
import { getOptionColor } from "../../option-utils";
import springs from "../../springs";

const ANIM_DELAY = 400;

class VotesCast extends React.Component {
  getTransform(t) {
    return `translate3d(${20 * (1 - t)}%, 0, 0)`;
  }
  render() {
    const { survey } = this.props;
    return (
      <Main>
        <h1>Votes cast so far</h1>
        <ul>
          <Trail
            from={{ progress: 0 }}
            to={{ progress: 1 }}
            keys={survey.options.map(o => o.optionId)}
            config={springs.stiff}
            delay={ANIM_DELAY}
            native
          >
            {survey.options.map(
              ({ label, optionId, power }, index) => ({ progress }) => (
                <AnimatedLi
                  key={optionId}
                  style={{
                    opacity: progress,
                    transform: progress.interpolate(this.getTransform)
                  }}
                >
                  <DiscLabel color={getOptionColor(optionId)} label={label} />
                  <strong>{Math.floor(power)}</strong>
                </AnimatedLi>
              )
            )}
          </Trail>
        </ul>
      </Main>
    );
  }
}

const Main = styled.section`
  h1 {
    margin-bottom: 15px;
    font-size: 16px;
    ${unselectable};
  }
`;

const AnimatedLi = styled(animated.li)`
  list-style: none;
  display: flex;
  margin-bottom: 10px;
  justify-content: space-between;
  color: ${theme.textSecondary};
  strong {
    color: ${theme.textPrimary};
  }
`;

const Disc = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 15px;
  border-radius: 50%;
  background: ${({ color }) => color};
`;

const DiscContainer = styled.span``;

const DiscLabelContainer = styled.span`
  display: flex;

  ${DiscContainer} {
    flex-shrink: 0;
  }
`;

const DiscLabel = ({ color, label }) => (
  <DiscLabelContainer>
    <DiscContainer>
      <Disc color={color} />
    </DiscContainer>
    <span>{label}</span>
  </DiscLabelContainer>
);

export default VotesCast;
