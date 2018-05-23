import React from 'react'
import styled from 'styled-components'
import { theme, Countdown, Button } from '@aragon/ui'
import { Spring, Trail, animated } from 'react-spring'
import color from 'onecolor'
import SurveyCard from '../SurveyCard/SurveyCard'
import SurveyOptions from '../SurveyOptions/SurveyOptions'
import Creator from '../Creator/Creator'

const ANIM_DELAY = 300

class SurveyDetails extends React.Component {
  static defaultProps = {
    survey: {},
  }
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
  render() {
    const { animate } = this.state
    const { survey } = this.props
    return (
      <Card>
        <Spring
          from={{ progress: 0 }}
          to={{ progress: Number(animate) }}
          native
        >
          {({ progress }) => (
            <animated.div style={{ opacity: progress.interpolate(p => p) }}>
              <Question>{survey.question}</Question>
            </animated.div>
          )}
        </Spring>

        <Cols>
          <div>
            <Trail
              keys={['options', 'time']}
              from={{ progress: 0 }}
              to={{ progress: Number(animate) }}
              native
            >
              {[
                ({ progress }) => (
                  <animated.section
                    key="options"
                    style={{ opacity: progress.interpolate(p => p) }}
                  >
                    <SectionTitle>Options</SectionTitle>
                    <SurveyOptions options={survey.options} />
                  </animated.section>
                ),
                ({ progress }) => (
                  <animated.section
                    key="time"
                    style={{ opacity: progress.interpolate(p => p) }}
                  >
                    <SectionTitle>Time Remaining</SectionTitle>
                    <Countdown end={survey.endDate} />
                  </animated.section>
                ),
              ]}
            </Trail>
          </div>
          <div>
            <Trail
              keys={['description', 'url', 'creator', 'vote']}
              from={{ progress: 0 }}
              to={{ progress: Number(animate) }}
              native
            >
              {[
                ({ progress }) => (
                  <animated.section
                    key="description"
                    style={{ opacity: progress.interpolate(p => p) }}
                  >
                    <SectionTitle>Description</SectionTitle>
                    <div>
                      <p>
                        What should the maximum yearly budget from Aragon
                        Foundation be for funding open source projects?
                      </p>
                    </div>
                  </animated.section>
                ),
                ({ progress }) => (
                  <animated.section
                    key="url"
                    style={{ opacity: progress.interpolate(p => p) }}
                  >
                    <SectionTitle>Web Link</SectionTitle>
                    <UrlBlock>
                      <a title={survey.url} href={survey.url}>
                        {survey.url}
                      </a>
                    </UrlBlock>
                  </animated.section>
                ),
                ({ progress }) => (
                  <animated.section
                    key="creator"
                    style={{ opacity: progress.interpolate(p => p) }}
                  >
                    <SectionTitle>Created By</SectionTitle>
                    <Creator address={survey.createdBy} />
                  </animated.section>
                ),
                ({ progress }) => (
                  <animated.section
                    key="vote"
                    style={{ opacity: progress.interpolate(p => p) }}
                  >
                    <VoteButtonWrapper>
                      <Button mode="strong" style={{ width: '50%' }}>
                        Vote
                      </Button>
                    </VoteButtonWrapper>
                  </animated.section>
                ),
              ]}
            </Trail>
          </div>
        </Cols>
      </Card>
    )
  }
  renderSections() {
    return [
      <section>
        <SectionTitle>Description</SectionTitle>
        <div>
          <p>
            What should the maximum yearly budget from Aragon Foundation be for
            funding open source projects?
          </p>
        </div>
      </section>,
      <section>
        <SectionTitle>Web Link</SectionTitle>
        <p>
          <a href={survey.url}>{survey.url}</a>
        </p>
      </section>,
    ]
  }
}

const Card = styled(SurveyCard.Card)`
  height: 100%;
  padding: 30px 40px;
  a {
    color: ${theme.accent};
  }
`

const Question = styled.h1`
  margin-bottom: 15px;
  font-size: 22px;
`

const SectionTitle = styled.h1`
  margin-top: 35px;
  margin-bottom: 15px;
  color: ${color(theme.textSecondary)
    .alpha(0.7)
    .cssa()};
  text-transform: lowercase;
  line-height: 30px;
  font-variant: small-caps;
  font-weight: 600;
  font-size: 16px;
`

const VoteButtonWrapper = styled.div`
  padding-top: 150px;
  padding-bottom: 10px;
  display: flex;
  justify-content: flex-end;
`

const UrlBlock = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: ${theme.accent};
`

const Cols = styled.div`
  @media (min-width: 1100px) {
    display: flex;
    width: 100%;
    > div {
      width: 50%;
    }
    > :first-child {
      margin-right: 30px;
    }
  }
`

export default SurveyDetails
