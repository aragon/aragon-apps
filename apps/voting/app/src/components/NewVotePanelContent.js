import React from 'react'
import styled from 'styled-components'
import { Button, Info, Text, TextInput, Field, theme } from '@aragon/ui'

const NewVotePanelContent = ({}) => {
  return (
    <div>
      <Field>
        <Info
          title={
            <Text weight="bold" color={theme.textSecondary}>
              Votes are informative
            </Text>
          }
        >
          <p style={{ marginTop: '10px' }}>
            Votes don’t have any direct repercussion on the organization
          </p>
        </Info>
      </Field>

      <Field label="Question">
        <TextInput wide required />
      </Field>

      <Field label="Description">
        <TextInput wide required />
      </Field>

      <Button mode="strong" wide>
        Begin Voting
      </Button>
    </div>
  )
}

NewVotePanelContent.defaultProps = {}

const Label = styled(Text).attrs({
  smallcaps: true,
  color: theme.textSecondary,
})`
  display: block;
  margin-bottom: 10px;
`

const Part = styled.div`
  padding: 20px 0;
  h2 {
    margin-top: 20px;
    &:first-child {
      margin-top: 0;
    }
  }
`

export default NewVotePanelContent
