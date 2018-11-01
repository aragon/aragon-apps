import React from 'react'
import styled from 'styled-components'
import { Button, SidePanel, Text } from '@aragon/ui'

import AragonContext from '../../context/AragonContext'
import PartitionBar from '../../components/Bar/PartitionBar'

// import { getSalaryAllocation } from '../../data'

const Container = styled.section`
  display: flex;
  flex-direction: column;
`

const EditButton = styled(Button).attrs({ mode: 'secondary' })`
  align-self: flex-end;
`

class SalaryAllocation extends React.Component {
  static contextType = AragonContext

  state = {
    salaryAllocation: [{
      symbol: 'test',
      allocation: 0
    }],
    isEditing: false
  }

  componentDidMount () {
    const app = this.context

    if (app && typeof app.state === 'function') {
      this.subscription = app.state()
        .pluck('salaryAllocation')
        .subscribe(salaryAllocation => {
          console.log('SalaryAllocation subscription', salaryAllocation)
          if (salaryAllocation) {
            this.setState({ salaryAllocation })
          }
        })
    }
  }

  componentWillUnmount () {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }

  startEditing = () => {
    // this.setState({ isEditing: true })
  }

  endEditing = () => {
    // this.setState({ isEditing: false })
  }

  render () {
    const { salaryAllocation, isEditing } = this.state

    return (
      <Container>
        <Text size='large'>
          Salary allocation
        </Text>

        <PartitionBar data={salaryAllocation}/>

        <EditButton onClick={this.startEditing}>
          Edit salary allocation
        </EditButton>

        <SidePanel
          title='Edit salary allocation'
          opened={isEditing}
          onClose={this.endEditing}
        />
      </Container>
    )
  }
}

export default SalaryAllocation
