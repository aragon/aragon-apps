import React, { useState } from 'react'
import { useAppState } from '@aragon/api-react'
import { Main, TabBar, Viewport } from '@aragon/ui'
import BN from 'bn.js'
import AppLayout from './components/AppLayout'
import {
  useAppPanels,
  useCurrentEmployee,
  useExchangeRates,
  useVaultBalancesInDenominationToken,
} from './app-logic'
import { useEmployeeSalary } from './employee-hooks'
import { MyPayroll, TeamPayroll } from './screens'
import {
  AddEmployee as AddEmployeePanel,
  RequestSalary as RequestSalaryPanel,
  EditSalaryAllocation as EditSalaryAllocationPanel,
} from './panels'

const SCREENS = ['My payroll', 'Team payroll']

function App() {
  const [activeTab, setActiveTab] = useState(0)
  const { allowedTokens } = useAppState()
  const {
    addEmployeePanel,
    editSalaryAllocationPanel,
    requestSalaryPanel,
  } = useAppPanels()
  const {
    currentEmployee,
    currentEmployeeSalaryAllocations,
  } = useCurrentEmployee()
  const exchangeRates = useExchangeRates(allowedTokens)
  const currentEmployeeSalary = useEmployeeSalary(
    currentEmployee,
    currentEmployeeSalaryAllocations,
    exchangeRates
  )
  const vaultBalancesInDenominationToken = useVaultBalancesInDenominationToken(
    exchangeRates
  )

  const vaultCashReserves = vaultBalancesInDenominationToken
    ? vaultBalancesInDenominationToken.reduce(
        (sum, { denominationAmount }) =>
          denominationAmount ? sum.add(denominationAmount) : sum,
        new BN(0)
      )
    : null

  // TODO: add icon for responsive view
  const mainButton =
    activeTab === 0
      ? {
          buttonProps: currentEmployee ? {} : { disabled: true },
          label: 'Request salary',
          onClick: requestSalaryPanel.requestOpen,
        }
      : {
          label: 'Add new employee',
          onClick: addEmployeePanel.requestOpen,
        }

  return (
    <Main assetsUrl="./aragon-ui">
      <div css="min-width: 320px">
        <AppLayout
          title="Payroll"
          mainButton={mainButton}
          smallViewPadding={0}
          tabs={
            <Viewport>
              {({ below }) => (
                <div
                  css={`
                    margin-left: ${below('medium') ? '-14px' : '0'};
                  `}
                >
                  <TabBar
                    items={SCREENS}
                    selected={activeTab}
                    onChange={setActiveTab}
                  />
                </div>
              )}
            </Viewport>
          }
        >
          {activeTab === 0 && (
            <MyPayroll
              currentEmployee={currentEmployee}
              currentEmployeeSalary={currentEmployeeSalary}
              currentEmployeeSalaryAllocations={
                currentEmployeeSalaryAllocations
              }
              onEditAllocation={editSalaryAllocationPanel.requestOpen}
            />
          )}
          {activeTab === 1 && (
            <TeamPayroll vaultCashReserves={vaultCashReserves} />
          )}
        </AppLayout>

        <AddEmployeePanel panelState={addEmployeePanel} />
        <RequestSalaryPanel
          currentEmployee={currentEmployee}
          currentEmployeeSalary={currentEmployeeSalary}
          onEditAllocation={editSalaryAllocationPanel.requestOpen}
          panelState={requestSalaryPanel}
        />
        <EditSalaryAllocationPanel
          currentEmployeeSalaryAllocations={currentEmployeeSalaryAllocations}
          panelState={editSalaryAllocationPanel}
        />
      </div>
    </Main>
  )
}

export default App
