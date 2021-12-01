import { NewFactoryCloneToken as NewFactoryCloneTokenEvent } from '../../../generated/MiniMeTokenFactory@x/MiniMeTokenFactory'
import * as aragon from '../aragon'

export function handleClaimedTokens(event: NewFactoryCloneTokenEvent): void {
  aragon.processToken(event.params.token)
}
