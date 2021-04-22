import React from 'react'
import styled from 'styled-components'
import { theme, unselectable } from '@aragon/ui'
import VotesHistory from './VotesHistory'
import VotesCast from './VotesCast'

class SurveySidebar extends React.Component {
  render() {
    const { survey } = this.props
    return (
      <div>
        <Title>Survey Summary</Title>
        <Part>
          <VotesHistory survey={survey} />
        </Part>
        <Part>
          <VotesCast survey={survey} />
        </Part>
      </div>
    )
  }
}

const Part = styled.div`
  max-width: 400px;
  margin: 0 auto 15px;
`

const Title = styled.h1`
  margin-bottom: 15px;
  color: ${theme.textSecondary};
  text-transform: lowercase;
  line-height: 30px;
  font-variant: small-caps;
  font-weight: 600;
  font-size: 16px;
  border-bottom: 1px solid ${theme.contentBorder};
  ${unselectable};
`

export default SurveySidebar
