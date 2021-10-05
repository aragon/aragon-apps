import React from 'react'
import { Spring, config as springs } from 'react-spring'
import { GU, Text, useTheme } from '@aragon/ui'
import VotingOption from './VotingOption'
import { safeDiv } from '../utils/math-utils'
import PropTypes from 'prop-types'
import { BigNumber } from 'bignumber.js'

const ANIM_DELAY_MIN = 100
const ANIM_DELAY_MAX = 800

class VotingOptions extends React.Component {
  static defaultProps = {
    options: [],
    voteWeights: [],
    voteOpen: true,
    balance: 0,
    symbol: '',
    decimals: 18,
    // animationDelay can also be a number to disable the random delay
    animationDelay: { min: ANIM_DELAY_MIN, max: ANIM_DELAY_MAX },
    displayYouBadge: false,
  }

  static propTypes = {
    fontSize: PropTypes.oneOf([ 'xsmall', 'small' ]),
    options: PropTypes.arrayOf(PropTypes.object).isRequired,
    totalSupport: PropTypes.number.isRequired,
    color: PropTypes.string.isRequired,
    voteWeights: PropTypes.arrayOf(PropTypes.string).isRequired,
    voteOpen: PropTypes.bool,
    balance: PropTypes.number,
    symbol: PropTypes.string,
    decimals: PropTypes.number,
    animationDelay: PropTypes.object.isRequired,
    displayYouBadge: PropTypes.bool,
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
    const { options,
      totalSupport,
      color,
      voteWeights,
      voteOpen,
      balance,
      symbol,
      decimals,
      displayYouBadge
    } = this.props

    return (
      <React.Fragment>
        {options.map((option, i) =>
          <Spring
            key={i}
            delay={delay}
            config={springs.stiff}
            from={{ value: 0 }}
            to={{ value: safeDiv(parseInt(option.value, 10), totalSupport) }}
            native
          >
            {({ value }) => {
              const percentage = safeDiv(parseInt(option.value, 10), totalSupport)
              const formattedBalance = BigNumber(balance).div(BigNumber(10 ** decimals))
              let allocation
              if(!voteOpen && symbol) {
                allocation = <AllocationText
                  balance={formattedBalance}
                  percentage={percentage}
                  symbol={symbol}
                />
              }

              return (
                <VotingOption
                  fontSize={this.props.fontSize}
                  valueSpring={value}
                  percentage={percentage*100}
                  allocation={allocation}
                  color={color}
                  userVote={(voteWeights.length && displayYouBadge) ? Math.round(voteWeights[i]) : -1}
                  {...option}
                />
              )}
            }
          </Spring>
        )}
      </React.Fragment>
    )
  }
}

const AllocationText = ({ balance, percentage, symbol }) => {
  const theme = useTheme()
  return (
    <Text size="xsmall" color={theme.contentSecondary} css={`margin-left: ${0.25 * GU}px`}>
      {`(${balance.times(percentage).dp(3).toString()} ${symbol})`}
    </Text>
  )
}

AllocationText.propTypes = {
  balance: PropTypes.object.isRequired,
  percentage: PropTypes.number.isRequired,
  symbol: PropTypes.string.isRequired,
}

export default VotingOptions
