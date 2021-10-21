import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { useAragonApi, useNetwork } from '../../api-react'
import {
  Box,
  DropDown,
  Button,
  Field,
  GU,
  Info,
  IconRemove,
  Link,
  Text,
  TextInput,
  useLayout,
  useTheme,
  unselectable,
} from '@aragon/ui'

import { LocalIdentityBadge } from '../../../../../shared/identity'
import { STATUS } from '../../utils/github'
import { fromUtf8, toHex } from 'web3-utils'
import { REQUESTED_GITHUB_DISCONNECT } from '../../store/eventTypes'
import useGithubAuth from '../../hooks/useGithubAuth'
import { LoadingAnimation } from '../Shared'
import { EmptyWrapper } from '../Shared'
import NumberInput from '../Shared/NumberInput'

const bountyDeadlines = [ 'Days', 'Weeks', 'Months' ]
const bountyDeadlinesMul = [ 24, 168, 720 ]

const fundingModels = [
  'Fixed',
  'Hourly',
]

const GitHubConnect = ({ onLogin, onLogout, user, status }) => {
  const theme = useTheme()
  const auth = status === STATUS.AUTHENTICATED

  const bodyText = auth ? (
    <Text size="large" css="display: flex; align-items: center">
      Logged in as <img src={user.avatarUrl} alt="user avatar" css="margin: 8px; width: 50px; border-radius: 50%;" />
      <Link
        href={user.url}
        target="_blank"
        style={{ textDecoration: 'none', color: `${theme.link}` }}
      >
        {user.login}
      </Link>
    </Text>
  ) : (
    'The Projects app uses GitHub to interact with issues.'
  )
  const buttonText = auth ? 'Disconnect' : 'Connect my GitHub'
  const buttonAction = auth ? onLogout : onLogin
  return (
    <Box heading="GitHub" css="height: 100%">
      <Text.Block>{bodyText}</Text.Block>
      <Button
        css={`margin-top: ${1 * GU}px`}
        wide
        mode="secondary"
        onClick={buttonAction}
      >
        {buttonText}
      </Button>
    </Box>
  )
}

GitHubConnect.propTypes = {
  onLogin: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
  user: PropTypes.object.isRequired,
  status: PropTypes.string.isRequired,
}

const BountyContractAddress = ({ bountyAllocator, networkType, layoutName }) => (
  <Box heading="Bounty Address" css="height: 100%">
    <LocalIdentityBadge
      networkType={networkType}
      entity={bountyAllocator}
      shorten={layoutName === 'small'}
    />
    <Info css="margin-top: 16px">
      This address is the smart contract responsible for allocating bounties.
    </Info>
  </Box>
)

BountyContractAddress.propTypes = {
  bountyAllocator: PropTypes.string.isRequired,
  networkType: PropTypes.string.isRequired,
  layoutName: PropTypes.string.isRequired,
}

const SettingLabel = ({ text }) => {
  const theme = useTheme()

  return (
    <Text.Block
      size="large"
      color={`${theme.surfaceContentSecondary}`}
      style={{ marginBottom: '12px' }}
    >
      {text}
    </Text.Block>
  )
}
SettingLabel.propTypes = {
  text: PropTypes.string.isRequired,
}

