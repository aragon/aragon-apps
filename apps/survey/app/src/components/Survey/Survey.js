import React from 'react'
import styled from 'styled-components'
import { Spring, animated } from 'react-spring'
import springs from '../../springs'
import SurveyDetails from './SurveyDetails'
import SurveySidebar from './SurveySidebar'

const CONTENT_PADDING = 30
const SIDEBAR_WIDTH = 300 + CONTENT_PADDING
const SIDEBAR_TRANSITION_DELAY = 400

function lerp(progress, value1, value2) {
  return (value2 - value1) * progress + value1
}

class Survey extends React.Component {
  state = {
    animateSidebar: false,
    transitionTo: {},
  }
  componentDidMount() {
    this.startSidebarTransitionTimer()
  }
  componentDidUpdate(prevProps) {
    if (prevProps.survey !== this.props.survey) {
      this.setState({ animateSidebar: false })
      this.clearSidebarTransitionTimer()

      if (this.props.survey) {
        this.startSidebarTransitionTimer()
        this.setState({
          transitionTo: this._detailsWrapperEl.getBoundingClientRect(),
        })
        this._detailsWrapperEl.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }
    }
  }
  componentWillUnmount() {
    this.clearSidebarTransitionTimer()
  }
  startSidebarTransitionTimer() {
    // animate the sidebar after a delay
    this._sidebarTransitionTimer = setTimeout(() => {
      this.setState({ animateSidebar: true })
    }, SIDEBAR_TRANSITION_DELAY)
  }
  clearSidebarTransitionTimer() {
    clearTimeout(this._sidebarTransitionTimer)
  }
  handleDetailsWrapperRef = el => {
    this._detailsWrapperEl = el
  }
  getTransform = t => {
    const to = this.state.transitionTo
    const from = this.props.transitionFrom || {
      x: to.x + to.w / 4,
      y: to.y + to.y / 4,
      w: to.w / 2,
      h: to.h / 2,
    }
    return `
      translate(
        ${lerp(t, -to.x + from.x, 0)}px,
        ${lerp(t, -to.y + from.y, 0)}px
      )
      scale(
        ${lerp(t, from.width / to.width, 1)},
        ${lerp(t, from.height / to.height, 1)}
      )
    `
  }
  render() {
    const { survey } = this.props
    const { animateSidebar } = this.state
    if (!survey) return null

    return (
      <Main>
        <DetailsWrapper innerRef={this.handleDetailsWrapperRef}>
          <Spring
            from={{ show: 0 }}
            to={{ show: 1 }}
            config={springs.normal}
            native
          >
            {styles => (
              <animated.div
                style={{
                  opacity: styles.show,
                  transformOrigin: '0 0',
                  transform: styles.show.interpolate(this.getTransform),
                }}
              >
                <SurveyDetails survey={survey} />
              </animated.div>
            )}
          </Spring>
        </DetailsWrapper>
        <SidebarWrapper>
          <Spring
            from={{ progress: 0 }}
            to={{ progress: Number(animateSidebar) }}
            config={springs.slow}
            native
          >
            {({ progress }) => (
              <animated.div
                style={{
                  paddingRight: `${CONTENT_PADDING}px`,
                  opacity: progress,
                  transform: progress.interpolate(
                    t => `translateX(${(1 - t) * 100}%)`
                  ),
                }}
              >
                <SurveySidebar survey={survey} />
              </animated.div>
            )}
          </Spring>
        </SidebarWrapper>
      </Main>
    )
  }
}

const DetailsWrapper = styled.div`
  width: 100%;
  margin-top: -30px;
  padding-top: 30px;
  padding-right: ${CONTENT_PADDING}px;
`

const SidebarWrapper = styled.div`
  overflow: hidden;
  margin-top: 30px;
`

const Main = styled.div`
  position: absolute;
  display: flex;
  top: 30px;
  left: ${CONTENT_PADDING}px;
  right: 0;
  flex-direction: column;
  @media (min-width: 900px) {
    flex-direction: row;
    ${SidebarWrapper} {
      margin-top: 0;
      width: ${SIDEBAR_WIDTH}px;
      flex-shrink: 0;
    }
  }
`

export default Survey
