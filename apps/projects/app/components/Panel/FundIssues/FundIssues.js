import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { addHours } from 'date-fns'
import BigNumber from 'bignumber.js'
import { useAragonApi } from '../../../api-react'
import useGithubAuth from '../../../hooks/useGithubAuth'
import { usePanelManagement } from '..'
import { computeIpfsString } from '../../../utils/ipfs-helpers'
import { toHex } from 'web3-utils'
import { IconClose } from '@aragon/ui'
import NoFunds from '../../../assets/noFunds.svg'
import {
  Button,
  DropDown,
  GU,
  Help,
  Info,
  LoadingRing,
  Switch,
  Text,
  TextInput,
  useTheme,
} from '@aragon/ui'

import { Form, FormField, DateInput } from '../../Form'
import { issueShape } from '../../../utils/shapes.js'
import EditBounty from './EditBounty'
import {
  AmountInput,
  HorizontalInputGroup,
  HoursInput,
  IssueTitleCompact,
  TokenInput,
} from './styled'

const ETHER_TOKEN_FAKE_ADDRESS = '0x0000000000000000000000000000000000000000'

const errorMessages = {
  amount: ({ sayAmount, plural }) =>
    (sayAmount ? `Funding amount${plural ? 's' : ''}` : 'Estimated hours') +
    ' must be greater than zero',
  date: () => 'The deadline cannot be in the past',
  total: ({ inVault, sayTotal, symbol, total }) =>
    `The ${sayTotal ? 'total' : ''} funding amount of ${total} ${symbol} ` +
    `exceeds the available funds in the vault (${inVault} ${symbol}).`
}

const bountiesFor = ({ bountySettings, issues, tokens }) => issues.reduce(
  (bounties, issue) => {
    bounties[issue.id] = {
      fundingHistory: issue.fundingHistory || [],
      issueId: issue.id,
      repo: issue.repo,
      number: issue.number,
      repoId: issue.repoId,
      hours: issue.hours ? parseFloat(issue.hours) : '',
      exp: issue.exp || 0,
      deadline: issue.deadline
        ?  new Date(issue.deadline)
        : addHours(new Date(), bountySettings.bountyDeadline),
      slots: 1,
      slotsIndex: 0,
      payout: issue.payout || 0,
      token: tokens.find(t => t.symbol === issue.symbol) || tokens[0],
    }
    return bounties
  },
  {}
)

const BountyUpdate = ({
  issue,
  bounty,
  submitBounties,
  submitting,
  description,
  tokens,
  updateBounty,
}) => {
  const { appState: { bountySettings } } = useAragonApi()
  const [ submitDisabled, setSubmitDisabled ] = useState(false)
  const [ maxError, setMaxError ] = useState(false)
  const [ zeroError, setZeroError ] = useState(false)
  const [ dateError, setDateError ] = useState(false)

  const expLevels = bountySettings.expLvls

  useEffect(() => {
    const today = new Date()
    const maxErr = BigNumber(bounty.payout)
      .times(10 ** bounty.decimals)
      .gt(BigNumber(bounty.balance))
    const zeroErr = bounty.payout === 0
    const dateErr = today > bounty.deadline
    setMaxError(maxErr)
    setZeroError(zeroErr)
    setDateError(dateErr)
    setSubmitDisabled( maxErr || zeroErr || dateErr )
  }, [bounty])

  return (
    <>
      <Form
        css={`margin: ${2 * GU}px 0`}
        onSubmit={submitBounties}
        description={description}
        submitText={submitting
          ? <><LoadingRing /> Saving...</>
          : 'Submit'
        }
        submitDisabled={submitDisabled || submitting}
      >
        <FormField
          input={
            <React.Fragment>
              <div css={`
                padding: ${2 * GU}px 0;
                display: flex;
              `}>
                <IssueTitleCompact
                  title={issue.title}
                  tag={bounty && bounty.hours > 0
                    ? BigNumber(bounty.payout).dp(2) + ' ' + bounty.symbol
                    : ''
                  }
                />
              </div>

              <UpdateRow>
                { bountySettings.fundingModel === 'Fixed' ? (
                  <FormField
                    label="Amount"
                    input={
                      <HorizontalInputGroup>
                        <AmountInput
                          name="amount"
                          value={bounty.payout}
                          onChange={e => updateBounty({ payout: e.target.value })}
                          wide
                        />
                        <TokenInput
                          name="token"
                          items={tokens.map(t => t.symbol)}
                          selected={tokens.indexOf(bounty.token)}
                          onChange={i => updateBounty({ token: tokens[i] })}
                        />
                      </HorizontalInputGroup>
                    }
                  />
                ) : (
                  <FormField
                    label="Estimated Hours"
                    input={
                      <HoursInput
                        width="100%"
                        name="hours"
                        value={bounty.hours}
                        onChange={e => updateBounty({
                          hours: e.target.value && parseFloat(e.target.value)
                        })}
                      />
                    }
                  />
                )}

                <FormField
                  label="Difficulty"
                  input={
                    <DropDown
                      items={expLevels.map(exp => exp.name)}
                      onChange={index => updateBounty({ exp: index })}
                      selected={bounty.exp}
                      wide
                    />
                  }
                />
              </UpdateRow>

              <div css={`
                width: 100%;
                margin-bottom: ${3 * GU}px;
              `}>
                <FormField
                  label="Deadline"
                  input={
                    <DateInput
                      name='deadline'
                      value={bounty.deadline}
                      onChange={deadline => updateBounty({ deadline })}
                      width="100%"
                    />
                  }
                />
              </div>
            </React.Fragment>
          }
        />
      </Form>
      {maxError && <ErrorMessage text={errorMessages.total()} />}
      {zeroError &&
        <ErrorMessage text={
          errorMessages.amount({
            sayAmount: bountySettings.fundingModel === 'Fixed',
            plural: false,
          })}
        />
      }
      {dateError && <ErrorMessage text={errorMessages.date()} />}
    </>
  )
}
BountyUpdate.propTypes = {
  issue: issueShape,
  bounty: PropTypes.object.isRequired,
  submitBounties: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
  description: PropTypes.string.isRequired,
  tokens: PropTypes.array.isRequired,
  updateBounty: PropTypes.func.isRequired,
}

