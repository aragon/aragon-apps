import React from 'react'
import { Spring, config as springs } from 'react-spring'
import VoteOption from './VoteOption'
import { percentageList } from '../../math-utils'

const ANIM_DELAY_MIN = 100
const ANIM_DELAY_MAX = 800

class VoteOptions extends React.Component {
  static defaultProps = {
    options: [],

    // animationDelay can also be a number to disable the random delay
    animationDelay: { min: ANIM_DELAY_MIN, max: ANIM_DELAY_MAX },
  }
  constructor(props) {
    super(props)
    const { animationDelay } = props

    const delay = Number.isInteger(animationDelay)
      ? animationDelay
      : animationDelay.min +
        Math.random() * (animationDelay.max - animationDelay.min)

    this.state = { delay }
  }
  render() {
    const { delay } = this.state
    const { options, votingPower } = this.props

    const percentages =
      votingPower > 0
        ? percentageList(
            options.map(o => o.power / votingPower),
            2
          )
        : [0, 0]

    return (
      <React.Fragment>
        {options.map((option, i) => (
          <Spring
            key={i}
            delay={delay}
            config={springs.stiff}
            from={{ value: 0 }}
            to={{ value: votingPower > 0 ? option.power / votingPower : 0 }}
            native
          >
            {({ value }) => (
              <VoteOption
                value={value}
                percentage={percentages[i]}
                {...option}
              />
            )}
          </Spring>
        ))}
      </React.Fragment>
    )
  }
}

export default VoteOptions
