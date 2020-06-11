import React from 'react'
import BN from 'bn.js'
import { Spring, config as springs } from 'react-spring'
import { divideRoundBigInt } from '@aragon/ui'
import { percentageList } from '../../math-utils'
import VoteOption from './VoteOption'

const ANIM_DELAY_MIN = 100
const ANIM_DELAY_MAX = 800

function optionPercentage(optionPower, totalVotingPower) {
  const precision = 10 ** 9
  const precisionBn = new BN(precision)

  return (
    parseInt(
      divideRoundBigInt(
        optionPower.value().mul(precisionBn),
        totalVotingPower.value()
      ),
      10
    ) / precision
  )
}

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

    const percentages = votingPower.value().isZero()
      ? [0, 0]
      : percentageList(
          options.map(option => optionPercentage(option.power, votingPower))
        )

    return (
      <React.Fragment>
        {options.map((option, i) => (
          <Spring
            key={i}
            delay={delay}
            config={springs.stiff}
            from={{ value: 0 }}
            to={{
              value: votingPower.value().isZero()
                ? 0
                : optionPercentage(option.power, votingPower),
            }}
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
