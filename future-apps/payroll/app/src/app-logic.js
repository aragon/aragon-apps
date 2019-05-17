import { useCallback, useMemo } from 'react'
import { useApi, useAppState, useConnectedAccount } from '@aragon/api-react'
import BN from 'bn.js'
import VAULT_BALANCE_ABI from './abi/vault-balance'
import { usePriceFeedContract, usePriceFeedUpdate } from './pricefeed-hooks'
import { getAllocationUpdateKey } from './utils/employee'
import {
  useExternalContract,
  useNow,
  usePanelState,
  usePromise,
} from './utils/hooks'
import { enumFromPaymentType, PAYMENT_SALARY } from './utils/payment-types'
import { ONE } from './utils/pricefeed'
import { addressesEqual } from './utils/web3'

const FORCE_PRICE_FEED_UPDATE_TIME = 60 * 1000 // 1min
const FORCE_VAULT_UPDATE_TIME = 60 * 1000 // 1min

// App actions
export function useAddEmployeeAction(onDone) {
  const api = useApi()
  return useCallback(
    (accountAddress, initialSalaryPerSecond, startDateInSeconds, role) => {
      if (api) {
        api.addEmployee(
          accountAddress,
          initialSalaryPerSecond,
          startDateInSeconds,
          role
        )
        onDone()
      }
    },
    [api, onDone]
  )
}

export function useDetermineAllocationAction(onDone) {
  const api = useApi()
  return useCallback(
    (tokenAddresses, allocations) => {
      if (api) {
        api.determineAllocation(tokenAddresses, allocations)
        onDone()
      }
    },
    [api, onDone]
  )
}

export function usePaydayAction(onDone) {
  const api = useApi()
  return useCallback(() => {
    if (api) {
      api.payday(enumFromPaymentType(PAYMENT_SALARY))
      onDone()
    }
  }, [api, onDone])
}

// App panels
export function useAppPanels() {
  const addEmployeePanel = usePanelState()
  const editSalaryAllocationPanel = usePanelState()
  const requestSalaryPanel = usePanelState()

  return {
    // Give the edit allocation priority over the other panels
    editSalaryAllocationPanel,
    addEmployeePanel: useMemo(
      () => ({
        ...addEmployeePanel,
        // ensure there is only one panel opened at a time
        visible:
          addEmployeePanel.visible &&
          !editSalaryAllocationPanel.visible &&
          !requestSalaryPanel.visible,
      }),
      [
        addEmployeePanel,
        editSalaryAllocationPanel.visible,
        requestSalaryPanel.visible,
      ]
    ),
    requestSalaryPanel: useMemo(
      () => ({
        ...requestSalaryPanel,
        // ensure there is only one panel opened at a time
        visible:
          requestSalaryPanel.visible &&
          !editSalaryAllocationPanel.visible &&
          !addEmployeePanel.visible,
      }),
      [
        requestSalaryPanel,
        editSalaryAllocationPanel.visible,
        addEmployeePanel.visible,
      ]
    ),
  }
}

// App state
export function useCurrentEmployee() {
  const api = useApi()
  const connectedAccount = useConnectedAccount()
  const { allowedTokens, employees } = useAppState()

  // May be undefined if current connected account is not an employee
  const currentEmployee = employees.find(employee =>
    addressesEqual(employee.accountAddress, connectedAccount)
  )

  const currentEmployeeSalaryAllocations = usePromise(
    () => async () => {
      if (!currentEmployee || currentEmployee.removed) {
        return []
      }
      const { employeeId } = currentEmployee

      const possibleAllocations = await Promise.all(
        allowedTokens.map(async token => {
          const allocation = await api
            .call('getAllocation', employeeId, token.address)
            .toPromise()
          return {
            token,
            allocation: new BN(allocation),
          }
        })
      )
      // Employee may only have some of these allowed tokens selected for their allocation
      return possibleAllocations.filter(
        ({ allocation }) => !allocation.isZero()
      )
    },
    [getAllocationUpdateKey(currentEmployee), allowedTokens]
  )

  return {
    currentEmployee,
    currentEmployeeSalaryAllocations,
  }
}

export function useExchangeRates(tokens) {
  const { denominationToken } = useAppState()
  const priceFeed = usePriceFeedContract()

  // Refresh these exchange rates every minute or as soon as there's an update event
  const now = useNow(FORCE_PRICE_FEED_UPDATE_TIME)
  const lastUpdateDate = usePriceFeedUpdate()
  const updateDate = now > lastUpdateDate ? now : lastUpdateDate

  const defaultValue = tokens.map(token => ({
    xrt: null,
    base: denominationToken.address,
    quote: token.address,
  }))

  const tokensKey = tokens
    .map(({ address }) => address)
    .sort()
    .join('.')
  const updateKey = `${tokensKey}:${updateDate.getTime()}`

  const exchangeRates = usePromise(
    () =>
      Promise.all(
        tokens.map(async token => {
          const xrt = await priceFeed
            .get(denominationToken.address, token.address)
            .toPromise()
          return {
            xrt: new BN(xrt),
            base: denominationToken.address,
            quote: token.address,
          }
        })
      ),
    [updateKey, denominationToken, priceFeed],
    defaultValue
  )

  return exchangeRates
}

export function useVaultBalancesInDenominationToken(tokenExchangeRates) {
  const { vaultAddress } = useAppState()
  const vault = useExternalContract(vaultAddress, VAULT_BALANCE_ABI)

  // Refresh these balances every minute
  const now = useNow(FORCE_VAULT_UPDATE_TIME)

  const balances = usePromise(
    () =>
      Promise.all(
        tokenExchangeRates.map(async ({ quote, xrt }) => {
          const balance = await vault.balance(quote).toPromise()
          // xrt has the denomination as the base
          const denominationAmount = xrt
            ? new BN(balance).mul(ONE).div(xrt)
            : null
          return {
            denominationAmount,
            address: quote,
          }
        })
      ),
    [now, tokenExchangeRates, vault]
  )
  return balances
}
