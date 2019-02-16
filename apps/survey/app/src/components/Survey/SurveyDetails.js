import React from 'react'
import styled from 'styled-components'
import {
  Countdown,
  Button,
  IdentityBadge,
  SafeLink,
  unselectable,
  theme,
} from '@aragon/ui'
import { Spring, Trail, animated } from 'react-spring'
import color from 'onecolor'
import SurveyCard from '../SurveyCard/SurveyCard'
import SurveyOptions from '../SurveyOptions/SurveyOptions'

const ANIM_DELAY = 300

class SurveyDetails extends React.Component {
  static defaultProps = {
    survey: {},
    onOpenVotingPanel: () => {},
  }
  render() {
    const { survey } = this.props
    return (
      <Card>
        <Spring
          from={{ progress: 0 }}
          to={{ progress: 1 }}
          delay={ANIM_DELAY}
          native
        >
          {({ progress }) => (
            <animated.div style={{ opacity: progress }}>
              <Question>{survey.metadata.question}</Question>
            </animated.div>
          )}
        </Spring>

        <Cols>
          <div>
            <Trail
              keys={['options', 'time']}
              from={{ progress: 0 }}
              to={{ progress: 1 }}
              delay={ANIM_DELAY}
              native
            >
              {[
                ({ progress }) => (
                  <animated.section key="options" style={{ opacity: progress }}>
                    <SectionTitle>Options</SectionTitle>
                    <SurveyOptions
                      options={survey.options}
                      totalPower={survey.data.votingPower}
                    />
                  </animated.section>
                ),
                ({ progress }) => (
                  <animated.section key="time" style={{ opacity: progress }}>
                    <SectionTitle>Time Remaining</SectionTitle>
                    <Countdown end={survey.data.endDate} />
                  </animated.section>
                ),
              ]}
            </Trail>
          </div>
          <div>
            <Trail
              keys={['description', 'url', 'creator', 'vote']}
              from={{ progress: 0 }}
              to={{ progress: 1 }}
              delay={ANIM_DELAY}
              native
            >
              {[
                ({ progress }) => (
                  <animated.section
                    key="description"
                    style={{ opacity: progress }}
                  >
                    <SectionTitle>Description</SectionTitle>
                    <div>
                      <p>{survey.metadata.description}</p>
                    </div>
                  </animated.section>
                ),
                ({ progress }) => (
                  <animated.section key="url" style={{ opacity: progress }}>
                    <SectionTitle>Web Link</SectionTitle>
                    <UrlBlock>
                      <SafeLink
                        title={survey.metadata.url}
                        href={survey.metadata.url}
                        target="_blank"
                      >
                        {survey.metadata.url}
                      </SafeLink>
                    </UrlBlock>
                  </animated.section>
                ),
                ({ progress }) => (
                  <animated.section key="creator" style={{ opacity: progress }}>
                    <SectionTitle>Created By</SectionTitle>
                    <Creator>
                      <IdentityBadge entity={survey.data.creator} />
                    </Creator>
                  </animated.section>
                ),
                ({ progress }) => (
                  <animated.section key="vote" style={{ opacity: progress }}>
                    <VoteButtonWrapper>
                      {survey.data.open && (
                        <Button
                          mode="strong"
                          style={{ width: '50%' }}
                          onClick={this.props.onOpenVotingPanel}
                        >
                          Vote
                        </Button>
                      )}
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
  ${unselectable};
`

const Creator = styled.div`
  display: flex;
  align-items: center;
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
