import PropTypes from 'prop-types'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { useQuery } from '@apollo/react-hooks'

import { useAragonApi } from '../../api-react'
import { Button, GU, Text } from '@aragon/ui'
import { compareAsc, compareDesc } from 'date-fns'

import { initApolloClient } from '../../utils/apollo-client'
import useShapedIssue from '../../hooks/useShapedIssue'
import usePathSegments from '../../hooks/usePathSegments'
import { STATUS } from '../../utils/github'
import { getIssuesGQL } from '../../utils/gql-queries.js'
import { FilterBar } from '../Shared'
import { Issue } from '../Card'
import { LoadingAnimation } from '../Shared'
import { EmptyWrapper } from '../Shared'

const sorters = {
  'Name ascending': (i1, i2) =>
    i1.title.toUpperCase() > i2.title.toUpperCase() ? 1 : -1,
  'Name descending': (i1, i2) =>
    i1.title.toUpperCase() > i2.title.toUpperCase() ? -1 : 1,
  'Newest': (i1, i2) =>
    compareDesc(new Date(i1.createdAt), new Date(i2.createdAt)),
  'Oldest': (i1, i2) =>
    compareAsc(new Date(i1.createdAt), new Date(i2.createdAt)),
}

const ISSUES_PER_CALL = 100

class Issues extends React.PureComponent {
  static propTypes = {
    bountyIssues: PropTypes.array.isRequired,
    bountySettings: PropTypes.shape({
      expLvls: PropTypes.array.isRequired,
    }).isRequired,
    filters: PropTypes.object.isRequired,
    github: PropTypes.shape({
      status: PropTypes.oneOf([
        STATUS.AUTHENTICATED,
        STATUS.FAILED,
        STATUS.INITIAL,
      ]).isRequired,
      token: PropTypes.string,
      event: PropTypes.string,
    }),
    graphqlQuery: PropTypes.shape({
      data: PropTypes.object,
      error: PropTypes.string,
      loading: PropTypes.bool.isRequired,
      refetch: PropTypes.func,
    }).isRequired,
    setDownloadedRepos: PropTypes.func.isRequired,
    setFilters: PropTypes.func.isRequired,
    setSelectedIssue: PropTypes.func.isRequired,
    shapeIssue: PropTypes.func.isRequired,
    status: PropTypes.string.isRequired,
    tokens: PropTypes.array.isRequired,
  }

  state = {
    selectedIssues: {},
    allSelected: false,
    sortBy: 'Newest',
    textFilter: '',
    reload: false,
    downloadedIssues: [],
  }

  deselectAllIssues = () => {
    this.setState({ selectedIssues: {}, allSelected: false })
  }

  toggleSelectAll = issuesFiltered => () => {
    const selectedIssues = {}
    const allSelected = !this.state.allSelected
    const reload = !this.state.reload
    if (!this.state.allSelected) {
      issuesFiltered.map(this.props.shapeIssue).forEach(
        issue => (selectedIssues[issue.id] = issue)
      )
    }
    this.setState({ allSelected, selectedIssues, reload })
  }

  handleFiltering = filters => {
    this.props.setFilters(filters)
    // TODO: why is reload necessary?
    this.setState(prevState => ({
      reload: !prevState.reload,
    }))
  }

  handleSorting = sortBy => {
    // TODO: why is reload necessary?
    this.setState(prevState => ({ sortBy, reload: !prevState.reload }))
  }

  applyFilters = issues => {
    const { textFilter } = this.state
    const { filters, bountyIssues } = this.props

    const bountyIssueObj = {}
    bountyIssues.forEach(issue => {
      bountyIssueObj[issue.issueNumber] = issue.data.workStatus
    })

    const issuesByProject = issues.filter(issue => {
      if (Object.keys(filters.projects).length === 0) return true
      if (Object.keys(filters.projects).indexOf(issue.repository.id) !== -1)
        return true
      return false
    })

    const issuesByLabel = issuesByProject.filter(issue => {
      // if there are no labels to filter by, pass all
      if (Object.keys(filters.labels).length === 0) return true
      // if labelless issues are allowed, let them pass
      if ('labelless' in filters.labels && issue.labels.totalCount === 0)
        return true
      // otherwise, fail all issues without labels
      if (issue.labels.totalCount === 0) return false

      const labelsIds = issue.labels.edges.map(label => label.node.id)

      if (
        Object.keys(filters.labels).filter(id => labelsIds.indexOf(id) !== -1)
          .length > 0
      )
        return true
      return false
    })

    const issuesByMilestone = issuesByLabel.filter(issue => {
      // if there are no MS filters, all issues pass
      if (Object.keys(filters.milestones).length === 0) return true
      // should issues without milestones pass?
      if ('milestoneless' in filters.milestones && issue.milestone === null)
        return true
      // if issues without milestones should not pass, they are rejected below
      if (issue.milestone === null) return false
      if (Object.keys(filters.milestones).indexOf(issue.milestone.id) !== -1)
        return true
      return false
    })

    const issuesByStatus = issuesByMilestone.filter(issue => {
      // if there are no Status filters, all issues pass
      if (Object.keys(filters.statuses).length === 0) return true
      // should bountyless issues pass?
      const status = bountyIssueObj[issue.number]
        ? bountyIssueObj[issue.number]
        : 'not-funded'
      // if we look for all funded issues, regardless of stage...
      let filterPass =
        status in filters.statuses ||
        ('all-funded' in filters.statuses && status !== 'not-funded')
          ? true
          : false
      // ...or at specific stages
      return filterPass
    })

    // last but not least, if there is any text in textFilter...
    if (textFilter) {
      return issuesByStatus.filter(
        issue =>
          issue.title.toUpperCase().indexOf(textFilter) !== -1 ||
          String(issue.number).indexOf(textFilter) !== -1
      )
    }

    return issuesByStatus
  }

