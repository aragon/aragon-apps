import { hexToAscii, toHex } from 'web3-utils'
import { app } from '../app'
import { ipfsGet } from '../../utils/ipfs-helpers'
import standardBounties from '../../abi/StandardBounties.json'

export const loadIssueData = async ({ repoId, issueNumber }) => {
  const {
    hasBounty,
    standardBountyId,
    balance,
    assignee,
  } = await app.call('getIssue', repoId, issueNumber).toPromise()

  const bountiesRegistry = await app.call('bountiesRegistry').toPromise()
  const bountyContract = app.external(bountiesRegistry, standardBounties.abi)
  const {
    deadline,
    token,
    workStatus,
  } = await bountyContract.getBounty(standardBountyId).toPromise()
  // example data returned from getBounty:
  // {
  //   approvers: ['0xd79eEe331828492c2ba4c11bf468fb64d52a46F9'], // projects app id
  //   balance: '1000000000000000000',
  //   contributions: [{
  //     amount: '1000000000000000000',
  //     contributor: '0xd79eEe331828492c2ba4c11bf468fb64d52a46F9', // projects app id
  //     refunded: false,
  //   }],
  //   deadline: '1569868629565',
  //   fulfillments: [{
  //     fulfillers: ['0xb4124cEB3451635DAcedd11767f004d8a28c6eE7'], // local superuser
  //     submitter: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7', // local superuser
  //   }],
  //   hasBounty: true,
  //   hasPaidOut: false,
  //   issuers: [PROJECTS_APP_ID],
  //   standardBountyId: '0',
  //   token: '0x0000000000000000000000000000000000000000',
  //   tokenVersion: '0',
  //   workStatus: 'funded',
  // }

  // keep keys explicit for data integrity & code readability
  return {
    // passed in
    number: Number(issueNumber),
    repoId: hexToAscii(repoId),

    // from Projects.sol
    assignee,
    balance,
    hasBounty,
    standardBountyId,

    // from StandardBounties.sol
    deadline: new Date(Number(deadline)).toISOString(),
    token,
    workStatus,
    openSubmission: /^0xf{40}$/i.test(assignee),
  }
}

export const loadIpfsData = async ipfsHash => {
  const {
    issueId,
    exp,
    fundingHistory,
    hours,
    repo,
  } = await ipfsGet(ipfsHash)
  return {
    issueId,
    exp,
    fundingHistory,
    hours,
    repo,
  }
}

const existPendingApplications = issue => {
  if (!('requestsData' in issue) || issue.requestsData.length === 0) return false
  return issue.requestsData.filter(rd => !('review' in rd)).length > 0
}

const existWorkInProgress = issue => {
  if (!('requestsData' in issue) || issue.requestsData.length === 0) return false

  let exists = false

  // each accepted request can have work submitted already
  issue.requestsData.forEach(request => {
    if ('review' in request && request.review.approved) {
      if (!('workSubmissions' in issue) || issue.workSubmissions.length === 0) {
        exists = true
        return
      }

      if (issue.workSubmissions.filter(
        work => (work.user.login === request.user.login && !('review' in work))
      ).length > 0) {
        exists = true
      }
    }
  })

  return exists
}

const isWorkDone = issue => {
  if (
    !issue.hasOwnProperty('workSubmissions') ||
    issue.workSubmissions.length === 0
  ) return false

  return issue.workSubmissions.some(work =>
    work.hasOwnProperty('review') &&
      work.review.accepted
  )
}

const workReadyForReview = issue => {
  if (!('workSubmissions' in issue) || issue.workSubmissions.length === 0) return false
  return issue.workSubmissions.filter(work => !('review' in work)).length > 0
}

// protects against eth events coming back in the wrong order for bountiesrequest.
export const determineWorkStatus = issue => {
  if (isWorkDone(issue)) {
    issue.workStatus = 'fulfilled'
    return issue
  }
  if (!(existWorkInProgress(issue)) && !(workReadyForReview(issue))) {
    issue.workStatus = existPendingApplications(issue) ? 'review-applicants' : 'funded'
  } else{
    issue.workStatus = workReadyForReview(issue) ? 'review-work': 'in-progress'
  }
  return issue
}

const getRequest = (repoId, issueNumber, applicantId) => {
  return new Promise(resolve => {
    app.call('getApplicant', repoId, issueNumber, applicantId).subscribe(async (response) => {
      const bountyData = await ipfsGet(response.application)
      resolve({
        contributorAddr: response.applicant,
        requestIPFSHash: response.application,
        ...bountyData
      })
    })
  })
}

const loadRequestsData = ({ repoId, issueNumber }) => {
  return new Promise(resolve => {
    app.call('getApplicantsLength', repoId, issueNumber).subscribe(async (response) => {
      let applicants = []
      for(let applicantId = 0; applicantId < response; applicantId++){
        applicants.push(await getRequest(repoId, issueNumber, applicantId))
      }
      resolve(applicants)
    })
  })
}

export const buildSubmission = async ({ fulfillmentId, fulfillers, ipfsHash, submitter }) => {
  const {
    ack1,
    ack2,
    comments,
    hours,
    proof,
    submissionDate,
    user,
  } = await ipfsGet(ipfsHash)

  return {
    ack1,
    ack2,
    comments,
    fulfillmentId,
    fulfillers,
    hours,
    proof,
    submissionDate,
    submissionIPFSHash: ipfsHash,
    submitter,
    user,
  }
}

export const updateIssueDetail = async data => {
  let returnData = { ...data }
  const repoId = toHex(data.repoId)
  const issueNumber = String(data.number)
  const requestsData = await loadRequestsData({ repoId, issueNumber })
  returnData.requestsData = requestsData
  return returnData
}

const checkIssuesLoaded = (issues, issueNumber, data) => {
  const issueIndex = issues.findIndex(issue => issue.issueNumber === issueNumber)

  if (issueIndex === -1) {
    // If we can't find it, load its data, perform the transformation, and concat
    return issues.concat({
      issueNumber,
      data: data
    })
  }

  const nextIssues = Array.from(issues)
  nextIssues[issueIndex] = {
    issueNumber,
    data: {
      ...nextIssues[issueIndex].data,
      ...data,
    },
  }
  return nextIssues
}

const updateIssueState = (state, issueNumber, data) => {
  if(!data) return state
  const issues = state.issues || []
  let newIssues
  try {
    newIssues = checkIssuesLoaded(issues, issueNumber, data)
    let newState = { ...state, issues: newIssues }
    return newState
  } catch (err) {
    console.error(
      'Update issues failed to return:',
      err,
      'here\'s what returned in newIssues',
      newIssues
    )
  }
}

export const syncIssues = (state, { issueNumber }, data) => {
  try {
    return updateIssueState(state, issueNumber, data)
  } catch (err) {
    console.error('updateIssueState failed to return:', err)
  }
}
