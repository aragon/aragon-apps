import React from 'react'
import update from 'immutability-helper'
import styled from 'styled-components'
import { AragonApp, Text, Button, DropDown, theme } from '@aragon/ui'
import { EmptyStateCard, FakeShell, EntityTable } from './components'
import AppPanel from './AppPanel'

const ENTITIES_DEMO = [
  { id: 1, name: 'Keelia Furmston' },
  { id: 2, name: 'Marlo Drinkhill' },
  { id: 3, name: 'Zaria Ugoni' },
  { id: 4, name: 'Leone Rablan' },
  { id: 5, name: 'Farah Ebbles' },
  { id: 6, name: 'Norry Kingscote' },
  { id: 7, name: 'Lek Wride' },
  { id: 8, name: 'Dix Shervil' },
  { id: 9, name: 'Hanna Cattanach' },
  { id: 10, name: 'Gerald Poyzer' },
]

const GROUPS_DEMO = [
  { name: 'Core Devs', entities: [] },
  { name: 'Contributors', entities: [] },
]

const StyledApp = styled(AragonApp)`
  display: flex;
  align-items: center;
  justify-content: center;
`

const AppContent = styled.div`
  width: 100%;
  padding: 30px;
  align-self: flex-start;
`

class App extends React.Component {
  state = {
    panelOpened: false,
    entities: ENTITIES_DEMO,
    groups: GROUPS_DEMO,
    activeGroupIndex: 0,
  }
  handleCreate = () => {
    this.setState({ panelOpened: true })
  }
  handlePanelClose = () => {
    this.setState({ panelOpened: false })
  }
  handleChangeGroup = index => {
    this.setState({ activeGroupIndex: index })
  }
  handleAdd = id => {
    const { groups, activeGroupIndex } = this.state
    const newGroups = update(groups, {
      [activeGroupIndex]: { entities: { $push: [id] } },
    })
    this.setState({ groups: newGroups })
    this.handlePanelClose()
  }
  handleRemove = id => {
    const { groups, activeGroupIndex } = this.state
    const entityIndex = groups[activeGroupIndex].entities.indexOf(id)
    const newGroups = update(groups, {
      [activeGroupIndex]: {
        entities: {
          $apply: entities => {
            return [
              ...entities.slice(0, entityIndex),
              ...entities.slice(entityIndex + 1),
            ]
          },
        },
      },
    })
    this.setState({ groups: newGroups })
  }
  render() {
    const { panelOpened, activeGroupIndex, entities, groups } = this.state
    const activeGroup = groups[activeGroupIndex]
    const groupEntities = activeGroup.entities.map(id =>
      entities.find(entity => entity.id === id)
    )
    const entitiesToAdd = this.state.entities.filter(
      ({ id }) => !activeGroup.entities.includes(id)
    )
    const panel = <AppPanel entities={entitiesToAdd} onAdd={this.handleAdd} />
    const empty = groupEntities.length === 0
    return (
      <FakeShell
        title="Groups"
        panel={panel}
        panelTitle="Add to group Core Devs"
        panelOpened={panelOpened}
        onPanelClose={this.handlePanelClose}
        groups={groups}
        activeGroupIndex={activeGroupIndex}
        onChangeGroup={this.handleChangeGroup}
        onAdd={this.handleCreate}
      >
        <StyledApp backgroundLogo={empty}>
          {empty ? (
            <EmptyStateCard
              onActivate={this.handleCreate}
              groupName={activeGroup.name}
            />
          ) : (
            <AppContent>
              <EntityTable
                entities={groupEntities}
                onRemove={this.handleRemove}
              />
            </AppContent>
          )}
        </StyledApp>
      </FakeShell>
    )
  }
}

export default App
