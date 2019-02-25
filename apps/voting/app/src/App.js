import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Main, SidePanel, observe } from '@aragon/ui'
import BN from 'bn.js'
import EmptyState from './screens/EmptyState'
import Votes from './screens/Votes'
import tokenAbi from './abi/token-balanceOfAt.json'
import VotePanelContent from './components/VotePanelContent'
import NewVotePanelContent from './components/NewVotePanelContent'
import AutoLink from './components/AutoLink'
import MenuButton from './components/MenuButton/MenuButton'
import AppLayout from './components/AppLayout'
import NewVoteIcon from './components/NewVoteIcon'
import { networkContextType } from './utils/provideNetwork'
import { settingsContextType } from './utils/provideSettings'
import { hasLoadedVoteSettings } from './vote-settings'
import { VOTE_YEA } from './vote-types'
import { EMPTY_CALLSCRIPT } from './evmscript-utils'
import { makeEtherscanBaseUrl } from './utils'
import { isVoteOpen, voteTypeFromContractEnum } from './vote-utils'
import { shortenAddress, transformAddresses } from './web3-utils'

class App extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
    sendMessageToWrapper: PropTypes.func.isRequired,
  }
  static defaultProps = {
    appStateReady: false,
    network: {},
    tokenSymbol: '',
    userAccount: '',
    votes: [],
  }
  static childContextTypes = {
    network: networkContextType,
    settings: settingsContextType,
  }
  getChildContext() {
    const { network, pctBase, voteTime } = this.props

    return {
      network: {
        etherscanBaseUrl: makeEtherscanBaseUrl(network.type),
        type: network.type,
      },
      settings: {
        pctBase,
        voteTime,
      },
    }
  }

  constructor(props) {
    super(props)

    this.state = {
      createVoteVisible: false,
      currentVoteId: -1,
      tokenContract: this.getTokenContract(props.tokenAddress),
      voteVisible: false,
      voteSidebarOpened: false,
      userAccountVotes: new Map(),
    }
  }
  componentWillReceiveProps(nextProps) {
    // Refresh the token contract if its address changes
    if (nextProps.tokenAddress !== this.props.tokenAddress) {
      this.setState({
        tokenContract: this.getTokenContract(nextProps.tokenAddress),
      })
    }

    // Refresh the account votes if the account changes,
    // or if there is any vote update.
    if (
      nextProps.votes !== this.props.votes ||
      nextProps.userAccount !== this.props.userAccount
    ) {
      this.loadUserAccountVotes(nextProps.userAccount, nextProps.votes)
    }
  }

  async loadUserAccountVotes(userAccount, votes) {
    const { app } = this.props

    if (!userAccount) {
      this.setState({ userAccountVotes: new Map() })
      return
    }

    this.setState({
      userAccountVotes: new Map(
        await Promise.all(
          votes.map(
            vote =>
              new Promise((resolve, reject) => {
                app
                  .call('getVoterState', vote.voteId, userAccount)
                  .subscribe(result => resolve([vote.voteId, result]), reject)
              })
          )
        )
      ),
    })
  }

  getTokenContract(tokenAddress) {
    return tokenAddress && this.props.app.external(tokenAddress, tokenAbi)
  }
  handleCreateVote = question => {
    this.props.app.newVote(EMPTY_CALLSCRIPT, question)
    this.handleCreateVoteClose()
  }
  handleCreateVoteOpen = () => {
    this.setState({ createVoteVisible: true })
  }
  handleCreateVoteClose = () => {
    this.setState({ createVoteVisible: false })
  }
  handleVoteOpen = voteId => {
    const exists = this.props.votes.some(vote => voteId === vote.voteId)
    if (!exists) return
    this.setState({
      currentVoteId: voteId,
      voteVisible: true,
      voteSidebarOpened: false,
    })
  }
  handleVote = (voteId, voteType, executesIfDecided = true) => {
    this.props.app.vote(voteId, voteType === VOTE_YEA, executesIfDecided)
    this.handleVoteClose()
  }
  handleExecute = voteId => {
    this.props.app.executeVote(voteId)
    this.handleVoteClose()
  }
  handleVoteClose = () => {
    this.setState({ voteVisible: false })
  }
  handleVoteTransitionEnd = opened => {
    this.setState(opened ? { voteSidebarOpened: true } : { currentVoteId: -1 })
  }

  handleMenuPanelOpen = () => {
    this.props.sendMessageToWrapper('menuPanel', true)
  }

  shortenAddresses(label) {
    return transformAddresses(label, (part, isAddress, index) =>
      isAddress ? (
        <span title={part} key={index}>
          {shortenAddress(part)}
        </span>
      ) : (
        <span key={index}>{part}</span>
      )
    )
  }
  // Shorten addresses, render line breaks, auto link
  renderVoteText(description) {
    return (
      description && (
        <AutoLink>
          {description.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {this.shortenAddresses(line)}
              <br />
            </React.Fragment>
          ))}
        </AutoLink>
      )
    )
  }
  render() {
    const {
      app,
      appStateReady,
      tokenDecimals,
      tokenSymbol,
      userAccount,
      votes,
    } = this.props

    const {
      createVoteVisible,
      currentVoteId,
      tokenContract,
      voteSidebarOpened,
      voteVisible,
      userAccountVotes,
    } = this.state

    const now = new Date()

    // Add useful properties to the votes
    const preparedVotes = appStateReady
      ? votes.map(vote => ({
          ...vote,
          data: {
            ...vote.data,
            open: isVoteOpen(vote, now),

            // Render text fields
            descriptionNode: this.renderVoteText(vote.data.description),
            metadataNode: this.renderVoteText(vote.data.metadata),
          },
          userAccountVote: voteTypeFromContractEnum(
            userAccountVotes.get(vote.voteId)
          ),
        }))
      : votes

    const currentVote =
      currentVoteId === -1
        ? null
        : preparedVotes.find(vote => vote.voteId === currentVoteId)
    const hasCurrentVote = appStateReady && Boolean(currentVote)

    return (
      <div css="min-width: 320px">
        <Main>
          <AppLayout
            title="Voting"
            onMenuOpen={this.handleMenuPanelOpen}
            mainButton={{
              label: 'New vote',
              icon: <NewVoteIcon />,
              onClick: this.handleCreateVoteOpen,
            }}
          >
            {appStateReady && votes.length > 0 ? (
              <Votes votes={preparedVotes} onSelectVote={this.handleVoteOpen} />
            ) : (
              <EmptyState onActivate={this.handleCreateVoteOpen} />
            )}
          </AppLayout>
          <SidePanel
            title={`Vote #${currentVoteId} (${
              currentVote && currentVote.data.open ? 'Open' : 'Closed'
            })`}
            opened={hasCurrentVote && !createVoteVisible && voteVisible}
            onClose={this.handleVoteClose}
            onTransitionEnd={this.handleVoteTransitionEnd}
          >
            {hasCurrentVote && (
              <VotePanelContent
                app={app}
                vote={currentVote}
                user={userAccount}
                ready={voteSidebarOpened}
                tokenContract={tokenContract}
                tokenDecimals={tokenDecimals}
                tokenSymbol={tokenSymbol}
                onVote={this.handleVote}
                onExecute={this.handleExecute}
              />
            )}
          </SidePanel>

          <SidePanel
            title="New Vote"
            opened={createVoteVisible}
            onClose={this.handleCreateVoteClose}
          >
            <NewVotePanelContent
              opened={createVoteVisible}
              onCreateVote={this.handleCreateVote}
            />
          </SidePanel>
        </Main>
      </div>
    )
  }
}

