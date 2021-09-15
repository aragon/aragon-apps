import { ClaimedTokens as ClaimedTokensEvent, NewCloneToken, Approval } from '../../../generated/templates/MiniMeToken/MiniMeToken'
import { Transfer as TransferEvent } from '../../../generated/templates/MiniMeToken/MiniMeToken'
import { NewCloneToken as NewCloneTokenEvent } from '../../../generated/templates/MiniMeToken/MiniMeToken'
import { Approval as ApprovalEvent } from '../../../generated/templates/MiniMeToken/MiniMeToken'

export function handleClaimedTokens(event: ClaimedTokensEvent): void {}
export function handleTransfer(event: TransferEvent): void {}
export function handleNewCloneToken(event: NewCloneTokenEvent): void {}
export function handleApproval(event: ApprovalEvent): void {}
