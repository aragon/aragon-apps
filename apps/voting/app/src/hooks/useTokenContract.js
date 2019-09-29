import { useEffect, useState } from 'react'
import { useAragonApi } from '@aragon/api-react'
import tokenBalanceOfAbi from '../abi/token-balanceOf.json'
import tokenBalanceOfAtAbi from '../abi/token-balanceOfAt.json'

const TOKEN_ABI = [].concat(tokenBalanceOfAbi, tokenBalanceOfAtAbi)

// Load and returns the token contract, or null if not loaded yet.
export default function useTokenContract() {
  const { api, appState } = useAragonApi()
  const { tokenAddress } = appState
  const [contract, setContract] = useState(
    api && tokenAddress ? api.external(tokenAddress, TOKEN_ABI) : null
  )

  useEffect(() => {
    // We assume there is never any reason to set the contract back to null.
    if (api && tokenAddress && !contract) {
      setContract(api.external(tokenAddress, TOKEN_ABI))
    }
  }, [api, tokenAddress, contract])

  return contract
}
