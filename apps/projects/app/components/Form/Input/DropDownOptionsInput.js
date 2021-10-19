import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'
import { IconRemove, TextInput, theme, unselectable, Button } from '@aragon/ui'

class DropDownOptionsInput extends React.Component {
  static propTypes = {
    input: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    values: PropTypes.array.isRequired,
    allOptions: PropTypes.array.isRequired,
  }

  state = {
    showAddOption: false,
    addOptionText: '',
    found: [],
  }

  addOption = () => {
    this.setState({ showAddOption: true })
  }

  clearState = () => this.setState({ showAddOption: false, addOptionText: '', found: [] })

  addToCurated = issue => () => {
    this.props.onChange({
      target: { name, value: this.props.values.push(issue) },
    })
    this.clearState()
  }

  searchOptions = ({ target: { name, value } }) => {
    let searchTokens = value.split(' ')
    const found = this.props.allOptions.filter(
      issue => {
        let searchSpace = issue.title + issue.number
        for( let token of searchTokens) {
          if (!searchSpace.includes(token))
            return false
        }
        return !this.props.values.some(i => i.id === issue.id)
      }
    ).splice(0,10)

    this.setState({
      [name]: value,
      found
    })
  }

  removeOption = index => {
    this.props.onChange({
      target: { name, value: this.props.values.splice(index, 1) },
    })
    this.clearState()

  }

  onChangeInput = ({ target: { value } }) => {
    this.props.onChange({ target: { name: 'optionsInput', value } })
  }

  issueToString = issue =>
    `${'repo' in issue ? issue.repo : issue.repository.name} #${issue.number} - ${issue.title}`

  render() {
    const { values } = this.props
    const multipleOptions = values.map((issue, index) => {
      return (
        <StyledOption key={issue.id}>
          <StyledInput readOnly wide value={this.issueToString(issue)} />
          <IconContainer
            style={{ transform: 'scale(.8)' }}
            onClick={() => this.removeOption(index)}
            title="Click to remove the issue"
          >
            <IconRemove />
          </IconContainer>
        </StyledOption>
      )
    })

    const singleOption = <StyledOption key={values[0].id}>
      <StyledInput readOnly wide value={this.issueToString(values[0])} />
    </StyledOption>

    const loadOptions = values.length === 1 ? singleOption:multipleOptions

    const showOption = <div style={{ position: 'relative' }}>
      <StyledInput
        wide
        value={this.state.addOptionText}
        onChange={this.searchOptions} name="addOptionText"
      />
      {(this.state.found.length > 0) && (
        <OptionsPopup>
          {this.state.found.map((issue, index) => {
            return (
              <IssueOption key={index} onClick={this.addToCurated(issue)}>
                {this.issueToString(issue)}
              </IssueOption>
            )
          }
          )}
        </OptionsPopup>
      )}
    </div>

    const hideOption = <div>
      <Button compact mode="secondary" onClick={this.addOption}>+ Add Another</Button>
    </div>


    return (
      <Options>
        {loadOptions}
        {this.state.showAddOption ? showOption : hideOption}
      </Options>
    )
  }
}
const IssueOption = styled.div`
  padding: 5px;
  :hover {
    color: ${theme.accent};
  }
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const BASE_HEIGHT = 32

const OptionsPopup = styled.div`
  overflow: hidden;
  position: absolute;
  top: ${BASE_HEIGHT + 5}px;
  width: 100%;
  right: 0;
  padding: 0;
  background: ${theme.contentBackground};
  border: 1px solid ${theme.contentBorder};
  border-radius: 0 0 3px 3px;
  z-index: 3;
  cursor: pointer;
`
const Options = styled.div`
  display: flex;
  flex-direction: column;
`
const StyledOption = styled.div`
  display: flex;
  margin-bottom: 0.625rem;
  > :first-child {
    flex-grow: 1;
  }
`
const StyledInput = styled(TextInput)`
  flex-grow: 1;
  ${unselectable}; /* it is possible to select the placeholder without this */
  ::placeholder {
    color: ${theme.contentBorderActive};
  }
  :focus {
    border-color: ${theme.contentBorderActive};
    ::placeholder {
      color: ${theme.contentBorderActive};
    }
  }
  :read-only {
    cursor: default;
    :focus {
      border-color: ${theme.contentBorder};
    }
  }
`
const IconContainer = styled.span`
  cursor: pointer;
  display: flex;
  justify-content: center;
  > svg {
    color: ${theme.textSecondary};
    height: auto;
    width: 40px;
    transition: all 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
    :active {
      color: ${theme.accent};
    }
    :hover {
      color: ${theme.contentBorderActive};
    }
  }
`

export default DropDownOptionsInput
