import React, { useCallback } from 'react'
import styled from 'styled-components'
import {
  BackButton,
  Bar,
  Box,
  GU,
  Split,
  textStyle,
  useLayout,
  useTheme,
  Text,
  IconCheck,
  IconCross,
  IconConnect,
  Button,
  Info,
  TokenBadge,
  RADIUS,
} from '@aragon/ui'
import { useConnectedAccount, useNetwork } from '@aragon/api-react'
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'
import RequestText from '../components/RequestText'
import { requestStatus } from '../lib/constants'
import { addressesEqual } from '../lib/web3-utils'
import { formatTokenAmountSymbol } from '../lib/token-utils'
import { formatTokenAmount } from '../lib/math-utils'
import { format } from 'date-fns'

const RequestDetail = ({ request, token, onBack, onSubmit, onWithdraw }) => {
  const { layoutName } = useLayout()
  const theme = useTheme()
  const connectedAccount = useConnectedAccount()
  const network = useNetwork()
  const {
    requestId,
    requesterAddress,
    depositAmount,
    depositSymbol,
    requestAmount,
    depositDecimals,
    depositToken,
    reference,
    date,
    status,
  } = request
  const depositFormated = formatTokenAmount(depositAmount, false, depositDecimals, token.decimals)
  const requestFormated = formatTokenAmount(requestAmount, false, token.decimals, token.decimals)
  const requestRounded = formatTokenAmountSymbol(token.symbol, requestAmount, token.decimals)
  const title = `#${requestId} - ${requestRounded} requested by`
  const formatDate = date => `${format(date, 'do MMM yy, HH:mm')} UTC`
  const statusColor = getStatusColor(status, theme).toString()

  const handleWithdraw = useCallback(
    requestId => {
      onWithdraw(requestId)
    },
    [onWithdraw]
  )

  const handleSubmit = useCallback(
    requestId => {
      onSubmit(requestId)
    },
    [onSubmit]
  )

  return (
    <React.Fragment>
      <Bar>
        <BackButton onClick={onBack} />
      </Bar>
      <Split
        primary={
          <Box>
            <section
              css={`
                display: grid;
                grid-template-columns: auto;
                grid-gap: ${2.5 * GU}px;
                margin-top: ${2.5 * GU}px;
              `}
            >
              <h1
                css={`
                  ${textStyle('title2')};
                `}
              >
                <div
                  css={`
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                  `}
                >
                  {title}
                  <LocalIdentityBadge
                    css={`
                      margin-left: ${1 * GU}px;
                    `}
                    connectedAccount={addressesEqual(requesterAddress, connectedAccount)}
                    entity={requesterAddress}
                  />
                </div>
              </h1>
              <div
                css={`
                  display: grid;
                  grid-template-columns: ${layoutName === 'large' ? '1fr minmax(300px, auto)' : 'auto'};
                  grid-gap: ${layoutName === 'large' ? 5 * GU : 2.5 * GU}px;
                `}
              >
                <div>
                  <h2
                    css={`
                      ${textStyle('label2')};
                      color: ${theme.surfaceContentSecondary};
                      margin-bottom: ${2 * GU}px;
                    `}
                  >
                    Description
                  </h2>
                  <RequestText
                    text={reference}
                    css={`
                      ${textStyle('body2')};
                    `}
                  />
                </div>
                <div>
                  <h2
                    css={`
                      ${textStyle('label2')};
                      color: ${theme.surfaceContentSecondary};
                      margin-bottom: ${2 * GU}px;
                    `}
                  >
                    Created By
                  </h2>
                  <div
                    css={`
                      display: flex;
                      align-items: flex-start;
                    `}
                  >
                    <LocalIdentityBadge
                      connectedAccount={addressesEqual(requesterAddress, connectedAccount)}
                      entity={requesterAddress}
                    />
                  </div>
                </div>
              </div>
              <div>
                {connectedAccount ? (
                  status === requestStatus.PENDING && (
                    <React.Fragment>
                      <Buttons
                        requesterAddress={requesterAddress}
                        connectedAccount={connectedAccount}
                        onClickSubmit={() => {
                          handleSubmit(requestId)
                        }}
                        onClickWithdraw={() => {
                          handleWithdraw(requestId)
                        }}
                      />
                      <Info mode="warning">
                        This request is pending, A user with permission to initiate the approval process must take
                        action. The status will not update unless it is approved or withdrawn by the requestor.
                      </Info>
                    </React.Fragment>
                  )
                ) : (
                  <div
                    css={`
                      border-radius: ${RADIUS}px;
                      background: ${theme.background};
                      padding: ${3.5 * GU}px ${10 * GU}px;
                      text-align: center;
                    `}
                  >
                    <div
                      css={`
                        ${textStyle('body1')};
                      `}
                    >
                      You must enable your account to be able to act on this request
                    </div>
                    <div
                      css={`
                        ${textStyle('body2')};
                        color: ${theme.surfaceContentSecondary};
                        margin-top: ${2 * GU}px;
                      `}
                    >
                      Connect to your Ethereum provider by clicking on the{' '}
                      <strong
                        css={`
                          display: inline-flex;
                          align-items: center;
                          position: relative;
                          top: 7px;
                        `}
                      >
                        <IconConnect /> Enable account
                      </strong>{' '}
                      button on the header. You may be temporarily redirected to a new screen.
                    </div>
                  </div>
                )}
              </div>
            </section>
          </Box>
        }
        secondary={
          <React.Fragment>
            <Box heading='Request info'>
              <Status color={statusColor}>{`${status}`}</Status>
              <div
                css={`
                  margin-top: ${1 * GU}px;
                  display: inline-grid;
                  grid-template-columns: auto auto;
                  grid-gap: ${1 * GU}px;
                  align-items: center;
                  color: ${theme.surfaceContentSecondary};
                  ${textStyle('body2')};
                `}
              >
                {formatDate(date)}
              </div>
            </Box>
            <Box heading='Requested Amount'>
              <div
                css={`
                  display: relative;
                  align-items: center;
                  color: ${theme.surfaceContentSecondary};
                  ${textStyle('body2')};
                `}
              >
                <div>
                  <TokenBadge
                    address={token.address}
                    symbol={token.symbol}
                    name={token.name}
                    networkType={network && network.type}
                  />
                </div>
                <div
                  css={`
                    margin-top: ${1 * GU}px;
                  `}
                >
                  {requestFormated}
                </div>
              </div>
            </Box>
            <Box heading='Offered Amount'>
              <div
                css={`
                  display: relative;
                  align-items: center;
                  color: ${theme.surfaceContentSecondary};
                  ${textStyle('body2')};
                `}
              >
                <div>
                  <TokenBadge address={depositToken} symbol={depositSymbol} networkType={network && network.type} />
                </div>
                <div
                  css={`
                    margin-top: ${1 * GU}px;
                  `}
                >
                  {depositFormated}
                </div>
              </div>
            </Box>
          </React.Fragment>
        }
      />
    </React.Fragment>
  )
}
const Status = styled(Text)`
  font-weight: 600;
  color: ${({ color }) => {
    color
  }}};
`

