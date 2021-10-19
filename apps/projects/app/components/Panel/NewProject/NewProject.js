import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Button, GU, IconSearch, Info, RadioList, Text, TextInput, theme } from '@aragon/ui'
import { GET_REPOSITORIES } from '../../../utils/gql-queries.js'
import { LoadingAnimation } from '../../Shared'
import { Query } from 'react-apollo'
import { useAragonApi } from '../../../api-react'
import { usePanelManagement } from '../../Panel'
import { toHex } from 'web3-utils'
import noResultsSvg from '../../../assets/noResults.svg'


const NewProject = () => {
  const { api, appState: { repos } } = useAragonApi()
  const { closePanel } = usePanelManagement()
  const [ filter, setFilter ] = useState('')
  const [ project, setProject ] = useState()
  const [ repoSelected, setRepoSelected ] = useState(-1)

  /*
    TODO: Review
    This line below might be breaking RepoList loading sometimes preventing show repos after login
  */

  const reposAlreadyAdded = (repos || []).map(repo => repo.data._repo)
  const searchRef = useRef(null)

  /*
  TODO: move Query out to the store, apply filters here
  useEffect(
    () => {
      const notAddedRepos = repos.filter(repo => !reposAlreadyAdded.includes(repo.node.id))
      const visibleRepos = notAddedRepos
      setVisibleRepos
    }, [filter, reposAlreadyAdded]
  )
*/

  useEffect(() => { searchRef.current && searchRef.current.focus()})

  const filterAlreadyAdded = repos => {
    return repos.filter(repo => !reposAlreadyAdded.includes(repo.node.id))
  }
  const filterByName = repos => {
    return repos.filter(repo => repo.node.nameWithOwner.indexOf(filter) > -1)
  }

  const updateFilter = e => {
    setFilter(e.target.value)
    setRepoSelected(-1)
  }

  const handleClearSearch = () => setFilter('')

  const handleNewProject = () => {
    closePanel()
    api.addRepo(toHex(project)).toPromise()
  }

  const onRepoSelected = repoArray => i => {
    setProject(repoArray[i].node.id)
    setRepoSelected(i)
  }

  // if there are visible (with or tiwhout filtration) repos, show them
  // else if there are no repos to show but filtering is active - show "no match"
  // else there are no repos to add (possibly all that could have been added
  // already are
  const RepoList = ({ visibleRepos, repoArray }) => {
    if (visibleRepos.length) return (
      <RadioList
        items={repoArray}
        selected={repoSelected}
        onChange={onRepoSelected(repoArray)}
      />
    )

    if (filter) return (
      <RepoInfo>
        <img css={`margin-bottom: ${2 * GU}px`} src={noResultsSvg} alt=""  />
        <Text.Block style={{ fontSize: '28px', marginBottom: '8px' }}>
          No results found.
        </Text.Block>
        <Text.Block>
          We can&#39;t find any items mathing your search.
        </Text.Block>
        <Button
          size="mini"
          onClick={handleClearSearch}
          css={`
            margin-left: 8px;
            border: 0;
            box-shadow: unset;
            padding: 4px;
          `}
        >
          <Text size="small" color={`${theme.link}`}>
            Clear Filters
          </Text>
        </Button>
      </RepoInfo>
    )

    return (
      <RepoInfo>
        <Text>No more repositories to add...</Text>
      </RepoInfo>
    )
  }
  RepoList.propTypes = {
    visibleRepos: PropTypes.array.isRequired,
    repoArray: PropTypes.array.isRequired,
  }

  return (
    <React.Fragment>
      <div css={`margin-top: ${3 * GU}px`}>
        <Text weight="bold">
            Which repos do you want to add?
        </Text>
        <div>
          <Query
            fetchPolicy="cache-first"
            query={GET_REPOSITORIES}
            onError={console.error}
          >
            {({ data, loading, error, refetch }) => {
              if (data && data.viewer) {

                const reposDownloaded = filterAlreadyAdded(data.viewer.repositories.edges)

                const visibleRepos = filter ? filterByName(reposDownloaded) : reposDownloaded


                const repoArray = visibleRepos.map(repo => ({
                  title: repo.node.nameWithOwner,
                  description: '',
                  node: repo.node,
                }))

                return (
                  <div>
                    <TextInput
                      type="search"
                      style={{ margin: '16px 0', flexShrink: '0' }}
                      placeholder="Search"
                      wide
                      value={filter}
                      onChange={updateFilter}
                      adornment={
                        filter === '' && (
                          <IconSearch
                            css={`
                                color: ${theme.surfaceOpened};
                                margin-right: 8px;
                              `}
                          />
                        )
                      }
                      adornmentPosition="end"
                      ref={searchRef}
                    />

                    <ScrollableList>
                      <RepoList visibleRepos={visibleRepos} repoArray={repoArray} />
                    </ScrollableList>

                    <Info css={`margin: ${3 * GU}px 0`}>
                        Projects in Aragon are a one-to-one mapping to a GitHub repository.
                        You’ll be able to prioritize your backlog, reach consensus on issue
                        valuations, and allocate bounties to multiple issues.
                    </Info>

                    <Button
                      mode="strong"
                      wide
                      onClick={handleNewProject}
                      disabled={repoSelected < 0}
                    >
                      Submit
                    </Button>
                  </div>
                )
              }

              if (loading) return (
                <RepoInfo>
                  <LoadingAnimation />
                  <div>Loading repositories...</div>
                </RepoInfo>
              )

              if (error) return (
                <RepoInfo>
                  <Text size="xsmall" style={{ margin: '20px 0' }}>
                      Error {JSON.stringify(error)}
                  </Text>
                  <Button wide mode="strong" onClick={() => refetch()}>
                      Try refetching?
                  </Button>
                </RepoInfo>
              )
            }}
          </Query>
        </div>
      </div>
    </React.Fragment>
  )
}

const ScrollableList = styled.div`
  flex-grow: 1;
  overflow-y: auto;
  padding-right: 10px;
  margin: 16px 0;
  // Hack needed to make the scrollable list, since the whole SidePanel is a scrollable container
  height: calc(100vh - 420px);
`
const RepoInfo = styled.div`
  margin: 20px 0;
  text-align: center;
`

// TODO: Use nodes instead of edges (the app should be adapted at some places)
export default NewProject
