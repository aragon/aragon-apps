import React from 'react'
import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Button, SidePanel, IconAttention, Info, theme, Text } from '@aragon/ui'

import { connect } from '../context/AragonContext'
import Section from '../components/Layout/Section'
import PartitionBar from '../components/Bar/PartitionBar'
import priceFeedAbi from './abi/price-feed'

const SECONDS_IN_A_YEAR = 31557600 // 365.25 days

const Container = styled.section`
  display: flex;
  flex-direction: column;
`

const AllocationWrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding-bottom: 20px;
  border-bottom: 1px solid ${theme.contentBorder};
`

const TotalAllocationWrapper = styled.div`
  display: grid;
  grid-template-columns: 2fr 6fr 1fr;

  > :nth-child(2) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    justify-items: end;
  }

  > :last-child {
    justify-self: end;
  }
`

const AllocationDescription = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  justify-items: end;
`

const SalaryWrapper = styled.div`
  display: flex;
  flex-direction: column;
`

const EditButton = styled(Button).attrs({ mode: 'text' })`
  align-self: flex-end;
`

const ButtonWrapper = styled.div`
  flex-grow: 1;
`

const RequestButton = styled(Button).attrs({ mode: 'strong', wide: true })`
  margin-top: 20px;
`

class RequestSalary extends React.Component {
  state = {
    salaryAllocation: this.props.salaryAllocation,
    priceFeedAddress: this.props.priceFeedAddress,
    currentAccount: this.props.currentAccount,
    denominationToken: this.props.denominationToken,
    employees: this.props.employee
  }

  componentDidMount () {
    console.log('RequestSalary componentDidMount', this)
    // const salaryAllocation = await this.loadSalaryAllocationXRT();
  }

  // loadSalaryAllocationXRT = () => {
  //   const {
  //     priceFeedAddress,
  //     currentAccount: { salaryAllocation },
  //     denominationToken: { address: denominationTokenAddress }
  //   } = this.steta;

  //   const priceFeed = app.external(priceFeedAddress, priceFeedAbi)

  //   return Promise.all(
  //     salaryAllocation.map(tokenAllocation => {
  //       return priceFeed
  //         .get(denominationTokenAddress, tokenAllocation.address)
  //         .first()
  //         .map(({xrt}) => {
  //           return {
  //             ...tokenAllocation,
  //             xrt
  //           }
  //         })
  //         .toPromise()
  //     })
  //   )
  // }

  handlePanelToggle = (opened) => {
    console.log('handlePanelToggle', opened)
    console.log(this.state)
    // if (opened) { // When side panel is shown
    //   // this.focusFirstEmptyField()
    // }
  }

  handleRequestClick = (event) => {
    event.preventDefault()

    // const app = this.context

    // if (app) {
    //   const accountAddress = this.state.entity.accountAddress
    //   const initialDenominationSalary = this.state.salary / SECONDS_IN_A_YEAR
    //   const name = this.state.entity.domain
    //   const startDate = Math.floor(this.state.startDate.getTime() / 1000)

    //   app.addEmployeeWithNameAndStartDate(
    //     accountAddress,
    //     initialDenominationSalary,
    //     name,
    //     startDate
    //   ).subscribe(employee => {
    //     if (employee) {
    //       // Reset form data
    //       this.setState(AddEmployee.initialState)

    //       // Close side panel
    //       this.props.onClose()
    //     }
    //   })
    // }
  }

  startEditing = () => {
    // TODO: this.setState({ isEditing: true })
  }

  endEditing = () => {
    // TODO: this.setState({ isEditing: false })
  }

  render () {
    const { opened, onClose } = this.props
    const { salaryAllocation } = this.state

    const panel = (
      <SidePanel
        title='Request salary'
        opened={opened}
        onClose={onClose}
        onTransitionEnd={this.handlePanelToggle}
      >
        <Container>
          <AllocationWrapper>
            <Section.Title>Salary Allocation</Section.Title>

            <PartitionBar data={salaryAllocation} />

            <TotalAllocationWrapper>
              <Text weight='bolder'>
                Total salary
              </Text>
              <div>
                <span />
                <Text weight='bolder'>
                  $6,245.52
                </Text>
              </div>
              <Text weight='bolder'>
                100%
              </Text>
            </TotalAllocationWrapper>

            <EditButton
              onClick={this.startEditing}
              data-testid='salary-allocation-edit-btn'
            >
              Edit salary allocation
            </EditButton>
          </AllocationWrapper>

          <SalaryWrapper>
            <Section.Title>Total Salary</Section.Title>
          </SalaryWrapper>

          <ButtonWrapper>
            <Info.Permissions icon={<IconAttention />}>
              The actual exchange reate might change once the transaction takes place
            </Info.Permissions>

            <RequestButton onClick={this.handleRequestClick}>
              Request Salary
            </RequestButton>
          </ButtonWrapper>

        </Container>

      </SidePanel>
    )

    return panel
    // return createPortal(
    //   panel,
    //   document.getElementById('modal-root')
    // )
  }
}

RequestSalary.propsType = {
  onClose: PropTypes.func,
  opened: PropTypes.bool
}

function mapStateToProps ({
    salaryAllocation,
    priceFeedAddress,
    currentAccount,
    denominationToken,
    employees
}) {
  return {
    salaryAllocation,
    priceFeedAddress,
    currentAccount,
    denominationToken,
    employees
  }
}

export default connect(mapStateToProps)(RequestSalary)
