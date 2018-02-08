import React from 'react'
import { Table, TableHeader, TableRow } from '@aragon/ui'
import VoteRow from './VoteRow'

const VotesTable = ({
  votes,
  voteTime,
  opened,
  tokenSupply,
  support,
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
    {votes.map(
      ({
        id,
        vote,
        voteTime,
        endDate,
        metas,
      }) => (
        <VoteRow
          key={id}
          id={id}
          vote={vote}
          endDate={endDate}
          question={metas.question}
          tokenSupply={tokenSupply}
          voteTime={voteTime}
          support={support}
          onSelectVote={onSelectVote}
        />
      )
    )}
  </Table>
)

export default VotesTable
