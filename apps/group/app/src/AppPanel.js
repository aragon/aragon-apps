import React from 'react'
import styled from 'styled-components'
import { Text, Button, DropDown, theme } from '@aragon/ui'

const Field = styled.div`margin-bottom: 20px;`

class AppPanel extends React.Component {
  state = {
    selectedEntity: 0,
  }
  handleAdd = () => {
    const entity = this.props.entities[this.state.selectedEntity]
    this.props.onAdd(entity.id)
  }
  handleEntityChange = index => {
    this.setState({ selectedEntity: index })
  }
  render() {
    const { entities, onAdd } = this.props
    const { selectedEntity } = this.state
    return (
      <div>
        <Field>
          <label>
            <Text color={theme.textSecondary} smallcaps>
              Entity
            </Text>
            <DropDown
              active={selectedEntity}
              items={entities.map(({ name }) => name)}
              onChange={this.handleEntityChange}
            />
          </label>
        </Field>
        <Button mode="strong" onClick={this.handleAdd} wide>
          Add
        </Button>
      </div>
    )
  }
}

export default AppPanel
