import React from 'react'
import PropTypes from 'prop-types'
import { isBefore } from 'date-fns'
import { AppView, BaseStyles, PublicUrl, observe } from '@aragon/ui'
import { Transition, animated } from 'react-spring'
import tokenBalanceOfAtAbi from './abi/token-balanceOfAt.json'
import tokenDecimalsAbi from './abi/token-decimals.json'
import NewSurveyPanel from './components/NewSurveyPanel/NewSurveyPanel'
import VotingPanel from './components/VotingPanel/VotingPanel'
import Survey from './components/Survey/Survey'
import Surveys from './components/Surveys/Surveys'
import AppBar from './components/AppBar/AppBar'
import { networkContextType } from './provide-network'
import { hasLoadedSurveySettings, DURATION_SLICES } from './survey-settings'
import { getTimeBucket } from './time-utils'
import { makeEtherscanBaseUrl } from './utils'

const tokenAbi = [].concat(tokenBalanceOfAtAbi, tokenDecimalsAbi)

class App extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
    userAccount: PropTypes.string.isRequired,
  }
  static defaultProps = {
    network: {},
    minParticipationPct: null,
    pctBase: null,
    surveys: [],
    surveyTime: null,
    tokenAddress: null,
    tokenDecimals: 18,
    tokenSymbol: '',
  }
  static childContextTypes = {
    network: networkContextType,
  }
  constructor(props) {
    super(props)
    this.state = {
      newSurveyPanelOpened: false,
      openedSurveyId: null,
      openedSurveyRect: {},
      tokenContract: this.getTokenContract(props.tokenAddress),
      userAccountVotes: new Map(),
      votingPanelOpened: false,
      votingPanelSurveyId: null,
    }
  }
  getChildContext() {
    const { network } = this.props

    return {
      network: {
        etherscanBaseUrl: makeEtherscanBaseUrl(network.type),
        type: network.type,
      },
    }
  }
  componentWillReceiveProps(nextProps) {
    // Update the token contract
    if (nextProps.tokenAddress !== this.props.tokenAddress) {
      this.setState({
        tokenContract: this.getTokenContract(nextProps.tokenAddress),
      })
    }

    // Refresh the account votes if the account changes,
    // or if there is any vote update.
    if (
      nextProps.surveys !== this.props.surveys ||
      nextProps.userAccount !== this.props.userAccount
    ) {
      this.loadUserAccountVotes(nextProps.userAccount, nextProps.surveys)
    }
  }
  getSurvey(surveys, id) {
    return surveys.find(survey => survey.surveyId === id)
  }
  getTokenContract(tokenAddress) {
    return tokenAddress && this.props.app.external(tokenAddress, tokenAbi)
  }
  handleOpenSurveyDetails = id => {
    // Try to get the card rectangle before opening it
    // So we can animate from the card to the expanded view
    const cardElt = this._cardRefs.get(id)
    const rect = cardElt ? cardElt.getBoundingClientRect() : null
    this.setState({ openedSurveyId: id, openedSurveyRect: rect })
  }
  handlePanelClose = () => {
    this.setState({
      openedSurveyId: false,
      votingPanelOpened: false,
      newSurveyPanelOpened: false,
    })
  }
  handleOpenVotingPanel = id => {
    this.setState({
      votingPanelOpened: true,
      votingPanelSurveyId: id,
    })
  }
  handleOpenNewSurveyPanel = () => {
    // this.setState({ newSurveyPanelOpened: true })
  }
  handleCloseSurveyDetails = () => {
    this.setState({ openedSurveyId: null })
  }
  handleCardRef = ({ id, element }) => {
    if (!this._cardRefs) {
      this._cardRefs = new Map()
    }
    this._cardRefs.set(id, element)
  }
  async loadUserAccountVotes(userAccount, surveys) {
    const { app } = this.props

    if (!userAccount) {
      this.setState({ userAccountVotes: new Map() })
      return
    }

    this.setState({
      userAccountVotes: new Map(
        await Promise.all(
          surveys.map(
            survey =>
              new Promise((resolve, reject) => {
                app
                  .call('getVoterState', survey.surveyId, userAccount)
                  .subscribe(
                    result =>
                      // Voter has voted if the number of options (first array in result) is
                      // non-empty
                      resolve([
                        survey.Id,
                        Array.isArray(result) && result[0].length > 0,
                      ]),
                    reject
                  )
              })
          )
        )
      ),
    })
  }
  render() {
    const { app, surveys, tokenSymbol, tokenDecimals, userAccount } = this.props
    const {
      newSurveyPanelOpened,
      openedSurveyId,
      openedSurveyRect,
      tokenContract,
      userAccountVotes,
      votingPanelSurveyId,
      votingPanelOpened,
    } = this.state

    const preparedSurveys = surveys.map(survey => ({
      ...survey,
      userAccountVoted: userAccountVotes.get(survey.surveyId),
    }))
    const openedSurvey = this.getSurvey(preparedSurveys, openedSurveyId)
    const votingPanelSurvey = this.getSurvey(
      preparedSurveys,
      votingPanelSurveyId
    )

    return (
      <PublicUrl.Provider url="./aragon-ui/">
        <BaseStyles />
        <AppView
          appBar={
            <AppBar
              view={openedSurvey ? 'survey' : 'surveys'}
              onBack={this.handleCloseSurveyDetails}
              onOpenNewSurveyPanel={this.handleOpenNewSurveyPanel}
              tokenSymbol={tokenSymbol}
              tokenDecimals={tokenDecimals}
            />
          }
        >
          <Transition
            native
            from={{ showProgress: 0 }}
            enter={{ showProgress: 1 }}
            leave={{ showProgress: 0 }}
            surveys={preparedSurveys}
            onCardRef={this.handleCardRef}
            onOpenVotingPanel={this.handleOpenVotingPanel}
            onCloseVotingPanel={this.handleCloseVotingPanel}
            onOpenSurveyDetails={this.handleOpenSurveyDetails}
          >
            {!openedSurvey && SurveysWrapper}
          </Transition>
          <Survey
            onOpenVotingPanel={this.handleOpenVotingPanel}
            survey={openedSurvey}
            transitionFrom={openedSurveyRect}
          />
        </AppView>
        <NewSurveyPanel
          onClose={this.handlePanelClose}
          opened={newSurveyPanelOpened}
        />
        <VotingPanel
          app={app}
          onClose={this.handlePanelClose}
          opened={votingPanelOpened}
          survey={votingPanelSurvey}
          tokenContract={tokenContract}
          tokenSymbol={tokenSymbol}
          tokenDecimals={tokenDecimals}
          user={userAccount}
        />
      </PublicUrl.Provider>
    )
  }
}

