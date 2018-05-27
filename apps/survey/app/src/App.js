import React from 'react'
import PropTypes from 'prop-types'
import { isBefore } from 'date-fns'
import { AppView, AragonApp, observe } from '@aragon/ui'
import { Transition, animated } from 'react-spring'
import tokenBalanceOfAtAbi from './abi/token-balanceOfAt.json'
import tokenDecimalsAbi from './abi/token-decimals.json'
import NewSurveyPanel from './components/NewSurveyPanel/NewSurveyPanel'
import VotingPanel from './components/VotingPanel/VotingPanel'
import Survey from './components/Survey/Survey'
import Surveys from './components/Surveys/Surveys'
import AppBar from './components/AppBar/AppBar'
import { networkContextType } from './provide-network'
import { hasLoadedSurveySettings } from './survey-settings'
import { makeEtherscanBaseUrl } from './utils'

const { ETHEREUM_NETWORK = 'rinkeby' } = process.env

const tokenAbi = [].concat(tokenBalanceOfAtAbi, tokenDecimalsAbi)

class App extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
  }
  static defaultProps = {
    network: {
      etherscanBaseUrl: makeEtherscanBaseUrl(ETHEREUM_NETWORK),
      name: ETHEREUM_NETWORK,
    },
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
      tokenContract: this.getTokenContract(props.tokenAddress),
    }
  }
  getChildContext() {
    return { network: this.props.network }
  }
  componentWillReceiveProps(nextProps) {
    const { settingsLoaded } = this.state
    // Is this the first time we've loaded the settings?
    if (!settingsLoaded && hasLoadedSurveySettings(nextProps)) {
      this.setState({
        settingsLoaded: true,
      })
    }
    if (nextProps.tokenAddress !== this.props.tokenAddress) {
      this.setState({
        tokenContract: this.getTokenContract(nextProps.tokenAddress),
      })
    }
  }
  getSurvey = id => {
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
    const { surveys, tokenSymbol } = this.props
    const {
      openedSurveyId,
      openedSurveyRect,
      votingPanelSurveyId,
      votingPanelOpened,
      newSurveyPanelOpened,
    } = this.state
    const openedSurvey = this.getSurvey(openedSurveyId)
    const votingPanelSurvey = this.getSurvey(votingPanelSurveyId)
    return (
      <AragonApp publicUrl="/aragon-ui/">
        <AppView
          appBar={
            <AppBar
              view={openedSurvey ? 'survey' : 'surveys'}
              token={tokenSymbol}
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
          <Survey survey={openedSurvey} transitionFrom={openedSurveyRect} />
        </AppView>
        <NewSurveyPanel
          opened={newSurveyPanelOpened}
          onClose={this.handlePanelClose}
        />
        <VotingPanel
          survey={votingPanelSurvey}
          opened={votingPanelOpened}
          onClose={this.handlePanelClose}
        />
      </AragonApp>
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
    surveys: state.surveys.map(survey => {
      const { pctBase, surveyTime } = state
      const { data } = survey
      const endDate = new Date(data.startDate + surveyTime)
      const startDate = new Date(data.startDate)
      return {
        ...survey,
        data: {
          ...data,
          endDate,
          startDate,
          open: isBefore(now, endDate),
          minParticipationPct: data.minParticipationPct / pctBase,
          participation: data.participation / pctBase,
        },
      }
    }),
  }))
}, {})(App)
