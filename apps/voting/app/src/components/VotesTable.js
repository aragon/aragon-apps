import React from 'react'
import { Table, TableHeader, TableRow } from '@aragon/ui'
import VoteRow from './VoteRow'

const VotesTable = ({
  title,
  votes,
  voteTime,
  tokenSupply,
  opened,
  onSelectVote,
}) => (
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
    {votes.map(({ id, vote, endDate, metas }) => (
      <VoteRow
        key={id}
        id={id}
        endDate={endDate}
        question={metas.question}
        votesYea={vote.yea}
        votesNay={vote.nay}
        tokenSupply={tokenSupply}
        opened={opened}
        onSelectVote={onSelectVote}
      />
    ))}
  </Table>
)

export default VotesTable