const ActionButton = styled(Button)`
  ${textStyle('body2')};
  width: ${({ requesterConnected }) => {
    requesterConnected ? '50%' : '100%'
  }};
  &:first-child {
    margin-right: ${1 * GU}px;
  }
`

const ButtonsContainer = styled.div`
  display: flex;
  margin-bottom: ${2 * GU}px;
`

const Buttons = ({
  requesterAddress,
  connectedAccount,
  onClickSubmit = noop,
  onClickWithdraw = noop,
  disabled = false,
}) => {
  const requesterConnected = addressesEqual(requesterAddress, connectedAccount)
  return (
    <ButtonsContainer>
      <ActionButton
        requesterConnected={requesterConnected}
        mode='positive'
        wide
        disabled={disabled}
        onClick={onClickSubmit}
      >
        <IconCheck
          size='small'
          css={`
            margin-right: ${1 * GU}px;
          `}
        />
        Submit
      </ActionButton>
      {requesterConnected && (
        <ActionButton mode='negative' wide disabled={disabled} onClick={onClickWithdraw}>
          <IconCross
            size='small'
            css={`
              margin-right: ${1 * GU}px;
            `}
          />
          Withdraw
        </ActionButton>
      )}
    </ButtonsContainer>
  )
}

const getStatusColor = (status, theme) => {
  switch (status) {
    case requestStatus.PENDING:
      return theme.yellow
    case requestStatus.APPROVED:
      return theme.positive
    default:
      return theme.positive
  }
}

export default RequestDetail