const FundForm = ({
  issues,
  bounties,
  submitting,
  submitBounties,
  description,
  tokens,
  descriptionChange,
  updateBounty,
  openSubmission,
  setOpenSubmission,
}) => {
  const { appState: { bountySettings } } = useAragonApi()
  const [ submitDisabled, setSubmitDisabled ] = useState(true)
  const [ maxErrors, setMaxErrors ] = useState([])
  const [ zeroError, setZeroError ] = useState([])
  const [ dateError, setDateError ] = useState([])
  const [ validate, setValidate ] = useState(false)

  useEffect(() => {
    setMaxErrors(tokens.reduce(
      (errors, token) => {
        const inVault = BigNumber(token.balance)
        const bountiesForToken = Object.values(bounties)
          .filter(b => b.token.symbol === token.symbol)
        const total = bountiesForToken.reduce(
          (sum, b) => sum.plus(BigNumber(b.payout || 0).times(10 ** token.decimals)),
          BigNumber(0)
        )
        if (total.gt(inVault)) {
          errors.push({
            inVault: inVault.div(10 ** token.decimals).dp(4).toString(),
            symbol: token.symbol,
            total: total.div(10 ** token.decimals).dp(4).toString(),
            sayTotal: bountiesForToken.length > 1,
          })
        }
        return errors
      },
      []
    ))
  }, [ tokens, bounties ])

  useEffect(() => {
    if (!validate) return
    const today = new Date()
    const zeroErrArray = []
    const dateErrArray = []
    Object.values(bounties).forEach(bounty => {
      if (!bounty.payout || bounty.payout === '0') zeroErrArray.push(bounty.issueId)
      if (today > bounty.deadline) dateErrArray.push(bounty.issueId)
    })
    setZeroError(zeroErrArray)
    setDateError(dateErrArray)
    setSubmitDisabled(
      description === '' ||
      !!maxErrors.length ||
      !!zeroErrArray.length ||
      !!dateErrArray.length
    )
  }, [ bounties, description, maxErrors ])

  return (
    <>
      <Form
        css={`margin: ${2 * GU}px 0`}
        onSubmit={submitBounties}
        description={description}
        submitText={submitting
          ? <><LoadingRing /> Saving...</>
          : issues.length > 1 ? 'Fund Issues' : 'Fund Issue'
        }
        submitDisabled={submitDisabled || submitting}
      >
        <FormField
          label="Description"
          required
          input={
            <TextInput.Multiline
              rows="3"
              name="description"
              style={{ resize: 'none' }}
              onChange={descriptionChange}
              value={description}
              wide
            />
          }
        />
        <FormField
          label="Work terms"
          input={
            <div css={`
              display: flex;
              justify-content: space-between;
              margin: ${GU}px 0 ${2 * GU}px 0;
            `}>
              <Text css="display: flex">
                Applications required to work on issues&nbsp;
                <Help hint="The work terms" css={`margin-left: ${.5 * GU}`}>
                  By default, the issues in this funding proposal will not require
                  applications to work on a bounty before work is submitted.
                  To require applications, click on the switch to enable this term.
                </Help>
              </Text>
              <Switch
                checked={!openSubmission}
                onChange={() => setOpenSubmission(!openSubmission)}
              />
            </div>
          }
        />

        <FormField
          label="Issues"
          required
          input={
            <>
              <Text css={`display: flex; display: block; margin: ${GU}px 0 ${2 * GU}px 0`}>
                Enter the estimated hours per issue
              </Text>
              <React.Fragment>
                {issues.map(issue => (
                  <EditBounty
                    key={issue.id}
                    issue={issue}
                    bounty={bounties[issue.id]}
                    tokens={tokens}
                    onFocus={() => setValidate(true)}
                    updateBounty={updateBounty(issue.id)}
                  />
                ))}
              </React.Fragment>
            </>
          }
        />
      </Form>
      {maxErrors.map((maxError, i) => (
        <ErrorMessage key={i} text={errorMessages.total(maxError)} />
      ))}
      {!!zeroError.length &&
        <ErrorMessage text={
          errorMessages.amount({
            sayAmount: bountySettings.fundingModel === 'Fixed',
            plural: issues.length > 1,
          })}
        />
      }
      {!!dateError.length && <ErrorMessage text={errorMessages.date()} />}
    </>
  )
}

