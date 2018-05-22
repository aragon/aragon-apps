import React from 'react'
import styled from 'styled-components'
import { theme } from '@aragon/ui'
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
  margin-bottom: 15px;
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
`

export default SurveySidebar
