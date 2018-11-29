import React from 'react'
import styled from 'styled-components'
import { Spring } from 'react-spring'
import { unselectable } from '@aragon/ui'

/**/

const springs = {
  slow: { tension: 60, friction: 12 },
  normal: { tension: 160, friction: 16 },
  stiff: { tension: 260, friction: 25 },
}

const DURATION_SLICES = 14

const OPTION_COLORS = ['#028CD1', '#39CAD0', '#8CD102', '#CAD039', '#D0CA39']

export function getOptionColor(optionId) {
  // OptionId indexing starts from 1, so subtract 1
  return OPTION_COLORS[(optionId - 1) % OPTION_COLORS.length]
}

/**/

const WIDTH = 300
const HEIGHT = 200
const CAPTIONS_HEIGHT = 20
const DOT_RADIUS = 7 / 2

const ANIM_DELAY = 500

const BORDER_COLOR = 'rgba(209, 209, 209, 0.5)'

class PaidSalariesChart extends React.Component {
  state = {
    animate: false,
  }
  componentDidMount() {
    // animate after a delay
    this._transitionTimer = setTimeout(() => {
      this.setState({ animate: true })
    }, ANIM_DELAY)
  }
  componentWillUnmount() {
    clearTimeout(this._transitionTimer)
  }
  getX(voteIndex) {
    const slice = WIDTH / (DURATION_SLICES - 1)
    return slice * voteIndex
  }
  getY(votePercentage, progress) {
    const padding = DOT_RADIUS + 2
    return HEIGHT - padding - (HEIGHT - padding * 2) * votePercentage * progress
  }
  render() {
    const { animate } = this.state

    // const { survey } = this.props
    // const options = survey.options.map((option, i) => ({
    //   ...option,
    //   history: survey.optionsHistory.options[i],
    // }))

    const options = [
      {
        optionId: 1,
        history: [
          0, 0.1, 0.3, 0.5, 0.1, 0.7, 1
        ]
      }
    ]

    const labels = ['', 'SEP', '', 'NOV', '', 'JAN', '', 'MAR', '', 'JUN', '', 'SEP', '']

    // All the options' histories have already been reduced to the same length
    const historyLength = options[0].history.length
    return (
      <div>
        <SvgWrapper>
          <Spring
            from={{ progress: Number(animate) }}
            to={{ progress: Number(animate) }}
            config={springs.slow}
          >
            {({ progress }) => (
              <svg viewBox={`0 0 ${WIDTH} ${HEIGHT + CAPTIONS_HEIGHT}`}>
                <rect
                  width={WIDTH}
                  height={HEIGHT}
                  rx="3"
                  ry="3"
                  fill="#ffffff"
                  strokeWidth="1"
                  stroke={BORDER_COLOR}
                />
                <path
                  d={`
                    M 0,${HEIGHT}
                    ${[...new Array(DURATION_SLICES)].reduce(
                      (path = '', _, i) =>
                        `${path} M ${this.getX(i)},${HEIGHT} l 0,-8`
                    )}
                  `}
                  stroke={BORDER_COLOR}
                  strokeWidth="1"
                />
                {options.map(({ history, optionId }) => {
                  const color = getOptionColor(optionId)
                  return (
                    <g key={optionId}>
                      <path
                        d={`
                          M
                          ${this.getX(0)},
                          ${this.getY(history[0], progress)}

                          ${history
                            .slice(1)
                            .map(
                              (val, i) =>
                                `L
                                 ${this.getX((i + 1) * progress)},
                                 ${this.getY(val, progress)}
                                `
                            )
                            .join('')}
                        `}
                        fill="transparent"
                        stroke={color}
                        strokeWidth="2"
                        strokeOpacity="0.7"
                      />
                      {history
                        .slice(1, -1)
                        .map((val, i) => (
                          <circle
                            key={i}
                            cx={this.getX(i + 1) * progress}
                            cy={this.getY(val, progress)}
                            r={DOT_RADIUS}
                            fill="white"
                            stroke={color}
                            strokeWidth="1"
                          />
                        ))}
                    </g>
                  )
                })}
                <line
                  x1={this.getX(historyLength - 1) * progress}
                  y1="0"
                  x2={this.getX(historyLength - 1) * progress}
                  y2={HEIGHT}
                  stroke="#DAEAEF"
                  strokeWidth="3"
                />
                {/*<g transform={`translate(0,${HEIGHT + CAPTIONS_HEIGHT * 0.7})`}>
                                  {[...new Array(DURATION_SLICES - 1)].map((_, i) => (
                                    <text key={i} x={this.getX(i) + (i === 0 ? 2 : 0)}>
                                      {labels[i]}
                                    </text>
                                  ))}
                                </g>*/}
              </svg>
            )}
          </Spring>
        </SvgWrapper>
      </div>
    )
  }
}

const SvgWrapper = styled.div`
  svg {
    display: block;
    text {
      font-size: 12px;
      font-weight: 300;
      fill: #6d777b;
      ${unselectable};
    }
  }
`

export default PaidSalariesChart
