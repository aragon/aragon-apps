import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import {
  Text,
  TextInput,
  DropDown,
  useTheme,
} from '@aragon/ui'
import { IssueText } from '../PanelComponents'

export const HorizontalInputGroup = styled.div`
  display: flex;
`

export const AmountInput = styled(TextInput.Number).attrs({
  step: 'any',
  min: '1e-18',
  autoComplete: 'off',
})`
  width: 100%;
  display: inline-block;
  padding-top: 3px;
  border-radius: 4px 0 0 4px;
`

export const TokenInput = styled(DropDown)`
  border-radius: 0 4px 4px 0;
  left: -1px;
  min-width: auto;
  max-width: 120px;
`

export const HoursInput = styled(TextInput.Number).attrs({
  step: '0.25',
  min: '0',
})`
  width: 100%;
  display: inline-block;
  padding-top: 3px;
`

const IssueAmount = styled.span`
  display: flex;
`
const TextTag = styled(Text).attrs({
  size: 'small',
  weight:'bold',
})`
  padding: 0 10px;
  margin-left: 10px;
  white-space: nowrap;
  width: auto;
  height: 24px;
  line-height: 28px;
  border-radius: 24px;
  text-transform: uppercase;
  color: ${props => props.theme.tagIndicatorContent};
  background: ${props => props.theme.tagIndicator};
`

export const IssueTitleCompact = ({ title, tag = '' }) => {
  const theme = useTheme()

  return (
    <React.Fragment>
      <IssueText>
        <Text >{title}</Text>
      </IssueText>
      {tag && (
        <IssueAmount>
          <TextTag theme={theme}>
            {tag}
          </TextTag>
        </IssueAmount>
      )}
    </React.Fragment>
  )
}

IssueTitleCompact.propTypes = {
  title: PropTypes.string.isRequired,
  tag: PropTypes.string,
}

