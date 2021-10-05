import { SidePanel } from '@aragon/ui'
import PropTypes from 'prop-types'
import React, { Suspense, createContext } from 'react'

const camel2title = camelCase =>
  camelCase
    .replace(/([A-Z])/g, match => ` ${match.toLowerCase()}`)
    .replace(/^ (.)/, match => match.toUpperCase())

const dynamicImport = Object.freeze({
  FundIssues: () => import('./FundIssues'),
  NewIssueCuration: () => import('./NewIssueCuration'),
  NewIssue: () => import('./NewIssue'),
  NewProject: () => import('./NewProject'),
  RequestAssignment: () => import('./RequestAssignment'),
  ReviewApplication: () => import('./ReviewApplication'),
  ReviewWork: () => import('./ReviewWork'),
  SubmitWork: () => import('./SubmitWork'),
  ViewFunding: () => import('./ViewFunding'),
})

export const PANELS = Object.keys(dynamicImport).reduce((obj, item) => {
  obj[item] = item
  return obj
}, {})

export const PanelContext = createContext({
  setActivePanel: () => {},
  setPanelProps: () => {},
})

export const PanelManager = ({ activePanel = null, onClose, ...panelProps }) => {
  const panelTitle = panelProps.title
    ? panelProps.title
    : activePanel && camel2title(activePanel)
  const PanelComponent = activePanel && React.lazy(dynamicImport[activePanel])
  return (
    <SidePanel
      title={panelTitle || ''}
      opened={!!activePanel}
      onClose={onClose}
    >
      <Suspense fallback={<div>Loading Panel...</div>}>
        {PanelComponent && <PanelComponent {...panelProps} />}
      </Suspense>
    </SidePanel>
  )
}

PanelManager.propTypes = {
  activePanel: PropTypes.string,
  onClose: PropTypes.func,
}
