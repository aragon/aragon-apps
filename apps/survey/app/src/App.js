import React from 'react'
import PropTypes from 'prop-types'
import BigNumber from 'bignumber.js'
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
      openedSurveyId: null,
      openedSurveyRect: {},
      votingPanelOpened: false,
      votingPanelSurveyId: null,
      newSurveyPanelOpened: false,
      settingsLoaded: false,
      surveys: [],
      tokenContract: this.getTokenContract(props.tokenAddress),
    }

    this.prepareSurveys(props.userAccount, props.surveys)
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
    const { settingsLoaded } = this.state
    const { surveys, userAccount } = this.props

    // Is this the first time we've loaded the settings?
    if (!settingsLoaded && hasLoadedSurveySettings(nextProps)) {
      this.setState({
        settingsLoaded: true,
      })
    }

    // Update the token contract
    if (nextProps.tokenAddress !== this.props.tokenAddress) {
      const tokenContract = this.getTokenContract(nextProps.tokenAddress)
      this.setState({ tokenContract })
      this.prepareSurveys(
        nextProps.surveys,
        nextProps.userAccount,
        tokenContract
      )
    }

    if (
      nextProps.surveys !== surveys ||
      nextProps.userAccount !== userAccount
    ) {
      this.prepareSurveys(
        nextProps.surveys,
        nextProps.userAccount,
        this.getTokenContract(nextProps.tokenAddress)
      )
    }
  }

  // Add user-related data to every survey object
  async prepareSurveys(surveys, userAccount, tokenContract) {
    if (!tokenContract) {
      return surveys
    }
    const preparedSurveys = await Promise.all(
      surveys.map(async survey => {
        const { snapshotBlock } = survey.data
        const userBalance = await new Promise((resolve, reject) => {
          tokenContract
            .balanceOfAt(userAccount, snapshotBlock)
            .first()
            .subscribe(resolve, reject)
        })
        return { ...survey, userBalance: new BigNumber(userBalance) }
      })
    )

    this.setState({ surveys: preparedSurveys })
  }
  getSurvey(id) {
    return this.state.surveys.find(survey => survey.surveyId === id)
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
  render() {
    const { tokenSymbol, tokenDecimals, app } = this.props
    const {
      surveys,
      openedSurveyId,
      openedSurveyRect,
      votingPanelSurveyId,
      votingPanelOpened,
      newSurveyPanelOpened,
    } = this.state
    const openedSurvey = this.getSurvey(openedSurveyId)
    const votingPanelSurvey = this.getSurvey(votingPanelSurveyId)
    return (
      <PublicUrl.Provider url="./aragon-ui/">
        <BaseStyles />
        <AppView
          appBar={
            <AppBar
              view={openedSurvey ? 'survey' : 'surveys'}
              tokenSymbol={tokenSymbol}
              tokenDecimals={tokenDecimals}
              onOpenNewSurveyPanel={this.handleOpenNewSurveyPanel}
              onBack={this.handleCloseSurveyDetails}
            />
          }
        >
          <Transition
            native
            from={{ showProgress: 0 }}
            enter={{ showProgress: 1 }}
            leave={{ showProgress: 0 }}
            surveys={surveys}
            onCardRef={this.handleCardRef}
            onOpenVotingPanel={this.handleOpenVotingPanel}
            onCloseVotingPanel={this.handleCloseVotingPanel}
            onOpenSurveyDetails={this.handleOpenSurveyDetails}
          >
            {!openedSurvey && SurveysWrapper}
          </Transition>
          <Survey
            survey={openedSurvey}
            transitionFrom={openedSurveyRect}
            onOpenVotingPanel={this.handleOpenVotingPanel}
          />
        </AppView>
        <NewSurveyPanel
          opened={newSurveyPanelOpened}
          onClose={this.handlePanelClose}
        />
        <VotingPanel
          tokenSymbol={tokenSymbol}
          tokenDecimals={tokenDecimals}
          survey={votingPanelSurvey}
          opened={votingPanelOpened}
          onClose={this.handlePanelClose}
          app={app}
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
  const now = new Date()
  return observable.map(state => ({
    ...state,
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
  }))
}, {})(App)
