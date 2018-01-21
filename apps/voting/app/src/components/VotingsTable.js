import React from 'react'
import { Table, TableHeader, TableRow } from '@aragon/ui'
import VotingRow from './VotingRow'

const VotingsTable = ({ title, votes, opened, onSelectVote }) => (
  <Table
    header={
      <TableRow>
        <TableHeader title={opened ? 'Time remaining' : 'Status'} />
        <TableHeader title="Question" />
        <TableHeader title={opened ? 'Votes' : 'Total votes'} align="right" />
        {opened && <TableHeader title="Pending" align="right" />}
        <TableHeader title={opened ? '' : 'Result'} />
      </TableRow>
    }
  >
    {votes.map(vote => (
      <VotingRow
        key={vote.id}
        {...vote}
        opened={opened}
        onSelectVote={onSelectVote}
      />
    ))}
  </Table>
)

export default VotingsTable
