import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Button, Text, useTheme } from '@aragon/ui'

import FilterTile from './FilterTile'
import { prepareFilters } from '../Shared/FilterBar'
import { issueShape } from '../../utils/shapes.js'

const Filters = ({ filters, issues, bountyIssues, disableFilter, disableAllFilters, style }) => {
  const theme = useTheme()

  const generateFilterNamesAndPaths = (filterInformation, type, textFieldToUse) => {
    const appliedFilters = {}
    Object.keys(filterInformation[type]).map(id => {
      const filterApplied = id in filters[type]
      const filterName = filterInformation[type][id][textFieldToUse]
      if (filterApplied) {
        appliedFilters[filterName] = [ type, id ]
      }
    })
    return appliedFilters
  }

  /*
    creates one object that looks like this:
    {
      filter1Name: [path, to, filter1, on, parent],
      filter2Name: [path, to, filter2, on, parent],
    }

    to make it easier to deselect filters from this view without multiple state objects
  */
  const calculateFilters = () => {
    const filterInformation = prepareFilters(issues, bountyIssues)

    const projectBasedFilters = generateFilterNamesAndPaths(
      filterInformation,
      'projects',
      'name'
    )
    const labelBasedFilters = generateFilterNamesAndPaths(
      filterInformation,
      'labels',
      'name'
    )
    const milestoneBasedFilters = generateFilterNamesAndPaths(
      filterInformation,
      'milestones',
      'title'
    )
    const statusBasedFilters = generateFilterNamesAndPaths(
      filterInformation,
      'statuses',
      'name'
    )

    return {
      ...projectBasedFilters,
      ...labelBasedFilters,
      ...milestoneBasedFilters,
      ...statusBasedFilters,
    }
  }

  const filterAliases = calculateFilters()

  if (Object.keys(filterAliases).length === 0) return null

  return (
    <Wrap style={style}>
      {Object.keys(filterAliases).map(alias => {
        const pathToDisableFilter = filterAliases[alias]
        return (
          <FilterTile
            key={pathToDisableFilter.join('')}
            text={alias}
            disableFilter={() =>
              disableFilter(pathToDisableFilter)
            }
          />
        )
      })}
      {Object.keys(filterAliases).length > 0 && (
        <Button
          size="mini"
          onClick={disableAllFilters}
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
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: 100%;
`

Filters.propTypes = {
  filters: PropTypes.shape({
    projects: PropTypes.object.isRequired,
    labels: PropTypes.object.isRequired,
    milestones: PropTypes.object.isRequired,
    deadlines: PropTypes.object.isRequired,
    experiences: PropTypes.object.isRequired,
    statuses: PropTypes.object.isRequired,
  }),
  issues: PropTypes.arrayOf(issueShape).isRequired,
  bountyIssues: PropTypes.arrayOf(issueShape).isRequired,
  disableFilter: PropTypes.func.isRequired,
  disableAllFilters: PropTypes.func.isRequired,
  style: PropTypes.object,
}

Filters.defaultProps = {
  filters: {
    projects: {},
    labels: {},
    milestones: {},
    deadlines: {},
    experiences: {},
    statuses: {},
  },
  issues: [],
  bountyIssues: [],
}

export default Filters