  handleIssueSelection = issue => {
    this.setState(prevState => {
      const newSelectedIssues = prevState.selectedIssues
      if (issue.id in newSelectedIssues) {
        delete newSelectedIssues[issue.id]
      } else {
        newSelectedIssues[issue.id] = issue
      }
      return { selectedIssues: newSelectedIssues, reload: !prevState.reload }
    })
  }

  handleTextFilter = e => {
    this.setState({
      textFilter: e.target.value.toUpperCase(),
      reload: !this.state.reload,
    })
  }

  disableFilter = pathToFilter => {
    let newFilters = { ...this.props.filters }
    recursiveDeletePathFromObject(pathToFilter, newFilters)
    this.props.setFilters(newFilters)
  }

  disableAllFilters = () => {
    this.props.setFilters({
      projects: {},
      labels: {},
      milestones: {},
      deadlines: {},
      experiences: {},
      statuses: {},
    })
  }

  filterBar = (issues, issuesFiltered) => {
    return (
      <FilterBar
        setParentFilters={this.props.setFilters}
        filters={this.props.filters}
        sortBy={this.state.sortBy}
        handleSelectAll={this.toggleSelectAll(issuesFiltered)}
        allSelected={this.state.allSelected}
        issues={issues}
        issuesFiltered={issuesFiltered}
        handleFiltering={this.handleFiltering}
        handleSorting={this.handleSorting}
        bountyIssues={this.props.bountyIssues}
        disableFilter={this.disableFilter}
        disableAllFilters={this.disableAllFilters}
        deselectAllIssues={this.deselectAllIssues}
        onSearchChange={this.handleTextFilter}
        selectedIssues={Object.keys(this.state.selectedIssues).map(
          id => this.state.selectedIssues[id]
        )}
      />
    )
  }

  queryLoading = () => (
    <StyledIssues>
      {this.filterBar([], [])}
      <EmptyWrapper>
        <Text size="large" css={`margin-bottom: ${3 * GU}px`}>
          Loading...
        </Text>
        <LoadingAnimation />
      </EmptyWrapper>
    </StyledIssues>
  )

  queryError = (error, refetch) => (
    <StyledIssues>
      {this.filterBar([], [])}
      <IssuesScrollView>
        <div>
          Error {JSON.stringify(error)}
          <div>
            <Button mode="strong" onClick={() => refetch()}>
              Try refetching?
            </Button>
          </div>
        </div>
      </IssuesScrollView>
    </StyledIssues>
  )

  /*
   Data obtained from github API is data.{repo}.issues.[nodes] and it needs
   flattening into one simple array of issues  before it can be used

   Returns array of issues and object of repos numbers: how many issues
   in repo in total, how many downloaded, how many to fetch next time
   (for "show more")
  */
  flattenIssues = data => {
    let downloadedIssues = []
    const downloadedRepos = {}

    Object.keys(data).forEach(nodeName => {
      const repo = data[nodeName]

      downloadedRepos[repo.id] = {
        downloadedCount: repo.issues.nodes.length,
        totalCount: repo.issues.totalCount,
        fetch: ISSUES_PER_CALL,
        hasNextPage: repo.issues.pageInfo.hasNextPage,
        endCursor: repo.issues.pageInfo.endCursor,
      }
      downloadedIssues = downloadedIssues.concat(...repo.issues.nodes)
    })

    if (this.state.downloadedIssues.length > 0) {
      downloadedIssues = downloadedIssues.concat(this.state.downloadedIssues)
    }

    return { downloadedIssues, downloadedRepos }
  }

  showMoreIssues = (downloadedIssues, downloadedRepos) => {
    let newDownloadedRepos = { ...downloadedRepos }

    Object.keys(downloadedRepos).forEach(repoId => {
      newDownloadedRepos[repoId].showMore = downloadedRepos[repoId].hasNextPage
    })
    this.props.setDownloadedRepos(newDownloadedRepos)
    this.setState({
      downloadedIssues,
    })
  }

