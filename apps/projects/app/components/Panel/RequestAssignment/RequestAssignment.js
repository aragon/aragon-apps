import React, { useState } from 'react'
import styled from 'styled-components'

import { Checkbox, Text, TextInput, GU, useTheme } from '@aragon/ui'

import { Form, FormField, DateInput } from '../../Form'
import { useAragonApi } from '../../../api-react'
import useGithubAuth from '../../../hooks/useGithubAuth'
import { usePanelManagement } from '..'
import { ipfsAdd } from '../../../utils/ipfs-helpers'
import { toHex } from 'web3-utils'
import { issueShape } from '../../../utils/shapes.js'
import { IssueTitle } from '../PanelComponents'

const RequestAssignment = ({ issue }) => {
  const githubCurrentUser = useGithubAuth()
  const { api } = useAragonApi()
  const theme = useTheme()

  const { closePanel } = usePanelManagement()
  const [ workplan, setWorkplan ] = useState('')
  const [ hours, setHours ] = useState(0)
  const [ eta, setEta ] = useState(new Date())
  const [ ack1, setAck1 ] = useState(false)
  const [ ack2, setAck2 ] = useState(false)

  const updateWorkplan = e => setWorkplan(e.target.value)
  const updateHours = e => setHours(e.target.value)
  const updateEta = eta => setEta(eta)
  const toggleAck1 = () => setAck1(!ack1)
  const toggleAck2 = () => setAck2(!ack2)

  const onRequestAssignment = async () => {
    closePanel()

    const today = new Date()
    //If user hasn't set values, we display them as '-'
    const date = (eta <= today) ? '-' : eta
    const time = (hours === '' || hours === 0) ? '-' : hours

    const data = {
      workplan,
      hours: time,
      eta: date,
      ack1,
      ack2,
      user: githubCurrentUser,
      applicationDate: today.toISOString(),
    }
    const hash = await ipfsAdd(data)
    api.requestAssignment(toHex(issue.repoId), issue.number, hash).toPromise()
  }

  const canSubmit = () => !(ack1 && ack2 && workplan)

  return (
    <div css={`margin: ${2 * GU}px 0`}>
      <Form
        onSubmit={onRequestAssignment}
        submitText="Submit application"
        noSeparator
        submitDisabled={canSubmit()}
      >
        <IssueTitle issue={issue} />

        <FormField
          label="Work Plan"
          required
          input={
            <TextInput.Multiline
              value={workplan}
              name="workplan"
              rows="3"
              onChange={updateWorkplan}
              placeholder="Describe how you plan to accomplish the task and any questions you may have."
              wide
            />
          }
        />

        <Estimations>
          <FormField
            label="Estimated Hours"
            input={
              <HoursInput
                name="hours"
                value={hours}
                onChange={updateHours}
                wide
              />
            }
          />
          <FormField
            label="Estimated Completion"
            input={
              <DateInput
                name="eta"
                value={eta}
                onChange={updateEta}
                width="100%"
              />
            }
          />
        </Estimations>

        <AckRow>
          <div css="width: 23px">
            <Checkbox checked={ack1} onChange={toggleAck1} />
          </div>
          <AckText color={`${theme.surfaceContentSecondary}`}>
            I understand that this is an application and I should wait for
            approval before starting work.
          </AckText>
        </AckRow>

        <AckRow>
          <div css="width: 23px">
            <Checkbox checked={ack2} onChange={toggleAck2} />
          </div>
          <AckText color={`${theme.surfaceContentSecondary}`}>
              I agree to keep the organization informed of my progress every few days.
          </AckText>
        </AckRow>
      </Form>
    </div>
  )
}

RequestAssignment.propTypes = issueShape

const HoursInput = styled(TextInput.Number).attrs({
  step: '0.25',
  min: '0',
})`
  width: 100%;
  display: inline-block;
  padding-top: 3px;
`

const Estimations = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto;
  grid-gap: 12px;
`
const AckText = styled(Text)`
  margin-left: ${GU}px;
`
const AckRow = styled.div`
  display: flex;
  margin: ${2 * GU}px 0;
`
export default RequestAssignment
