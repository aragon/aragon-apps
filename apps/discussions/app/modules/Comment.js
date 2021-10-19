import React, { useState } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { format, formatDistance } from 'date-fns'
import { Card, IdentityBadge, theme } from '@aragon/ui'
import { IconEdit, IconDelete, Markdown } from '../../../../shared/ui'
import CommentForm from './CommentForm'

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
`

const TimeAgo = styled.time.attrs(props => ({
  dateTime: format(props.date, "y-MM-dd'T'hh:mm:ss"),
  children: formatDistance(props.date, new Date(), { addSuffix: true }),
}))`
  color: ${theme.textTertiary};
`

TimeAgo.propTypes = {
  date: PropTypes.instanceOf(Date).isRequired,
}

const Top = ({ author, createdAt }) => {
  const created = new Date(Number(createdAt) * 1000)
  return (
    <Header>
      <IdentityBadge entity={author} />
      <TimeAgo date={created} />
    </Header>
  )
}

const CommentCard = styled(Card).attrs({
  width: '100%',
  height: 'auto',
})`
  margin-top: 15px;
  margin-bottom: 15px;
  padding: 15px 20px 10px;
  position: relative;
`

const Footer = styled.footer`
  background: white;
  opacity: 0;
  position: absolute;
  right: 20px;
  bottom: 10px;
  :focus-within,
  ${CommentCard}:hover & {
    opacity: 1;
  }
`

const Button = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  line-height: 0;
  outline: none;
  padding: 0;
  vertical-align: middle;
`

const Edit = styled(Button)`
  :hover,
  :focus {
    color: ${theme.accent};
    path {
      fill: ${theme.accent};
    }
  }
`

const Delete = styled(Button)`
  :active,
  :hover,
  :focus {
    color: ${theme.negative};
    path {
      fill: ${theme.negative};
    }
  }
  // hack to make the svg flush with the right edge of CommentCard
  ${Edit} + & {
    margin-right: -5px;
  }
`

const Bottom = ({ onDelete, onEdit }) => {
  const [deleting, setDeleting] = useState(false)

  return (
    <Footer>
      {!deleting && (
        <Edit onClick={onEdit}>
          <IconEdit height={22} />
        </Edit>
      )}
      <Delete
        aria-live="polite"
        onBlur={() => setDeleting(false)}
        onClick={deleting ? onDelete : () => setDeleting(true)}
      >
        {deleting ? 'Confirm delete' : <IconDelete height={22} />}
      </Delete>
    </Footer>
  )
}

const Comment = ({
  currentUser,
  comment: { author, id, text, createdAt, revisions, postCid },
  onDelete,
  onSave,
}) => {
  const [editing, setEditing] = useState(false)

  const update = async updated => {
    await onSave({ id, text: updated.text, revisions, postCid })
    setEditing(false)
  }

  return (
    <CommentCard>
      {editing ? (
        <CommentForm
          defaultValue={text}
          onCancel={() => setEditing(false)}
          onSave={update}
        />
      ) : (
        <React.Fragment>
          <Top author={author} createdAt={createdAt} />
          <Markdown content={text} />
          {author === currentUser && (
            <Bottom onDelete={onDelete} onEdit={() => setEditing(true)} />
          )}
        </React.Fragment>
      )}
    </CommentCard>
  )
}

Comment.propTypes = {
  currentUser: PropTypes.string.isRequired,
  comment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    author: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
}

export default Comment
