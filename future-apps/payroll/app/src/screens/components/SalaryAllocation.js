import React from 'react'
import styled from 'styled-components'
import { Button, SidePanel } from '@aragon/ui'

import AragonContext from '../../context/AragonContext'
import PartitionBar from '../../components/Bar/PartitionBar'
import Section from '../../components/Layout/Section'

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
    salaryAllocation: [],
    isEditing: false
  }

  componentDidMount () {
    const app = this.context

    if (app && typeof app.state === 'function') {
      this.subscription = app
        .state()
        .pluck('currentAccount', 'salaryAllocation')
        .subscribe(salaryAllocation => {
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
    // TODO: this.setState({ isEditing: true })
  }

  endEditing = () => {
    // TODO: this.setState({ isEditing: false })
  }

  render () {
    const { salaryAllocation, isEditing } = this.state

    return (
      <Container>
        <Section.Title>Salary allocation</Section.Title>

        <PartitionBar data={salaryAllocation} />

        <EditButton
          onClick={this.startEditing}
          data-testid='salary-allocation-edit-btn'
        >
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
