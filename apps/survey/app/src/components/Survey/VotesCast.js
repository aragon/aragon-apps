import React from 'react'
import styled from 'styled-components'
import { Trail, animated } from 'react-spring'
import { theme, unselectable } from '@aragon/ui'
import { getOptionColor } from '../../option-utils'
import springs from '../../springs'

const ANIM_DELAY = 600

class VotesCast extends React.Component {
  getTransform(t) {
    return `translate3d(${20 * (1 - t)}%, 0, 0)`
  }
  render() {
    const { survey } = this.props
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
                <animated.li
                  key={optionId}
                  style={{
                    opacity: progress,
                    transform: progress.interpolate(this.getTransform),
                  }}
                >
                  <span>
                    <span>
                      <Disc style={{ background: getOptionColor(optionId) }} />
                    </span>
                    <span>{label}</span>
                  </span>
                  <strong>{Math.floor(power)}</strong>
                </animated.li>
              )
            )}
          </Trail>
        </ul>
      </Main>
    )
  }
}

const Main = styled.section`
  h1 {
    margin-bottom: 15px;
    font-size: 16px;
    ${unselectable};
  }
  li {
    list-style: none;
    display: flex;
    margin-bottom: 10px;
    justify-content: space-between;
    color: ${theme.textSecondary};
    strong {
      color: ${theme.textPrimary};
    }
  }
`

const Disc = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 15px;
  border-radius: 50%;
`

export default VotesCast