const ExperienceLevel = ({
  expLevels,
  onAddExpLevel,
  onRemoveExpLevel,
  generateExpLevelHandler,
  fundingModel,
}) => {
  const theme = useTheme()
  let last = expLevels[expLevels.length - 1]
  let canAdd = last && last.mul !== '' && last.name !== ''
  return (
    <React.Fragment>
      <SettingLabel text={`Difficulty ${fundingModel === 'Hourly' ? 'multipliers' : ''}`} />
      {expLevels.map((exp, index) => (
        <React.Fragment key={index}>
          {fundingModel === 'Hourly' ? (
            <Field
              css={`margin-bottom: ${1.5 * GU}px`}
              label={'LEVEL ' + index}
            >
              <div css="display: flex">
                <NumberInput
                  css="width: 32%; margin-right: 3%"
                  fixedDecimalScale
                  decimalScale={2}
                  value={exp.mul}
                  allowNegative={false}
                  onChange={generateExpLevelHandler(index, 'M')}
                />
                <TextInput
                  type="text"
                  css="font-size: 16px; width: 65%"
                  value={exp.name}
                  onChange={generateExpLevelHandler(index, 'N')}
                />
                <IconContainer
                  theme={theme}
                  disabled={expLevels.length <= 1}
                  style={{ transform: 'scale(.8)' }}
                  onClick={() => onRemoveExpLevel(index)}
                  title="Remove this difficulty multiplier"
                >
                  <IconRemove />
                </IconContainer>
              </div>
            </Field>
          ) : (
            <div
              css={`display: flex; margin-bottom: ${1.5 * GU}px`}
            >
              <TextInput
                type="text"
                css="font-size: 16px; flex-grow: 1"
                value={exp.name}
                onChange={generateExpLevelHandler(index, 'N')}
              />
              <IconContainer
                theme={theme}
                disabled={expLevels.length <= 1}
                style={{ transform: 'scale(.8)' }}
                onClick={() => onRemoveExpLevel(index)}
                title="Remove this difficulty setting"
              >
                <IconRemove />
              </IconContainer>
            </div>
          )}
        </React.Fragment>
      ))}
      <Button
        disabled={!canAdd}
        compact
        mode="secondary"
        onClick={onAddExpLevel}
      >
        + Add another
      </Button>
    </React.Fragment>
  )
}
ExperienceLevel.propTypes = {
  expLevels: PropTypes.array.isRequired,
  onAddExpLevel: PropTypes.func.isRequired,
  onRemoveExpLevel: PropTypes.func.isRequired,
  generateExpLevelHandler: PropTypes.func.isRequired,
  fundingModel: PropTypes.string.isRequired,
}

const BaseRate = ({
  baseRate,
  onChangeRate,
  bountyCurrency,
  onChangeCurrency,
  bountyCurrencies,
}) => (
  <React.Fragment>
    <SettingLabel text="Base rate" />
    <StyledInputDropDown css="margin-bottom: 24px">
      <NumberInput
        fixedDecimalScale
        decimalScale={2}
        value={baseRate}
        allowNegative={false}
        onChange={onChangeRate}
        style={{ marginRight: '0' }}
      />
      <DropDown
        items={bountyCurrencies}
        selected={bountyCurrency}
        onChange={onChangeCurrency}
      />
    </StyledInputDropDown>
  </React.Fragment>
)

BaseRate.propTypes = {
  baseRate: PropTypes.string.isRequired,
  onChangeRate: PropTypes.func.isRequired,
  bountyCurrency: PropTypes.number.isRequired,
  onChangeCurrency: PropTypes.func.isRequired,
  bountyCurrencies: PropTypes.array.isRequired,
}

const BountyDeadline = ({
  bountyDeadlineT,
  onChangeT,
  bountyDeadlineD,
  onChangeD,
}) => (
  <React.Fragment>
    <SettingLabel text="Default work deadline" />
    <StyledInputDropDown>
      <NumberInput
        fixedDecimalScale
        decimalScale={1}
        value={bountyDeadlineT}
        allowNegative={false}
        onChange={onChangeT}
        style={{ marginRight: '0' }}
      />
      <DropDown
        items={bountyDeadlines}
        selected={bountyDeadlineD}
        onChange={onChangeD}
      />
    </StyledInputDropDown>
  </React.Fragment>
)

BountyDeadline.propTypes = {
  bountyDeadlineT: PropTypes.number.isRequired,
  onChangeT: PropTypes.func.isRequired,
  bountyDeadlineD: PropTypes.number.isRequired,
  onChangeD: PropTypes.func.isRequired,
}

const BountyArbiter = ({ bountyArbiter, networkType }) => (
  <div>
    <SettingLabel text="Bounty Arbiter" />
    <div css="display: flex">
      <LocalIdentityBadge
        networkType={networkType}
        entity={bountyArbiter}
        // TODO:
        // shorten={false}
      />
    </div>
  </div>
)
BountyArbiter.propTypes = {
  bountyArbiter: PropTypes.string.isRequired,
  networkType: PropTypes.string.isRequired,
}

const getExactIndex = (bountyDeadline, bountyDeadlinesMul) => {
  for (let i = bountyDeadlinesMul.length - 1; i >= 0; i--) {
    if (bountyDeadline % bountyDeadlinesMul[i] === 0) {
      return i
    }
  }
  return -1
}

