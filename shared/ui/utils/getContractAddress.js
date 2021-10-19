import { first } from 'rxjs/operators'
import Aragon from '@aragon/api'

const app = new Aragon()

export const getContractAddress = async (contractName, retry) => {
  try {
    const contractNameAddress = await app
      .call(contractName)
      .pipe(first())
      .toPromise()
    return contractNameAddress
  } catch (error) {
    console.error(
      `Could not start script due to contract not loading ${contractName}`,
      err
    )
    retry()
  }
}
