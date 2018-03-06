import React from 'react'
import { Table, TableHeader, TableRow } from '@aragon/ui'
import VoteRow from './VoteRow'

const VotesTable = ({ votes, opened, onSelectVote }) => (
  <Table
    header={
      <TableRow>
        <TableHeader title={opened ? 'Time Remaining' : 'Status'} />
        <TableHeader title="Question" />
        <TableHeader title="Total Votes" align="right" />
        <TableHeader title={opened ? '' : 'Result'} />
        <TableHeader title="Actions" />
      </TableRow>
    }
  >
    {votes.map(vote => (
      <VoteRow
        key={vote.voteId}
        vote={vote}
        onSelectVote={onSelectVote}
      />
    ))}
  </Table>
)

export default VotesTable
