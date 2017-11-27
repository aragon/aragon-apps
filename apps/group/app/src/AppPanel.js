import React from 'react'
import { Button, DropDown, Field } from '@aragon/ui'

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
    const { entities } = this.props
    const { selectedEntity } = this.state
    return (
      <div>
        <Field label="Entity">
          <DropDown
            active={selectedEntity}
            items={entities.map(({ name }) => name)}
            onChange={this.handleEntityChange}
          />
        </Field>
        <Button mode="strong" onClick={this.handleAdd} wide>
          Add
        </Button>
      </div>
    )
  }
}

export default AppPanel
