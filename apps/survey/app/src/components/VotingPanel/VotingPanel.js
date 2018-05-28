import React from 'react'
import styled from 'styled-components'
import {
  theme,
  Button,
  Countdown,
  RadioButton,
  SidePanel,
  SidePanelSeparator,
  Slider,
  Text,
  TextInput,
  Info,
} from '@aragon/ui'
import Creator from '../Creator/Creator'
import {
  percentageList,
  scaleValuesSet,
  scaleBigNumberValuesSet,
} from '../../math-utils'

class VotingPanel extends React.Component {
  state = {
    surveyId: null,
    distribution: [],
  }

  static getDerivedStateFromProps(props, state) {
    if (!props.survey || props.survey.surveyId === state.surveyId) {
      return null
    }
    return {
      surveyId: props.survey.surveyId,
      distribution: [...new Array(props.survey.options.length)].fill(0),
    }
  }

  // Update the distribution by changing one of the values
  static updateDistributionValue(index, value, distribution) {
    // Other values than the one being directly updated
    const othersTotal = distribution.reduce(
      (total, v, i) => total + (i === index ? 0 : v),
      0
    )

    // Single non-zero value
    if (value === 1) {
      return distribution.map((_, i) => (i === index ? 1 : 0))
    }

    // Distribute the remaining between the others
    if (othersTotal === 0) {
      return distribution.map(
        (_, i) =>
          i === index ? value : (1 - value) / (distribution.length - 1)
      )
    }

    // Update others based on their previous value size
    const updateOtherValue = prevValue => {
      return prevValue === 0
        ? 0
        : prevValue - ((othersTotal + value - 1) * prevValue) / othersTotal
    }

    return distribution.map(
      (prevValue, i) => (i === index ? value : updateOtherValue(prevValue))
    )
  }

  getDistributionPairs() {
    const { distribution } = this.state
    const percentages = percentageList(distribution)

    return distribution.map((value, i) => ({
      value,
      percentage: percentages[i],
    }))
  }

  canVote() {
    const { survey } = this.props
    const { distribution } = this.state
    if (!survey || survey.userBalance.isZero()) {
      return false
    }
    return distribution.reduce((total, v) => total + v, 0) > 0
  }

  handleOptionUpdate = (id, value) => {
    const { survey } = this.props
    const index = survey.options.findIndex(o => o.optionId === id)
    this.setState({
      distribution: VotingPanel.updateDistributionValue(
        index,
        value,
        this.state.distribution
      ),
    })
  }

  handleSubmit = event => {
    event.preventDefault()

    const { app, survey } = this.props
    const { distribution } = this.state

    const ids = survey.options.map(o => o.optionId)
    const stakes = scaleBigNumberValuesSet(distribution, survey.userBalance)

    console.log(`
      app.voteOptions(
        ${survey.surveyId},
        [${ids}],
        [${stakes.map(String)}]
      )
    `)

    this.props.app.voteOptions(survey.surveyId, ids, stakes.map(String))
  }

  render() {
    const { opened, onClose, survey, tokenSymbol, tokenDecimals } = this.props
    const distributionPairs = this.getDistributionPairs()
    const balance = survey
      ? survey.userBalance.div(Math.pow(10, tokenDecimals))
      : 0

    const enableSubmit = this.canVote()

    return (
      <SidePanel
        title="Vote in non-binding survey"
        opened={opened}
        onClose={onClose}
      >
        {survey && (
          <div>
            <form onSubmit={this.handleSubmit}>
              <SidePanelSeparator />
              <Part>
                <h2>
                  <Label>Time Remaining</Label>
                </h2>
                <Countdown end={survey.data.endDate} />
              </Part>

              <SidePanelSeparator />
              <Part>
                <h2>
                  <Label>Question</Label>
                </h2>
                <p>
                  <strong>{survey.metadata.question}</strong>
                </p>
              </Part>

              <SidePanelSeparator />
              <Part>
                <h2>
                  <Label>Description</Label>
                </h2>
                <p>{survey.metadata.description}</p>
              </Part>

              <SidePanelSeparator />
              <Part>
                <h2>
                  <Label>Created By</Label>
                </h2>
                <Creator address={survey.data.creator} />
              </Part>

              <SidePanelSeparator />
              <Part>
                <TwoLabels>
                  <h2>
                    <Label>Allocate your tokens to vote</Label>
                  </h2>
                  <Label>Percentage</Label>
                </TwoLabels>
                {survey.options.map(({ optionId, label }, index) => {
                  const { value, percentage } = distributionPairs[index]
                  return (
                    <Option
                      key={optionId}
                      id={optionId}
                      label={label}
                      value={value}
                      percentage={percentage}
                      onUpdate={this.handleOptionUpdate}
                    />
                  )
                })}
              </Part>

              {balance > 0 ? (
                <Info.Action>
                  Voting with your {balance.toFixed(2)} {tokenSymbol}
                </Info.Action>
              ) : (
                <Info.Action>
                  You need to send some {tokenSymbol} to this account before
                  voting.
                </Info.Action>
              )}

              <Footer>
                <Button
                  mode="strong"
                  type="submit"
                  wide
                  disabled={!enableSubmit}
                >
                  Cast your vote
                </Button>
              </Footer>
            </form>
          </div>
        )}
      </SidePanel>
    )
  }
}

class Option extends React.Component {
  handleSliderUpdate = value => {
    this.props.onUpdate(this.props.id, Math.max(0, Math.min(1, value)))
  }
  handleRadioClick = () => {
    this.props.onUpdate(this.props.id, 1)
  }
  handleInputChange = e => {
    // disable input changes for now
    // const value = Math.max(0, Math.min(100, parseInt(e.target.value, 10)))
    // if (!isNaN(value)) {
    //   this.props.onUpdate(this.props.id, value)
    // }
  }
  render() {
    const { id, label, value, percentage } = this.props
    return (
      <OptionRow key={id}>
        <OptionRadio>
          <RadioButton checked={value === 1} onClick={this.handleRadioClick} />
        </OptionRadio>
        <OptionSlider>
          <OptionLabel>{label}</OptionLabel>
          <Slider value={value} onUpdate={this.handleSliderUpdate} />
        </OptionSlider>
        <OptionInputWrapper>
          <OptionInput
            value={percentage}
            onChange={this.handleInputChange}
            readonly
          />
        </OptionInputWrapper>
      </OptionRow>
    )
  }
}

const TwoLabels = styled.div`
  display: flex;
  justify-content: space-between;
`

const Part = styled.div`
  padding: 20px 0;
  h2 {
    margin-top: 20px;
    &:first-child {
      margin-top: 0;
    }
  }
`

const OptionRow = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 0;
`

const OptionRadio = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
`

const OptionSlider = styled.div`
  position: relative;
  display: flex;
  flex-shrink: 1;
  flex-direction: column;
  width: 100%;
`

const OptionLabel = styled.div`
  position: absolute;
  top: -15px;
  left: 20px;
`

const OptionInputWrapper = styled.div`
  position: relative;
  &:after {
    content: '%';
    position: absolute;
    right: 14px;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    color: #b3b3b3;
    pointer-events: none;
  }
`

const OptionInput = styled(TextInput)`
  width: 65px;
  text-align: right;
  padding-right: 30px;

  /* disabled style */
  color: ${theme.textSecondary};
  box-shadow: none;
  cursor: default;
`

const Label = styled(Text).attrs({
  smallcaps: true,
  color: theme.textSecondary,
})`
  display: block;
  margin-bottom: 10px;
`

const Footer = styled.div`
  margin-top: 80px;
`

export default VotingPanel
