import React, { Component } from 'react'
import styled from 'styled-components'
import {
  Button,
  Field,
  IconAdd,
  IconRemove,
  Text,
  TextInput,
  theme,
} from '@aragon/ui'

const { accent, textSecondary, textTertiary } = theme

const initialState = {
  description: '',
  votingTokens: null,
  options: [ 'Mars', 'The Moon' ],
  optionInputText: '',
}

class NewPayoutVotePanel extends Component {
  static defaultProps = {}
  constructor(props) {
    super(props)
    this.state = { ...initialState }
  }

  handleChange = e => {
    this.setState({ optionInputText: e.target.value })
  }

  handleAddOptionClick = () => {
    const { options, optionInputText } = this.state
    optionInputText &&
      !options.includes(optionInputText) &&
      this.setState(({ options, optionInputText }) => ({
        options: [ ...options, optionInputText ],
        optionInputText: '',
      }))
  }

  handleRemoveOption = option => {
    let index = this.state.options.indexOf(option)
    this.setState(({ options }) => ({
      options: [ ...options.slice(0, index), ...options.slice(index + 1) ],
    }))
  }

  render() {
    const { options, optionInputText } = this.state

    const optionsElements = options.map(option => (
      <React.Fragment key={option}>
        <TextInput readOnly value={option} />
        <IconRemove onClick={() => this.handleRemoveOption(option)} />
      </React.Fragment>
    ))

    return (
      <StyledPanel>
        <Text size="xxlarge">New payout vote</Text>
        <Text color={textTertiary}>Monthly Reward DAO</Text>
        <Field label="DESCRIPTION">
          <TextInput.Multiline
            rows="3"
            required
            type="text"
            placeholder="Describe your vote"
            wide
          />
        </Field>
        <Field label="VOTING TOKENS">
          <TextInput required type="number" />
        </Field>
        <Field label="OPTIONS">
          {optionsElements}
          <TextInput
            onChange={this.handleChange}
            type="text"
            placeholder="Enter an option"
            value={optionInputText}
          />
          <IconAdd onClick={this.handleAddOptionClick} />
        </Field>
        <Button mode="strong" type="submit" wide>
          Begin vote
        </Button>
      </StyledPanel>
    )
  }
}

const StyledPanel = styled.div`
  display: flex;
  flex-direction: column;
  & > :not(:first-child):not(:last-child) {
    margin-bottom: 1.2rem;
    & span:first-of-type {
      font-weight: bold;
      color: ${textTertiary};
      & span {
        margin-left: 0.5rem;
        float: none;
        color: ${accent};
      }
    }
    & textarea,
    & input {
      ::placeholder {
        color: ${textTertiary};
      }
    }
    & textarea {
      overflow: auto;
      resize: none;
    }
  }
  & > :nth-child(5) {
    & input {
      width: calc(100% - 38px);
      margin-bottom: 10px;
    }
    & > :last-child > svg {
      cursor: pointer;
      margin-left: 3px;
      margin-top: -3px;
      height: auto;
      width: 35px;
      color: ${textSecondary};
      vertical-align: middle;
    }
  }
`

// eslint-disable-next-line import/no-unused-modules
export default NewPayoutVotePanel
