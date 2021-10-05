import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  DropDownOptionsInput,
  Form,
  FormField,
} from '../../Form'
import { useAragonApi } from '../../../api-react'
import { GU, TextInput } from '@aragon/ui'
import { usePanelManagement } from '..'
import { issueShape } from '../../../utils/shapes.js'

const NewIssueCuration = ({ allIssues, selectedIssues }) => {
  const { api } = useAragonApi()
  const { closePanel } = usePanelManagement()
  const [ description, setDescription ] = useState('')
  const [ issues, setIssues ] = useState()

  // TODO: Work with only id fields when possible and read rest of data from cache with a context helper

  // TODO: improve field checking for input errors and sanitize
  const updateDescription = e => setDescription(e.target.value)
  const updateIssues = e => setIssues(e.target.value)

  const submitCuration = () => {
    closePanel()
    // TODO: maybe assign this to issueDescriptionIndices, not clear
    let issueDescriptionIndices = []
    selectedIssues.forEach((issue, i) => {
      if (i === 0) {
        issueDescriptionIndices.push(issue.title.length)
      } else {
        issueDescriptionIndices.push(issue.title.length)
      }
    })

    // TODO: splitting of descriptions needs to be fixed at smart contract level
    const issueDescriptions = selectedIssues.map(issue => issue.title).join('')
    /* TODO: The numbers below are supposedly coming from an eventual:
       issues.map(issue => web3.utils.hexToNum(toHex(issue.repoId))) */
    const issueNumbers = selectedIssues.map(issue => issue.number)
    const emptyIntArray = new Array(selectedIssues.length).fill(0)
    const emptyAddrArray = [
      '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
      '0xd00cc82a132f421bA6414D196BC830Db95e2e7Dd',
      '0x89c199302bd4ebAfAa0B5Ee1Ca7028C202766A7F',
      '0xd28c35a207c277029ade183b6e910e8d85206c07',
      '0xee6bd04c6164d7f0fa1cb03277c855639d99a7f6',
      '0xb1d048b756f7d432b42041715418b48e414c8f50',
      '0x6945b970fa107663378d242de245a48c079a8bf6',
      '0x83ac654be75487b9cfcc80117cdfb4a4c70b68a1',
      '0x690a63d7023780ccbdeed33ef1ee62c55c47460d',
      '0xb1afc07af31795d61471c169ecc64ad5776fa5a1',
      '0x4aafed050dc1cf7e349accb7c2d768fd029ece62',
      '0xd7a5846dea118aa76f0001011e9dc91a8952bf19',
    ]

    api.curateIssues(
      emptyAddrArray.slice(0, selectedIssues.length),
      emptyIntArray,
      issueDescriptionIndices,
      issueDescriptions,
      description,
      emptyIntArray,
      issueNumbers,
      1
    ).toPromise()
  }

  return (
    <div css={`margin: ${2 * GU}px 0`}>
      <Form onSubmit={submitCuration} submitText="Submit Curation">
        <FormField
          required
          label="Description"
          input={
            <TextInput.Multiline
              name="description"
              value={description}
              onChange={updateDescription}
              placeholder="Describe what this curation represents."
              wide
            />
          }
        />
        <FormField
          label="Issues"
          required
          input={
            <DropDownOptionsInput
              name="issues"
              placeholder="Select option..."
              onChange={updateIssues}
              values={selectedIssues}
              input={issues}
              allOptions={allIssues}
            />
          }
        />
      </Form>
    </div>
  )
}

NewIssueCuration.propTypes = {
  allIssues: PropTypes.arrayOf(issueShape),
  selectedIssues: PropTypes.arrayOf(issueShape),
}

export default NewIssueCuration
