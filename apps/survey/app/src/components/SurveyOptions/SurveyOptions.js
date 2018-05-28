import React from 'react'
import { Trail, config as springs } from 'react-spring'
import SurveyOption from './SurveyOption'
import { percentageList } from '../../math-utils'

const ANIM_DELAY_MIN = 100
const ANIM_DELAY_MAX = 300

class SurveyOptions extends React.Component {
  static defaultProps = {
    options: [],

    // animationDelay can also be a number to disable the random delay
    animationDelay: { min: ANIM_DELAY_MIN, max: ANIM_DELAY_MAX },
  }
  state = {
    animate: false,
  }
  componentDidMount() {
    const { animationDelay } = this.props

    const delay = Number.isInteger(animationDelay)
      ? animationDelay
      : animationDelay.min +
        Math.random() * (animationDelay.max - animationDelay.min)

    // animate after a delay
    this._transitionTimer = setTimeout(() => {
      this.setState({ animate: true })
    }, delay)
  }
  componentWillUnmount() {
    clearTimeout(this._transitionTimer)
  }
  render() {
    const {
      options: allOptions,
      optionsDisplayed = allOptions.length,
      totalPower,
    } = this.props
    const { animate } = this.state

    const totalVotes = allOptions.reduce(
      (total, option) => total + option.power,
      0
    )
    const percentages =
      totalVotes > 0
        ? percentageList(allOptions.map(o => o.power / totalVotes), 2)
        : Array(allOptions.length).fill(0)

    const options = allOptions.slice(0, optionsDisplayed)
    return (
      <Trail
        from={{ showProgress: 0 }}
        to={{ showProgress: Number(animate) }}
        keys={options.map(option => option.optionId)}
        native
      >
        {options.map((option, i) => ({ showProgress }) => (
          <SurveyOption
            key={option.optionId}
            showProgress={showProgress}
            config={springs.stiff}
            value={totalVotes > 0 ? option.power / totalVotes : 0}
            percentage={percentages[i]}
            {...option}
          />
        ))}
      </Trail>
    )
  }
}

export default SurveyOptions
