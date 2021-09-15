import { DeployInstance as DeployInstanceEvent } from '../../../generated/bare-kit.aragonpm.eth@1.0.0/DAOKit'
import { InstalledApp as InstalledAppEvent } from '../../../generated/bare-kit.aragonpm.eth@1.0.0/DAOKit'
import { DeployToken as DeployTokenEvent } from '../../../generated/bare-kit.aragonpm.eth@1.0.0/DAOKit'
import * as aragon from '../aragon'

export function handleDeployInstance(event: DeployInstanceEvent): void {
  aragon.processOrg(event.params.dao)
}

export function handleInstalledApp(event: InstalledAppEvent): void {
  aragon.processApp(event.params.appProxy, event.params.appId.toHexString())
}

export function handleDeployToken(event: DeployTokenEvent): void {
  aragon.processToken(event.params.token)
}
