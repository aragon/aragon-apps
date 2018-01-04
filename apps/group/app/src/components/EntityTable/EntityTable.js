import React from 'react'
import { Button, Table, TableCell, TableHeader, TableRow } from '@aragon/ui'

class Remove extends React.Component {
  handleClick = () => {
    this.props.onRemove(this.props.id)
  }
  render() {
    return (
      <Button
        mode="outline"
        emphasis="negative"
        compact
        onClick={this.handleClick}
      >
        Remove
      </Button>
    )
  }
}

const EntityCell = ({ id, name, onRemove }) => (
  <TableCell>
    <div>{name}</div>
    <Remove id={id} onRemove={onRemove} />
  </TableCell>
)

const EntityHeader = () => (
  <TableRow>
    <TableHeader title="Entity" />
  </TableRow>
)

const EntityTable = ({ entities, onRemove }) => {
  return (
    <Table header={<EntityHeader />}>
      {entities.map(({ id, name }, i) => (
        <TableRow key={i}>
          <EntityCell id={id} name={name} onRemove={onRemove} />
        </TableRow>
      ))}
    </Table>
  )
}

export default EntityTable
