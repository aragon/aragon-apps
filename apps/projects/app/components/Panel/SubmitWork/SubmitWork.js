import React, { useState } from 'react'
import styled from 'styled-components'

import { Checkbox, GU, Text, TextInput, useTheme } from '@aragon/ui'

import { Form, FormField } from '../../Form'
import useGithubAuth from '../../../hooks/useGithubAuth'
import { useAragonApi } from '../../../api-react'
import { usePanelManagement } from '../../Panel'
import { ipfsAdd } from '../../../utils/ipfs-helpers'
import { issueShape } from '../../../utils/shapes.js'
import standardBounties from '../../../abi/StandardBounties.json'
import { IssueTitle } from '../PanelComponents'

const SubmitWork = ({ issue }) => {
  const githubCurrentUser = useGithubAuth()
  const { api, connectedAccount } = useAragonApi()
  const theme = useTheme()

  const { closePanel } = usePanelManagement()
  const [ comments, setComments ] = useState('')
  const [ hours, setHours ] = useState(0)
  const [ proof, setProof ] = useState('')
  const [ ack1, setAck1 ] = useState(false)
  const [ ack2, setAck2 ] = useState(false)

  const updateComments = e => setComments(e.target.value)
  const updateHours = e => setHours(e.target.value)
  const updateProof = e => setProof(e.target.value)
  const toggleAck1 = () => setAck1(!ack1)
  const toggleAck2 = () => setAck2(!ack2)

  const onSubmitWork = async() => {
    const today = new Date()
    const time = (hours === '' || hours === 0) ? '-' : hours
    const data = {
      user: githubCurrentUser,
      submissionDate: today.toISOString(),
      comments,
      proof,
      hours: time,
      ack1,
      ack2,
    }

    closePanel()

    const ipfsHash = await ipfsAdd(data)
    const bountiesRegistry = await api.call('bountiesRegistry').toPromise()
    const bountyContract = api.external(bountiesRegistry, standardBounties.abi)
    bountyContract.fulfillBounty(
      connectedAccount, // address _sender,
      issue.standardBountyId, // uint _bountyId,
      [connectedAccount], // address payable [] memory  _fulfillers,
      ipfsHash // string memory _data
    ).toPromise()
  }

  const canSubmit = () => !(ack1 && ack2 && proof)

  return (
    <div css={`margin: ${2 * GU}px 0`}>
      <Form
        onSubmit={onSubmitWork}
        submitText="Submit Work"
        noSeparator
        submitDisabled={canSubmit()}
      >
        <IssueTitle issue={issue} />

        <FormField
          label="Submission"
          required
          input={
            <TextInput.Multiline
              name="proof"
              value={proof}
              rows="3"
              onChange={updateProof}
              placeholder="Add a link to your work, such as a document or a pull request."
              wide
            />
          }
        />
        <FormField
          label="Additional Comments"
          input={
            <TextInput.Multiline
              name="comments"
              rows="3"
              value={comments}
              onChange={updateComments}
              placeholder="Comments or details that haven’t already been described elsewhere."
              wide
            />
          }
        />

        <FormField
          label="Hours Worked"
          input={
            <TextInput.Number
              name="hours"
              value={hours}
              onChange={updateHours}
              wide
            />
          }
        />

        <AckRow>
          <div css="width: 23px">
            <Checkbox checked={ack1} onChange={toggleAck1} />
          </div>
          <AckText color={`${theme.surfaceContentSecondary}`}>
            I acknowledge that my work must be accepted for me to receive the
            payout.
          </AckText>
        </AckRow>

        <AckRow>
          <div css="width: 23px">
            <Checkbox checked={ack2} onChange={toggleAck2} />
          </div>
          <AckText color={`${theme.surfaceContentSecondary}`}>
            I understand that reporting hours is for informational and planning purposes only.
          </AckText>
        </AckRow>
      </Form>
    </div>
  )
}

SubmitWork.propTypes = issueShape

const AckText = styled(Text)`
  margin-left: ${GU}px;
`
const AckRow = styled.div`
  display: flex;
  margin: ${2 * GU}px 0;
`

export default SubmitWork
