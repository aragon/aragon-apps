import React from 'react'
import styled from 'styled-components'
import { Button } from '@aragon/ui'
import { Table } from '..'

const Entity = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

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

const EntityTable = ({ entities, onRemove }) => {
  return (
    <Table title="Entity">
      {entities.map(({ id, name }, i) => (
        <tr key={i}>
          <td>
            <Entity>
              <div>{name}</div>
              <Remove id={id} onRemove={onRemove} />
            </Entity>
          </td>
        </tr>
      ))}
    </Table>
  )
}

export default EntityTable
