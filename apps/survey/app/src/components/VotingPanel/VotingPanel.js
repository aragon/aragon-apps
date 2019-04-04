import React from 'react'
import styled from 'styled-components'
import BN from 'BN.js'
import { format } from 'date-fns'
import {
  theme,
  Button,
  Countdown,
  IdentityBadge,
  Info,
  RadioButton,
  SafeLink,
  SidePanel,
  SidePanelSeparator,
  Slider,
  Text,
  TextInput,
} from '@aragon/ui'
import {
  formatNumber,
  percentageList,
  scaleBNValuesSet,
} from '../../math-utils'
import provideNetwork from '../../provide-network'
import { log } from '../../utils'

const formatDate = date =>
  `${format(date, 'dd/MM/yy')} at ${format(date, 'HH:mm')} UTC`

class VotingPanel extends React.Component {
  state = {
    distribution: [],
    loadingCanVote: true,
    survey: null,
    tokenContract: null,
    user: null,
    userCanVote: false,
    userBalance: null,
  }

  static getDerivedStateFromProps(props, state) {
    const userUpdate = props.user !== state.user
    const surveyUpdate =
      props.survey &&
      (!state.survey || props.survey.surveyId !== state.survey.surveyId)
    const contractUpdate = props.tokenContract !== state.tokenContract

    if (!userUpdate && !surveyUpdate && !contractUpdate) {
      return null
    }

    const stateUpdate = {
      survey: props.survey,
      tokenContract: props.tokenContract,
      user: props.user,
    }
    if (userUpdate || surveyUpdate) {
      stateUpdate.loadingCanVote = true
      stateUpdate.userBalance = null
    }
    if (surveyUpdate) {
      stateUpdate.distribution = [
        ...new Array(props.survey.options.length),
      ].fill(0)
    }
    if (contractUpdate) {
      stateUpdate.userBalance = null
    }

    return stateUpdate
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
      return distribution.map((_, i) =>
        i === index ? value : (1 - value) / (distribution.length - 1)
      )
    }

    // Update others based on their previous value size
    const updateOtherValue = prevValue => {
      return prevValue === 0
        ? 0
        : prevValue - ((othersTotal + value - 1) * prevValue) / othersTotal
    }