const Settings = ({ onLogin }) => {
  const [ bountyCurrencies, setBountyCurrencies ] = useState([])
  const [ expLevels, setExpLevels ] = useState([])
  const [ baseRate, setBaseRate ] = useState('')
  const [ bountyCurrency, setBountyCurrency ] = useState()
  const [ bountyAllocator, setBountyAllocator ] = useState()
  //const [ bountyArbiter, setBountyArbiter ] = useState()
  const [ bountyDeadlineD, setBountyDeadlineD ] = useState()
  const [ bountyDeadlineT, setBountyDeadlineT ] = useState()
  const [ selectedFundingModelIndex, setFundingModel ] = useState(0)
  const [ settingsLoaded, setSettingsLoaded ] = useState(false)

  const { api, appState } = useAragonApi()
  const user = useGithubAuth()
  const network = useNetwork()
  const { layoutName } = useLayout()
  const {
    bountySettings = {},
    tokens = [],
    github = { status : STATUS.INITIAL },
  } = appState

  useEffect(() => {
    setBountyCurrencies(tokens.map(token => token.symbol))
  }, [tokens]
  )

  useEffect(() => {
    const {
      expLvls = [],
      baseRate,
      bountyCurrency,
      bountyAllocator,
      bountyDeadline
    } = bountySettings
    setExpLevels(expLvls)
    setBaseRate(baseRate ? baseRate : '')
    setBountyCurrency(tokens.findIndex(bounty => bounty.addr === bountyCurrency))
    setBountyAllocator(bountyAllocator)
    let index = getExactIndex(bountyDeadline, bountyDeadlinesMul)
    if (index === -1) {
      const reverseDeadlinesMul = [...bountyDeadlinesMul].sort((a, b) => b - a)
      const deadlineMul = reverseDeadlinesMul.find(d => d * 2 <= bountyDeadline)
      index = bountyDeadlinesMul.indexOf(deadlineMul)
    }
    setBountyDeadlineD(index)
    setBountyDeadlineT(bountyDeadline / bountyDeadlinesMul[index])
    setFundingModel(fundingModels.indexOf(bountySettings.fundingModel))
    setSettingsLoaded(true)
  }, [bountySettings]
  )

  const submitChanges = () => {
    // flatten deadline
    const bountyDeadline = Math.floor(bountyDeadlinesMul[bountyDeadlineD] * bountyDeadlineT)
    // flatten expLevels
    const expLevelsDesc = expLevels.map(l => fromUtf8(l.name))
    // uint-ify EXP levels
    const expLevelsMul = expLevels.map(l => toHex(l.mul * 100))
    // we persist `fundingModel: fixed` by setting baseRate to 0
    const baseRateModified = fundingModels[selectedFundingModelIndex] === 'Fixed'
      ? 0
      : baseRate

    api.changeBountySettings(
      expLevelsMul,
      expLevelsDesc,
      toHex(baseRateModified * 100),
      toHex(bountyDeadline),
      tokens[bountyCurrency].addr,
      bountyAllocator
      //bountyArbiter,
    ).toPromise()
  }

  const baseRateChange = e => setBaseRate(e.target.value)
  const bountyDeadlineChangeT = e => setBountyDeadlineT(Number(e.target.value))
  const bountyDeadlineChangeD = index => setBountyDeadlineD(index)
  const bountyCurrencyChange = index => setBountyCurrency(index)
  // Unconfigurables (for now):
  // const bountyAllocatorChange = e => setBountyAllocator(e.target.value)
  // const bountyArbiterChange = e => setBountyArbiter(e.target.value)

  const addExpLevel = () => {
    const newExpLevels = [ ...expLevels, { name: '', mul: 1 }]
    setExpLevels(newExpLevels)
  }

  const removeExpLevel = (index) => {
    const newExpLevels = [...expLevels]
    newExpLevels.splice(index, 1)
    setExpLevels(newExpLevels)
  }

  const generateExpLevelHandler = (index, key) => e => {
    const newExpLevels = [...expLevels]
    if (key === 'M') newExpLevels[index].mul = e.target.value
    else newExpLevels[index].name = e.target.value
    setExpLevels(newExpLevels)
  }

  const handleLogout = () => {
    api.emitTrigger(REQUESTED_GITHUB_DISCONNECT, {
      status: STATUS.INITIAL,
      token: null,
    })
  }

  if (!settingsLoaded  || !user.avatarUrl)
    return (
      <EmptyWrapper>
        <Text size="large" css={`margin-bottom: ${3 * GU}px`}>
          Loading...
        </Text>
        <LoadingAnimation />
      </EmptyWrapper>
    )

  return (
    <SettingsMain layoutName={layoutName}>
      <div css="grid-area: contract">
        <BountyContractAddress
          bountyAllocator={bountyAllocator}
          networkType={network.type}
          layoutName={layoutName}
        />
      </div>
      <div css="grid-area: github">
        <GitHubConnect
          onLogin={onLogin}
          onLogout={handleLogout}
          user={user}
          status={github.status}
        />
      </div>
      <div css="grid-area: funding">
        <Box
          heading="Funding Settings"
        >
          <SettingsFunding layoutName={layoutName}>
            <Column>
              <SettingLabel text="Funding Model" />
              <DropDown
                css={`margin-bottom: ${3 * GU}px`}
                items={fundingModels}
                selected={selectedFundingModelIndex}
                onChange={i => setFundingModel(i)}
                wide
              />
              {fundingModels[selectedFundingModelIndex] === 'Hourly' && (
                <React.Fragment>
                  <Info css={`margin-bottom: ${3 * GU}px`}>
                    In hourly funding, the hourly rate per issue is the base
                    rate multiplied by the difficulty level selected for the
                    issue.
                  </Info>
                  <BaseRate
                    baseRate={baseRate}
                    onChangeRate={baseRateChange}
                    bountyCurrencies={bountyCurrencies}
                    bountyCurrency={bountyCurrency}
                    onChangeCurrency={bountyCurrencyChange}
                  />
                </React.Fragment>
              )}
              <BountyDeadline
                bountyDeadlineT={bountyDeadlineT}
                onChangeT={bountyDeadlineChangeT}
                bountyDeadlineD={bountyDeadlineD}
                onChangeD={bountyDeadlineChangeD}
              />
            </Column>
            <Column>
              <ExperienceLevel
                expLevels={expLevels}
                onAddExpLevel={addExpLevel}
                onRemoveExpLevel={removeExpLevel}
                generateExpLevelHandler={generateExpLevelHandler}
                fundingModel={fundingModels[selectedFundingModelIndex]}
              />
            </Column>
          </SettingsFunding>

          <Button mode="strong" onClick={submitChanges}>
              Save changes
          </Button>
        </Box>
      </div>
    </SettingsMain>
  )
}