export default observe(
  observable =>
    observable.map(state => {
      const appStateReady = hasLoadedVoteSettings(state)
      if (!appStateReady) {
        return {
          ...state,
          appStateReady,
        }
      }

      const { pctBase, tokenDecimals, voteTime, votes } = state

      const pctBaseNum = parseInt(pctBase, 10)
      const tokenDecimalsNum = parseInt(tokenDecimals, 10)
      const tokenDecimalsBaseNum = Math.pow(10, tokenDecimalsNum)

      return {
        ...state,

        appStateReady,
        pctBase: new BN(pctBase),
        tokenDecimals: new BN(tokenDecimals),

        numData: {
          pctBase: pctBaseNum,
          tokenDecimals: tokenDecimalsNum,
        },

        // Transform the vote data for the frontend
        votes: votes
          ? votes.map(vote => {
              const { data } = vote
              return {
                ...vote,
                data: {
                  ...data,
                  endDate: new Date(data.startDate + voteTime),
                  minAcceptQuorum: new BN(data.minAcceptQuorum),
                  nay: new BN(data.nay),
                  supportRequired: new BN(data.supportRequired),
                  votingPower: new BN(data.votingPower),
                  yea: new BN(data.yea),
                },
                numData: {
                  minAcceptQuorum:
                    parseInt(data.minAcceptQuorum, 10) / pctBaseNum,
                  nay: parseInt(data.nay, 10) / tokenDecimalsBaseNum,
                  supportRequired:
                    parseInt(data.supportRequired, 10) / pctBaseNum,
                  votingPower:
                    parseInt(data.votingPower, 10) / tokenDecimalsBaseNum,
                  yea: parseInt(data.yea, 10) / tokenDecimalsBaseNum,
                },
              }
            })
          : [],
      }
    }),
  {}
)(App)