    return distribution.map((prevValue, i) =>
      i === index ? value : updateOtherValue(prevValue)
    )
  }

  componentDidMount() {
    const { survey, tokenContract, user } = this.state
    this.loadUserBalance(user, survey, tokenContract)
    this.loadUserCanVote(user, survey)
  }

  componentDidUpdate() {
    const {
      loadingCanVote,
      survey,
      tokenContract,
      user,
      userBalance,
    } = this.state

    if (loadingCanVote) {
      this.loadUserCanVote(user, survey)
    }
    if (userBalance === null) {
      this.loadUserBalance(user, survey, tokenContract)
    }
  }

  getDistributionPairs() {
    const { distribution } = this.state
    const percentages = percentageList(distribution)

    return distribution.map((value, i) => ({
      value,
      percentage: percentages[i],
    }))
  }

  canSubmitVote() {
    const { distribution, userCanVote } = this.state
    return userCanVote && distribution.reduce((total, v) => total + v, 0) > 0
  }

  handleOptionUpdate = (id, value) => {
    const { survey } = this.state
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

    const { app, tokenDecimals } = this.props
    const { distribution, survey, userBalance } = this.state

    const optionVotes = scaleBNValuesSet(distribution, new BN(userBalance))
      .map((stake, i) => ({
        id: survey.options[i].optionId,
        stake,
      }))
      .filter(({ stake }) => stake.gt(new BN(0)))
      .map(({ stake, ...option }) => ({
        ...option,
        stake: stake.mul(new BN(10).pow(new BN(tokenDecimals))).toString(),
      }))

    // Transforms [ { id: 'foo', stake: 123 }, { id: 'bar', stake: 456 } ]
    // into [ ['foo', 'bar'], ['123', '456'] ]
    const [ids, stakes] = optionVotes.reduce(
      ([ids, stakes], { id, stake }) => [[...ids, id], [...stakes, stake]],
      [[], []]
    )

    log(`
      app.voteOptions(
        "${survey.surveyId}",
        [${ids.map(s => `"${s}"`)}],
        [${stakes.map(s => `"${s.toString()}"`)}]
      )
    `)

    // Detect if only one option is being voted on
    if (stakes.filter(stake => stake > 0).length === 1) {
      const singleOptionIndex = stakes.findIndex(stake => stake > 0)
      if (singleOptionIndex !== -1) {
        app.voteOption(
          survey.surveyId,
          ids[singleOptionIndex],
          stakes[singleOptionIndex]
        )
        return
      }
    }

    app.voteOptions(survey.surveyId, ids, stakes)
  }

  loadUserBalance = async (user, survey, tokenContract) => {
    const { tokenDecimals } = this.props
    if (survey && tokenContract && user) {
      try {
        const balance = await tokenContract
          .balanceOfAt(user, survey.data.snapshotBlock)
          .toPromise()
        const adjustedBalance = Math.floor(
          parseInt(balance, 10) / Math.pow(10, tokenDecimals)
        )
        this.setState({ userBalance: adjustedBalance })
      } catch (err) {
        this.setState({ userBalance: -1 })
      }
    }
  }

  loadUserCanVote = async (user, survey) => {
    const { app } = this.props

    if (!survey) {
      return
    }

    if (!user) {
      // Note: if the account is not present, we assume the account is not connected.
      this.setState({
        loadingCanVote: false,
        userCanVote: Boolean(survey) && survey.data.open,
      })
    }

    try {
      // Get if user can vote
      const userCanVote = await app
        .call('canVote', survey.surveyId, user)
        .toPromise()
      this.setState({ userCanVote, loadingCanVote: false })
    } catch (err) {
      this.setState({ loadingCanVote: false, userCanVote: false })
    }
  }

  render() {
    const { network, opened, onClose, tokenSymbol } = this.props
    const { survey, userBalance, userCanVote } = this.state
    const distributionPairs = this.getDistributionPairs()

    const hasUserBalance = userBalance && userBalance > 0
    const enableSubmit = this.canSubmitVote()

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
                <Creator>
                  <IdentityBadge
                    entity={survey.data.creator}
                    networkType={network.type}
                  />
                </Creator>
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

              {(() => {
                if (survey.userAccountVoted) {
                  return (
                    <Info.Action>
                      You have already voted{' '}
                      {hasUserBalance &&
                        `with ${formatNumber(
                          userBalance,
                          2
                        )} ${tokenSymbol}`}{' '}
                      but you may recast your vote until the survey closes.
                    </Info.Action>
                  )
                }
                if (userCanVote && hasUserBalance) {
                  return (
                    <Info.Action>
                      <div>
                        Voting with your {formatNumber(userBalance, 2)}{' '}
                        {tokenSymbol}, since it was your balance when the survey
                        was created ({formatDate(survey.data.startDate)}.
                      </div>
                      <NoTokenCost />
                    </Info.Action>
                  )
                }
                if (userCanVote) {
                  return (
                    <Info.Action>
                      You may be able to vote, and will need to connect your
                      account in the next screen.
                    </Info.Action>
                  )
                }
                return (
                  <Info.Action>
                    This account cannot cast a vote because it did not hold any{' '}
                    {tokenSymbol} at the time this survey was created.
                  </Info.Action>
                )
              })()}

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
          <OptionLabel title={label}>{label}</OptionLabel>
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

const Creator = styled.div`
  display: flex;
  align-items: center;
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
  width: calc(100% - 35px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

const NoTokenCost = () => (
  <p css="margin-top: 10px">
    Performing this action will{' '}
    <span css="font-weight: bold">not transfer out</span> any of your tokens.
    You’ll only have to pay for the{' '}
    <SafeLink href="https://ethgas.io/" target="_blank">
      ETH fee
    </SafeLink>{' '}
    when signing the transaction.
  </p>
)

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

export default provideNetwork(VotingPanel)
