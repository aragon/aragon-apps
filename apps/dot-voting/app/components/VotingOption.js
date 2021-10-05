import React from 'react'
import styled from 'styled-components'
import { GU, Tag, Text, useTheme } from '@aragon/ui'
import { animated } from 'react-spring'
import PropTypes from 'prop-types'
import { isAddress } from 'web3-utils'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'

const Label = ({ fontSize, label }) => {
  if (isAddress(label)) {
    return (
      <LocalIdentityBadge
        key={label}
        entity={label}
        fontSize={fontSize}
        style={{ padding: 0 }}
        compact
        shorten
      />
    )
  }

  return (
    <Text
      size={fontSize}
      css={fontSize === 'xsmall' && `
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `}
    >
      {label}
    </Text>
  )
}

Label.propTypes = {
  fontSize: PropTypes.oneOf([ 'xsmall', 'small' ]),
  label: PropTypes.string.isRequired,
}

const VotingOption = ({ valueSpring, label, percentage, allocation, color, threshold, userVote, fontSize }) => {
  const theme = useTheme()
  return (
    <Main>
      <Labels>
        {label && (
          <div
            css={`
              align-items: center;
              display: grid;
              grid-gap: ${0.5 * GU}px;
              grid-template-columns: 1fr auto;
              margin-right: ${0.5 * GU}px;
              height: 24px;
            `}
          >
            <Label fontSize={fontSize} label={label} />
            {userVote !== -1 && (
              <Tag css={`margin-top: -${0.25 * GU}px`} label={`YOU: ${userVote}%`} />
            )}
          </div>
        )}
        <div>
          {percentage !== -1 &&
              <Text size="xsmall" color={theme.contentSecondary}>
                {Math.round(percentage)}%
              </Text>
          }
          {allocation}
        </div>
      </Labels>
      <div css={`
          display: flex;
          align-items: center;
          position: relative;
        `}
      >
        <BarWrapper>
          <Bar
            style={{
              transform: valueSpring.interpolate(v => `scale3d(${v}, 1, 1)`),
              backgroundColor: color,
            }}
          />
        </BarWrapper>
        {threshold !== -1 && <Threshold threshold={threshold} />}
      </div>
    </Main>
  )
}

VotingOption.defaultProps = {
  color: '#95ECFF',
  threshold: -1,
  label: '',
  percentage: -1,
  allocation: '',
  userVote: -1,
}

VotingOption.propTypes = {
  fontSize: PropTypes.oneOf([ 'xsmall', 'small' ]),
  valueSpring: PropTypes.object.isRequired,
  label: PropTypes.string.isRequired,
  percentage: PropTypes.number.isRequired,
  allocation: PropTypes.node,
  threshold: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  userVote: PropTypes.number.isRequired,
}

const Main = styled.div`
  & + & {
    margin-top: 10px;
  }
`

const Labels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
`

const BarWrapper = styled.div`
  overflow: hidden;
  background: #edf3f6;
  border-radius: 2px;
  position: relative;
  width: 100%;
`

const Bar = styled(animated.div)`
  width: 100%;
  height: 6px;
  transform-origin: 0 0;
`
const Threshold = styled.div`
  overflow: hidden;
  position: absolute;
  top: -10px;
  left: ${props => props.threshold}%;
  height: 24px;
  width: 30px;
  border-left: 1px dotted #979797;
  z-index: 1000;
`

export default VotingOption