  render() {
    const { data, loading, error, refetch } = this.props.graphqlQuery

    if (loading) return this.queryLoading()

    if (error) return this.queryError(error, refetch)

    // first, flatten data structure into array of issues
    const { downloadedIssues, downloadedRepos } = this.flattenIssues(data)

    // then apply filtering
    const issuesFiltered = this.applyFilters(downloadedIssues)

    // then determine whether any shown repos have more issues to fetch
    const moreIssuesToShow =
      Object.keys(downloadedRepos).filter(
        repoId => downloadedRepos[repoId].hasNextPage
      ).length > 0

    return (
      <StyledIssues>
        {this.filterBar(downloadedIssues, issuesFiltered)}

        <IssuesScrollView>
          <ScrollWrapper>
            {issuesFiltered.map(this.props.shapeIssue)
              .sort(sorters[this.state.sortBy])
              .map(issue => (
                <Issue
                  isSelected={issue.id in this.state.selectedIssues}
                  key={issue.id}
                  {...issue}
                  onClick={this.props.setSelectedIssue}
                  onSelect={this.handleIssueSelection}
                />
              ))}
          </ScrollWrapper>

          <div style={{ textAlign: 'center' }}>
            {moreIssuesToShow && (
              <Button
                style={{ margin: '12px 0 30px 0' }}
                mode="secondary"
                onClick={() =>
                  this.showMoreIssues(downloadedIssues, downloadedRepos)
                }
              >
                Show More
              </Button>
            )}
          </div>
        </IssuesScrollView>
      </StyledIssues>
    )
  }
}

const IssuesQuery = ({ client, query, ...props }) => {
  const graphqlQuery = useQuery(query, { client, onError: console.error })
  return <Issues graphqlQuery={graphqlQuery} {...props} />
}

IssuesQuery.propTypes = {
  client: PropTypes.object.isRequired,
  query: PropTypes.object.isRequired,
}

const IssuesWrap = props => {
  const { appState: { github, repos } } = useAragonApi()
  const shapeIssue = useShapedIssue()
  const { query: { repoId } } = usePathSegments()
  const [ client, setClient ] = useState(null)
  const [ downloadedRepos, setDownloadedRepos ] = useState({})
  const [ query, setQuery ] = useState(null)
  const [ filters, setFilters ] = useState({
    projects: repoId ? { [repoId]: true } : {},
    labels: {},
    milestones: {},
    deadlines: {},
    experiences: {},
    statuses: {},
  })

  // build params for GQL query, each repo to fetch has number of items to download,
  // and a cursor if there are 100+ issues and "Show More" was clicked.
  useEffect(() => {
    let reposQueryParams = {}

    if (Object.keys(downloadedRepos).length > 0) {
      Object.keys(downloadedRepos).forEach(repoId => {
        if (downloadedRepos[repoId].hasNextPage)
          reposQueryParams[repoId] = downloadedRepos[repoId]
      })
    } else {
      if (Object.keys(filters.projects).length > 0) {
        Object.keys(filters.projects).forEach(repoId => {
          reposQueryParams[repoId] = {
            fetch: ISSUES_PER_CALL,
            showMore: false,
          }
        })
      } else {
        repos.forEach(repo => {
          const repoId = repo.data._repo
          reposQueryParams[repoId] = {
            fetch: ISSUES_PER_CALL,
            showMore: false,
          }
        })
      }
    }

    setQuery(getIssuesGQL(reposQueryParams))
  }, [ downloadedRepos, filters, repos ])

  useEffect(() => {
    setClient(github.token ? initApolloClient(github.token) : null)
  }, [github.token])

  if (!query) return 'Loading...'

  if (!client) return 'You must sign into GitHub to view issues.'

  return (
    <IssuesQuery
      client={client}
      filters={filters}
      query={query}
      shapeIssue={shapeIssue}
      setDownloadedRepos={setDownloadedRepos}
      setFilters={setFilters}
      {...props}
    />
  )
}

const StyledIssues = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`

const ScrollWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  flex-grow: 1;
  > :first-child {
    border-radius: 3px 3px 0 0;
  }
  > :last-child {
    border-radius: 0 0 3px 3px;
    margin-bottom: 10px;
  }
`

// TODO: Calculate height with flex (maybe to add pagination at bottom?)
const IssuesScrollView = styled.div`
  height: 75vh;
  position: relative;
`

const recursiveDeletePathFromObject = (path, object) => {
  if (path.length === 1) {
    delete object[path[0]]
  } else {
    const key = path.shift()
    const newObject = object[key]
    recursiveDeletePathFromObject(path, newObject)
  }
}

// eslint-disable-next-line import/no-unused-modules
export default IssuesWrap
