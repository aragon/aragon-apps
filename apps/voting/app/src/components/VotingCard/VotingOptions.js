import React from 'react'
import { Trail, config as springs } from 'react-spring'
import VotingOption from './VotingOption'
import { percentageList } from '../../math-utils'

const ANIM_DELAY_MIN = 100
const ANIM_DELAY_MAX = 800

class VotingOptions extends React.Component {
  static defaultProps = {
    options: [],

    // animationDelay can also be a number to disable the random delay
    animationDelay: { min: ANIM_DELAY_MIN, max: ANIM_DELAY_MAX },
  }
  state = {
    delay: 0,
  }
  constructor(props) {
    super(props)
    const { animationDelay } = props

    const delay = Number.isInteger(animationDelay)
      ? animationDelay
      : animationDelay.min +
        Math.random() * (animationDelay.max - animationDelay.min)

    this.state.delay = delay
  }
  render() {
    const { delay } = this.state
    const {
      options: allOptions,
      optionsDisplayed = allOptions.length,
      totalVoters,
    } = this.props

    const percentages =
      totalVoters > 0
        ? percentageList(allOptions.map(o => o.power / totalVoters), 2)
        : Array(allOptions.length).fill(0)

    const options = allOptions.slice(0, optionsDisplayed)
    return (
      <Trail
        delay={delay}
        from={{ showProgress: 0 }}
        to={{ showProgress: 1 }}
        keys={options.map(option => option.id)}
        native
      >
        {options.map((option, i) => ({ showProgress }) => (
          <VotingOption
            key={option.id}
            showProgress={showProgress}
            config={springs.stiff}
            value={totalVoters > 0 ? option.power / totalVoters : 0}
            percentage={percentages[i]}
            {...option}
          />
        ))}
      </Trail>
    )
  }
}

export default VotingOptions
