import React from 'react'
import PropTypes from 'prop-types'
import styled, { css } from 'styled-components'
import { Spring } from 'react-spring'
import { unselectable } from '@aragon/ui'

class LineChart extends React.Component {
  static propTypes = {
    springConfig: PropTypes.shape({
      tension: PropTypes.number,
      friction: PropTypes.number
    }),
    durationSlices: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
    captionsHeight: PropTypes.number,
    dotRadius: PropTypes.number,
    animDelay: PropTypes.number,
    borderColor: PropTypes.string,
    reset: PropTypes.bool,
    settings: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        color: PropTypes.string,
        values: PropTypes.arrayOf(PropTypes.number) // numbers between 0 and 1
      })
    ),
    labels: PropTypes.array
  }

  static defaultProps = {
    springConfig: { tension: 60, friction: 12 },
    durationSlices: 16,
    width: 300,
    height: 200,
    captionsHeight: 20,
    dotRadius: 7/2,
    animDelay: 500,
    reset: false,
    borderColor: 'rgba(209, 209, 209, 0.5)',
    settings: []
  }

  state = {
    animate: false,
  }

  componentDidMount() {
    // animate after a delay
    const { animDelay } = this.props
    this._transitionTimer = setTimeout(() => {
      this.setState({ animate: true })
    }, animDelay)
  }

  componentWillUnmount() {
    clearTimeout(this._transitionTimer)
  }

  getX(index) {
    const { width, durationSlices } = this.props

    const slice = width / (durationSlices - 1)
    return slice * index
  }

  getY(percentage, progress) {
    const { dotRadius, height } = this.props

    const padding = dotRadius + 2
    return height - padding - (height - padding * 2) * percentage * progress
  }

  render() {
    const { animate } = this.state
    const {
      settings,
      width,
      height,
      captionsHeight,
      borderColor,
      durationSlices,
      dotRadius,
      springConfig,
      labels,
      reset
    } = this.props

    // All the settings' values should have same length
    const valuesLength = settings.length ? settings[0].values.length : 0

    return (
      <div>
        <SvgWrapper>
          <Spring
            from={{ progress: 0 }}
            to={{ progress: Number(animate) }}
            config={springConfig}
            reset={reset}
          >
            {({ progress }) => (
              <svg viewBox={`0 0 ${width} ${height + captionsHeight}`}>
                <rect
                  width={width}
                  height={height}
                  rx="3"
                  ry="3"
                  fill="#ffffff"
                  strokeWidth="1"
                  stroke={borderColor}
                />
                <path
                  d={`
                    M 0,${height}
                    ${[...new Array(durationSlices)].reduce(
                      (path = '', _, i) =>
                        `${path} M ${this.getX(i)},${height} l 0,-8`
                    )}
                  `}
                  stroke={borderColor}
                  strokeWidth="1"
                />
                {settings.map(({ id, color, values }) => {
                  return valuesLength && (
                    <g key={`line-plot-${id}`}>
                      <path
                        d={`
                          M
                          ${this.getX(0)},
                          ${this.getY(values[0], progress)}

                          ${values
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
                      {values
                        .slice(1, -1)
                        .map((val, i) => (
                          <circle
                            key={i}
                            cx={this.getX(i + 1) * progress}
                            cy={this.getY(val, progress)}
                            r={dotRadius}
                            fill="white"
                            stroke={color}
                            strokeWidth="1"
                          />
                        ))}
                    </g>
                  )
                })}
                <line
                  x1={this.getX(valuesLength - 1) * progress}
                  y1="0"
                  x2={this.getX(valuesLength - 1) * progress}
                  y2={height}
                  stroke="#DAEAEF"
                  strokeWidth="3"
                />
                { labels &&
                  <g transform={`translate(0,${height + 20})`}>
                    {[...new Array(durationSlices - 1)].map((_, i) => (
                      <LabelText key={i} x={this.getX(i) + (i === 0 ? 2 : 0)} transform={`rotate(45, ${this.getX(i) + (i === 0 ? 2 : 0)},0) translate(-6)`}>
                        {labels[i]}
                      </LabelText>
                    ))}
                  </g>
                }
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
  }
`

const LabelText = styled.text`
  font-size: 12px;
  font-weight: 300;
  fill: #6d777b;
  ${unselectable};
`

export default LineChart
