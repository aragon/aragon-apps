import vaultBalanceAbi from '../abi/vault/vault-balance.json'
import vaultGetInitializationBlockAbi from '../abi/vault/vault-getinitializationblock.json'
import vaultEventAbi from '../abi/vault/vault-events.json'
import {app, retryEvery, updateBalances} from '.'

const vaultAbi = [].concat(
  vaultBalanceAbi,
  vaultGetInitializationBlockAbi,
  vaultEventAbi
)

export const getVault = () =>
  retryEvery(async () => {
    try {
      const address = await app.call('vault').toPromise()
      const contract = app.external(address, vaultAbi)
      const initializationBlock = await contract
        .getInitializationBlock()
        .toPromise()
      return {address, contract, initializationBlock}
    } catch (err) {
      throw new Error('vault contract not loading', err)
    }
  })

export const vaultLoadBalance = async (state, {token}, settings) => {
  return {
    ...state,
    balances: await updateBalances(
      state.balances,
      token || settings.ethToken.address,
      settings
    ),
  }
}
