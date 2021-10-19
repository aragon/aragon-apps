import React from 'react'
import PropTypes from 'prop-types'
import {
  Button,
  EmptyStateCard,
  Help,
  GU,
  Link,
  LoadingRing,
  Text,
  useTheme,
} from '@aragon/ui'
import { EmptyWrapper } from '../Shared'

import unauthorizedSvg from '../../assets/empty.svg'

const illustration = <img src={unauthorizedSvg} alt="" height="160" />

const InlineHelp = props => (
  <div css={`display: inline-block; margin-left: ${GU}px`}>
    <Help {...props} />
  </div>
)

const Unauthorized = ({ onLogin, isSyncing }) => {
  const theme = useTheme()

  return (
    <EmptyWrapper>
      <EmptyStateCard
        text={
          isSyncing ? (
            <div
              css={`
                display: grid;
                align-items: center;
                justify-content: center;
                grid-template-columns: auto auto;
                grid-gap: ${1 * GU}px;
              `}
            >
              <LoadingRing />
              <span>Syncing…</span>
            </div>
          ) : (
            <React.Fragment>
              <Text css={`margin: ${2 * GU}px`}>
                Connect with GitHub
                <InlineHelp hint="">
                  The Projects app requires you to sign in with GitHub, as the
                  bounty and issue curation system is tied to GitHub issues.
                  Granting this permission does not give any third party access
                  to your GitHub account.{' '}
                  <Link
                    href="https://autark.gitbook.io/open-enterprise/apps/projects#github-authorization"
                  >
                    Read here
                  </Link> for more details.
                  <br /><br />
                  Note: We are working towards decentralizing the Projects app
                  to remove the need for GitHub: expect an update near the end
                  of the year.
                </InlineHelp>
              </Text>
              <Text.Block size="small" color={`${theme.surfaceContentSecondary}`}>
                Work on bounties, add funding to issues, or prioritize issues.
              </Text.Block>
            </React.Fragment>
          )}
        illustration={illustration}
        action={ !isSyncing && (
          <Button onClick={onLogin}>Sign In</Button>
        )}
      />
    </EmptyWrapper>
  )
}

Unauthorized.propTypes = {
  onLogin: PropTypes.func.isRequired,
  isSyncing: PropTypes.bool.isRequired,
}

export default Unauthorized
