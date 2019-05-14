import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { useAppState } from '@aragon/api-react'
import {
  Button,
  SidePanel,
  IconAttention,
  IconFundraising,
  Info,
  Text,
  theme,
} from '@aragon/ui'

import { usePaydayAction } from '../app-logic'
import { employeeType, TokenType } from '../types'
import { formatTokenAmount } from '../utils/formatting'
import Section from '../components/Layout/Section'

const RequestSalary = React.memo(
  ({
    currentEmployee,
    currentEmployeeSalary,
    onEditAllocation,
    panelState,
  }) => {
    const handlePayday = usePaydayAction(panelState.requestClose)
    const { denominationToken } = useAppState()

    return (
      <React.Fragment>
        <SidePanel
          title="Request salary"
          opened={panelState.visible}
          onClose={panelState.requestClose}
          onTransitionEnd={panelState.onTransitionEnd}
        >
          <RequestSalaryContent
            currentEmployeeSalary={currentEmployeeSalary}
            denominationToken={denominationToken}
            onPayday={handlePayday}
            onEditAllocation={onEditAllocation}
          />
        </SidePanel>
      </React.Fragment>
    )
  }
)

class RequestSalaryContent extends React.PureComponent {
  static propTypes = {
    denominationToken: TokenType,
    currentEmployee: employeeType,
    currentEmployeeSalary: PropTypes.object.isRequired,
    onEditAllocation: PropTypes.func.isRequired,
    onPayday: PropTypes.func.isRequired,
  }
  state = {
    balance: null,
  }
  handleRequestClick = event => {
    event.preventDefault()
    this.props.onPayday()
  }
  render() {
    const {
      currentEmployee,
      currentEmployeeSalary,
      denominationToken,
      onEditAllocation,
    } = this.props
    const salaryAllocation = currentEmployeeSalary.allocations

    if (!currentEmployee) {
      return
    }

    const formattedTotalSalary = formatTokenAmount(
      currentEmployeeSalary,
      denominationToken
    )

    // TODO: fix for new partitionbar API
    /*
    const accruedAllocation = Array.isArray(salaryAllocation)
      ? salaryAllocation.map(
          ({ allocation, expectedSalaryInTokens, token }) => {
            const description = (
              <AllocationDescription>
                <div>
                  <Text weight="bold">
                    {formatTokenAmount(expectedSalaryInTokens, token)}
                  </Text>
                </div>
                <div>
                  <Text color="#b0b0b0">{allocation.toString()}%</Text>
                </div>
              </AllocationDescription>
            )

            return {
              ...allocation,
              description,
            }
          }
        )
      : null
      */

    return (
      <Container>
        <AllocationWrapper>
          <SectionTitle>Salary Allocation</SectionTitle>

          {/* TODO: add partition bar */}

          <TotalAllocationWrapper>
            <Text weight="bolder">Total salary</Text>
            <div>
              <span />
              <Text weight="bolder">
                <span css="padding-right: 30px">{formattedTotalSalary}</span>
              </Text>
            </div>
            <Text weight="bolder">100%</Text>
          </TotalAllocationWrapper>

          <Button
            mode="text"
            css="align-self: flex-end"
            onClick={onEditAllocation}
          >
            Edit salary allocation
          </Button>
        </AllocationWrapper>

        <SalaryWrapper>
          <Section.Title>Total Salary</Section.Title>
          <Info>
            <InfoTotalItem>
              <IconFundraising />
              <Text color={theme.textSecondary}>Total salary to be paid</Text>
            </InfoTotalItem>
            <InfoTotalItem>
              <Text size="xxlarge">{formattedTotalSalary}</Text>
            </InfoTotalItem>
          </Info>
        </SalaryWrapper>

        <div>
          <Info.Permissions icon={<IconAttention />}>
            The actual transaction time and exchange rate will influence the
            exact amounts paid to you
          </Info.Permissions>

          <Button
            mode="strong"
            css="margin-top: 20px"
            onClick={this.handleRequestClick}
            wide
          >
            Request Salary
          </Button>
        </div>
      </Container>
    )
  }
}

const Container = styled.section`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`

const SectionTitle = styled(Section.Title)`
  margin-bottom: 0;
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

  div {
    padding-right: 30px;
  }
`

const SalaryWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`

const InfoTotalItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`

export default RequestSalary