FundForm.propTypes = {
  issues: PropTypes.arrayOf(issueShape),
  bounties: PropTypes.object.isRequired,
  submitBounties: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
  description: PropTypes.string.isRequired,
  tokens: PropTypes.array.isRequired,
  descriptionChange: PropTypes.func.isRequired,
  updateBounty: PropTypes.func.isRequired,
  openSubmission: PropTypes.bool.isRequired,
  setOpenSubmission: PropTypes.func.isRequired,
}

const FundIssues = ({ issues, mode }) => {
  const githubCurrentUser = useGithubAuth()
  const { api, appState } = useAragonApi()
  const { bountySettings } = appState
  const { closePanel } = usePanelManagement()
  const [ submitting, setSubmitting ] = useState(false)
  const [ description, setDescription ] = useState('')
  const [ openSubmission, setOpenSubmission ] = useState(true)
  const tokens = useMemo(() => {
    if (bountySettings.fundingModel === 'Fixed') return appState.tokens
    return [appState.tokens.find(t => t.addr === bountySettings.bountyCurrency)]
  }, [bountySettings])
  const bountylessIssues = useMemo(
    () => issues.filter(i => !i.hasBounty),
    [issues]
  )
  const alreadyAdded = useMemo(
    () => issues.filter(i => i.hasBounty),
    [issues]
  )
  const [ bounties, setBounties ] = useState(bountiesFor({
    bountySettings,
    issues: bountylessIssues,
    tokens
  }))

  const fundsAvailable = useMemo(() => tokens.reduce(
    (sum, t) => sum.plus(BigNumber(t.balance)),
    BigNumber(0)
  ), [ bountySettings.fundingModel, tokens ])

  const descriptionChange = e => setDescription(e.target.value)

  const updateBounty = useCallback(issueId => update => {
    const newBounties = {
      ...bounties,
      [issueId]: {
        ...bounties[issueId],
        ...update,
      }
    }

    if (update.hours !== undefined || update.exp) {
      const { exp, hours } = newBounties[issueId]
      const { baseRate, expLvls } = bountySettings
      newBounties[issueId].payout = hours * baseRate * expLvls[exp].mul
    }

    setBounties(newBounties)
  }, [ bounties, bountySettings ])

  const submitBounties = useCallback(async e => {
    e.preventDefault()

    setSubmitting(true)

    const repoIds = []
    const issueNumbers = []
    const bountySizes = []
    const deadlines = []
    const tokenTypes = []
    const tokenContracts = []
    const ipfsData = []
    Object.values(bounties).forEach(bounty => {
      repoIds.push(toHex(bounty.repoId))
      issueNumbers.push(bounty.number)
      tokenContracts.push(bounty.token.addr)
      tokenTypes.push(bounty.token.addr === ETHER_TOKEN_FAKE_ADDRESS ? 1 : 20)
      bountySizes.push(
        BigNumber(bounty.payout).times(10 ** bounty.token.decimals).toString()
      )
      deadlines.push(bounty.deadline.getTime())
      ipfsData.push({
        issueId: bounty.issueId,
        exp: bounty.exp,
        fundingHistory: [
          ...bounty.fundingHistory,
          {
            user: githubCurrentUser,
            date: new Date().toISOString(),
            description,
          },
        ],
        hours: bounty.hours,
        repo: bounty.repo,
      })
    })
    const ipfsAddresses = await computeIpfsString(ipfsData)

    const addBountiesF = openSubmission ? api.addBountiesNoAssignment : api.addBounties
    await addBountiesF(
      repoIds,
      issueNumbers,
      bountySizes,
      deadlines,
      tokenTypes,
      tokenContracts,
      ipfsAddresses,
      description
    ).toPromise()

    closePanel()
  }, [ bounties, openSubmission ])

  if (fundsAvailable.toString() === '0') {
    return (
      <InfoPanel
        imgSrc={NoFunds}
        title="No funds found."
        message="It seems that your organization has no funds available to fund issues. Navigate to the Finance app to deposit some funds first."
      />
    )
  }

  if (mode === 'update') {
    // in 'update' mode there is only one issue
    const issue = issues[0]
    const bounty = bounties[issues[0].id]
    return (
      <BountyUpdate
        issue={issue}
        bounty={bounty}
        submitBounties={submitBounties}
        submitting={submitting}
        description={description}
        tokens={tokens}
        updateBounty={updateBounty(issue.id)}
      />
    )
  }

  return (
    <React.Fragment>
      {(bountylessIssues.length > 0) && (
        <FundForm
          submitBounties={submitBounties}
          submitting={submitting}
          issues={bountylessIssues}
          bounties={bounties}
          description={description}
          tokens={tokens}
          descriptionChange={descriptionChange}
          updateBounty={updateBounty}
          openSubmission={openSubmission}
          setOpenSubmission={setOpenSubmission}
        />
      )}
      {(alreadyAdded.length > 0) && (
        <Info.Action title="Warning" style={{ marginBottom: `${2 * GU}px` }}>
          <p style={{ margin: '10px 0' }}>
          The following issues already have active bounties, so they have been discarded from this funding proposal:
          </p>
          <WarningIssueList>
            {alreadyAdded.map(issue => <li key={issue.id}>{issue.title}</li>)}
          </WarningIssueList>
        </Info.Action>
      )}
      {(!bountylessIssues.length) && <Button mode="strong" wide onClick={closePanel}>Close</Button>}
    </React.Fragment>
  )
}

