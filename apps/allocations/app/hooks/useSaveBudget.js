import { usePanel } from '../context/Panel'
import { useAragonApi } from '../api-react'

export default function useSaveBudget() {
  const { api } = useAragonApi()
  const { setPanel } = usePanel()

  return function saveBudget({ id, amount, name, token }) {
    if (id) {
      api.setBudget(id, amount, name).toPromise()
    } else {
      api
        .newAccount(
          name,             // _metadata
          token.address,    // _token
          true,             // hasBudget
          amount
        )
        .toPromise()
    }
    setPanel(null)
  }
}
