import React from 'react'
import styled from 'styled-components'
import { Button } from '@aragon/ui'

import { connect } from '../../context/AragonContext'
import PartitionBar from '../../components/Bar/PartitionBar'
import Section from '../../components/Layout/Section'
import { EditSalaryAllocation } from '../../panels'

const Container = styled.section`
  display: flex;
  flex-direction: column;
`

const EditButton = styled(Button).attrs({ mode: 'secondary' })`
  align-self: flex-end;
`

class SalaryAllocation extends React.PureComponent {
  state = {
    isEditing: false,
  }

  startEditing = () => {
    this.setState({ isEditing: true })
  }

  endEditing = () => {
    this.setState({ isEditing: false })
  }

  render() {
    const { salaryAllocation } = this.props
    const { isEditing } = this.state

    return (
      <Container>
        <Section.Title>Salary allocation</Section.Title>

        {salaryAllocation && <PartitionBar data={salaryAllocation} />}

        <EditButton onClick={this.startEditing}>
          Edit salary allocation
        </EditButton>

        <EditSalaryAllocation opened={isEditing} onClose={this.endEditing} />
      </Container>
    )
  }
}

function mapStateToProps({ salaryAllocation }) {
  return {
    salaryAllocation,
  }
}

export default connect(mapStateToProps)(SalaryAllocation)