const SurveysWrapper = ({
  showProgress,
  surveys,
  onOpenSurveyDetails,
  onOpenVotingPanel,
  onCloseVotingPanel,
  onCardRef,
}) => (
  <animated.div style={{ opacity: showProgress }}>
    <Surveys
      surveys={surveys}
      onOpenSurveyDetails={onOpenSurveyDetails}
      onOpenVotingPanel={onOpenVotingPanel}
      onCloseVotingPanel={onCloseVotingPanel}
      onCardRef={onCardRef}
    />
  </animated.div>
)

export default observe(observable => {
  return observable.map(state => {
    const appStateReady = hasLoadedSurveySettings(state)
    if (!appStateReady) {
      return {
        ...state,
        appStateReady,
      }
    }

    const now = new Date()
    return {
      ...state,
      appStateReady,

      // Transform the survey data for the frontend
      surveys:
        state && state.surveys
          ? state.surveys.map(survey => {
              const { pctBase, surveyTime, tokenDecimals } = state
              const { data, options, optionsHistory } = survey
              const tokenMultiplier = Math.pow(10, tokenDecimals)
              const endDate = new Date(data.startDate + surveyTime)
              const startDate = new Date(data.startDate)

              const nowBucket = getTimeBucket(
                Date.now(),
                data.startDate,
                surveyTime,
                DURATION_SLICES
              )

              return {
                ...survey,
                data: {
                  ...data,
                  endDate,
                  startDate,
                  open: isBefore(now, endDate),
                  minParticipationPct: data.minParticipationPct / pctBase,
                  participation: data.participation / tokenMultiplier,
                  votingPower: data.votingPower / tokenMultiplier,
                },
                options: options.map(({ power, ...option }) => ({
                  ...option,
                  power: power / tokenMultiplier,
                })),
                optionsHistory: {
                  ...optionsHistory,
                  options: optionsHistory.options.map(optionHistory =>
                    optionHistory.reduce((powers, power, index) => {
                      if (index <= nowBucket) {
                        // Adjust power for participation (so it's a percentage of total participation)
                        // If there's no power filled in this slot (-1 signifies it's sparse), fill it
                        // in with the previous power (and use 0 for the first index if so)
                        powers.push(
                          power !== -1
                            ? power / data.participation // no need to adjust for decimals
                            : index === 0
                            ? 0
                            : powers[index - 1]
                        )
                      }
                      return powers
                    }, [])
                  ),
                },
              }
            })
          : [],
    }
  })
}, {})(App)
