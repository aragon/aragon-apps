import React from 'react'
import update from 'immutability-helper'
import styled from 'styled-components'
import { AppBar, Button, DefaultAragonApp, DropDown, SidePanel, publicUrlInjector } from '@aragon/ui'
import { EmptyGroupCard, FakeShell, EntityTable } from './components'
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

const AppBarEndButton = styled(Button)`
  width: 150px;
`

class App extends React.Component {
  state = {
    panelOpened: false,
    entities: ENTITIES_DEMO,
    groups: GROUPS_DEMO,
    activeGroupIndex: 0,
  }
  handlePanelOpen = () => {
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
    const empty = groupEntities.length === 0

    const appBarEndButton = (
      <AppBarEndButton mode="strong" onClick={this.handlePanelOpen}>
        Add
      </AppBarEndButton>
    )
    const appBar = (
      <AppBar endContent={appBarEndButton} title="Groups">
        <DropDown
          items={groups.map(group => group.name)}
          active={activeGroupIndex}
          onChange={this.handleChangeGroup}
        />
      </AppBar>
    )
    const panel = <AppPanel entities={entitiesToAdd} onAdd={this.handleAdd} />
    const placeholder = (
      <EmptyGroupCard
        onActivate={this.handlePanelOpen}
        groupName={activeGroup.name}
      />
    )

    return (
      <FakeShell>
        <DefaultAragonApp
          appBar={appBar}
          backgroundLogo={empty}
          empty={empty}
          placeholder={placeholder}
        >
          <EntityTable
            entities={groupEntities}
            onRemove={this.handleRemove}
          />
        </DefaultAragonApp>
        <SidePanel
          title="Add to group Core Devs"
          opened={panelOpened}
          onClose={this.handlePanelClose}
        >
          {panel}
        </SidePanel>
      </FakeShell>
    )
  }
}

export default publicUrlInjector(App)
