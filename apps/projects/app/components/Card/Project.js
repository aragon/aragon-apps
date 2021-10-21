import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { IconHistory, IconGitHub } from '../Shared'
import {
  Card,
  Text,
  ContextMenu,
  ContextMenuItem,
  IconCross,
  GU,
  Link,
  useLayout,
  useTheme,
} from '@aragon/ui'
import {
  BASE_CARD_WIDTH,
  CARD_STRETCH_BREAKPOINT,
} from '../../utils/responsive'
import { useAragonApi, usePath } from '../../api-react'
import { toHex } from 'web3-utils'

const Project = ({
  repoId,
  label,
  description,
  commits,
  url,
}) => {
  const {
    api: { removeRepo },
  } = useAragonApi()
  const [ , requestPath ] = usePath()

  const theme = useTheme()
  const { width } = useLayout()

  const removeProject = () => {
    removeRepo(toHex(repoId)).toPromise()
    // TODO: Toast feedback here maybe
  }

  const clickMenu = e => e.stopPropagation()

  const clickContext = e => {
    e.stopPropagation()
    requestPath(`/issues?repoId=${repoId}`)
  }

  return (
    <StyledCard onClick={clickContext} screenSize={width}>
      <MenuContainer onClick={clickMenu}>
        <ContextMenu>
          <div css={`padding: ${GU}px`}>
            <ContextMenuItem style={{
              display: 'flex',
              alignItems: 'center',
              padding: GU
            }}>
              <div css="width: 22px; margin: 4px 2px 0 6px">
                <IconGitHub width="16px" height="16px" />
              </div>
              <ActionLabel>
                <Link
                  href={url}
                  target="_blank"
                  style={{ textDecoration: 'none', color: theme.surfaceContent }}
                >
                View on GitHub
                </Link>
              </ActionLabel>
            </ContextMenuItem>
            <ContextMenuItem onClick={removeProject}>
              <div css="width: 22px; margin: 0 4px; margin-top: 4px">
                <IconCross width="22px" height="22px" />
              </div>
              <ActionLabel>Remove project</ActionLabel>
            </ContextMenuItem>
          </div>
        </ContextMenu>
      </MenuContainer>

      <CardTitle>{label}</CardTitle>
      <CardDescription>
        <CardDescriptionText>{description}</CardDescriptionText>
      </CardDescription>
      <StyledStats>
        <StatsContainer>
          <IconHistory />
          <Text weight="bold">
            {commits}{' '}
            <Text weight="normal">
              {parseInt(commits) === 1 ? 'commit' : 'commits'}
            </Text>
          </Text>
        </StatsContainer>
        {/* <StatsContainer> */}
        {/* <IconContributors /> */}
        {/* <Text weight="bold">
            {contributors}{' '}
            <Text weight="normal" color={theme.textSecondary}>
              {parseInt(contributors) === 1 ? 'contributor' : 'contributors'}
            </Text>
          </Text> */}
        {/* </StatsContainer> */}
      </StyledStats>
    </StyledCard>
  )
}

Project.propTypes = {
  repoId: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  commits: PropTypes.number.isRequired,
  url: PropTypes.string.isRequired,
  contributors: PropTypes.array,
}

const StyledCard = styled(Card)`
  display: flex;
  margin-bottom: 2rem;
  margin-right: ${props =>
    props.screenSize < CARD_STRETCH_BREAKPOINT ? '0.6rem' : '2rem'};
  flex-direction: column;
  justify-content: flex-start;
  padding: 12px;
  height: 240px;
  width: ${props =>
    props.screenSize < CARD_STRETCH_BREAKPOINT
      ? '100%'
      : BASE_CARD_WIDTH + 'px'};
  transition: all 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
  :hover {
    cursor: pointer;
    box-shadow: 0 9px 10px 0 rgba(101, 148, 170, 0.1);
  }
`

const MenuContainer = styled.div`
  align-self: flex-end;
  align-items: center;
`

const ActionLabel = styled.span`
  margin-left: ${GU}px;
`

const CardTitle = styled(Text.Block).attrs({
  size: 'xlarge',
})`
  margin-top: 10px;
  margin-bottom: 5px;
  text-align: center;
  display: block;
  /* stylelint-disable-next-line */
  display: -webkit-box;
  /* stylelint-disable-next-line */
  -webkit-line-clamp: 2;
  /* stylelint-disable-next-line */
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CardDescriptionText = styled(Text.Block).attrs({
  size: 'large',
})`
  display: block;
  /* stylelint-disable-next-line */
  display: -webkit-box;
  /* stylelint-disable-next-line */
  -webkit-line-clamp: 4;
  /* stylelint-disable-next-line */
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
`

const CardDescription = styled.div`
  flex-grow: 1;
`

const StyledStats = styled.div`
  display: flex;
  justify-content: center;
  align-content: stretch;
`

const StatsContainer = styled(Text).attrs({
  size: 'small',
})`
  display: inline-block;
`

export default Project