Settings.propTypes = {
  onLogin: PropTypes.func.isRequired,
}

const StyledInputDropDown = ({ children, className }) => {
  const theme = useTheme()

  return (
    <div className={className} css={`
      display: flex;
      > :first-child {
        border-radius: 3px 0 0 3px;
        border: 1px solid ${theme.border};
        box-shadow: 0 4px 4px 0 rgba(0, 0, 0, 0.03);
        flex: 1;
        z-index: 1;
        &, &:focus-within {
          border-right: none;
        }
      }
      > :nth-child(2) {
        border-radius: 0 3px 3px 0;
      }
    `}>
      {children}
    </div>
  )
}

StyledInputDropDown.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
}

const SettingsMain = styled.div`
  display: grid;
  grid-gap: 12px;
  grid-template-areas: ${({ layoutName }) => layoutName === 'large' ? (`
    "github contract"
    "funding funding"
  `) : (`
    "github"
    "contract"
    "funding"
  `)};
  grid-template-columns: ${({ layoutName }) => layoutName === 'large' ? '1fr 1fr' : '1fr'};
  grid-template-rows: auto;
  align-items: stretch;
`
const SettingsFunding = styled.div`
  display: grid;
  grid-gap: ${3 * GU}px;
  grid-template-columns: ${({ layoutName }) => layoutName === 'small' ? '1fr' : '1fr 1fr'};
  margin-bottom: ${3 * GU}px;
`

const Column = styled.div`
  max-width: ${35 * GU}px;
`

const IconContainer = styled.button`
  ${unselectable};
  all: unset;
  display: flex;
  justify-content: center;
  ${({ disabled, theme }) => (disabled ? `
      color: ${theme.disabled};
      cursor: not-allowed;
    ` : `
      color: ${theme.contentSecondary};
      cursor: pointer;
      :hover {
        color: ${theme.surfaceOpened};
      }
      :active {
        color: ${theme.accent};
      }
    `)
}
  > svg {
    color: inherit;
    height: 40px;
    width: 40px;
    transition: all 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
  }
`

export default Settings