FundIssues.propTypes = {
  issues: PropTypes.arrayOf(issueShape).isRequired,
  mode: PropTypes.oneOf([ 'new', 'update' ]).isRequired,
}

const UpdateRow = styled.div`
  display: flex;
  align-content: stretch;
  margin-bottom: ${2 * GU};
  > :first-child {
    width: 55%;
    padding-right: 10px;
  }
  > :last-child {
    width: 45%;
    padding-left: 10px;
  }
`
const WarningIssueList = styled.ul`
  padding: 10px 30px;
  font-size: 13px;
  > :not(:last-child) {
    margin-bottom: 10px;
  }
`

const InfoPanel = ({ imgSrc, title, message }) => {
  const theme = useTheme()

  return (
    <div css={`text-align: center; padding: ${4 * GU}px`}>
      <img src={imgSrc} alt='' css={`padding: ${GU}px 0`} />
      <div css={`padding: ${GU}px 0`}>
        <Text size='xxlarge'>
          {title}
        </Text>
      </div>
      <div css={`padding: ${GU}px 0`}>
        <Text size='medium' color={theme.contentSecondary.toString()}>
          {message}
        </Text>
      </div>
    </div>
  )
}
InfoPanel.propTypes = {
  imgSrc: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
}

const ErrorText = styled.div`
  font-size: small;
  display: flex;
  align-items: center;
  margin: ${2 * GU}px 0;
`

const X = styled(IconClose).attrs({
  size: 'tiny',
})`
  margin-right: 8px;
  color: ${p => p.theme.negative};
`

const ErrorMessage = ({ text }) => {
  const theme = useTheme()
  return (
    <ErrorText>
      <X theme={theme} />
      {text}
    </ErrorText>
  )
}

ErrorMessage.propTypes = {
  text: PropTypes.string.isRequired,
}

export default FundIssues
