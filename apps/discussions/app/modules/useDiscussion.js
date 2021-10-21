import { useContext } from 'react'
import { getDiscussion, DiscussionsContext } from './'

const useDiscussion = id => {
  const { discussions, discussionApi } = useContext(DiscussionsContext)
  const discussionObj = getDiscussion(id, discussions)
  const discussionArr = Object.keys(discussionObj)
    .sort((a, b) => discussionObj[a].createdAt - discussionObj[b].createdAt)
    .map(postId => ({ ...discussionObj[postId], id: postId }))
  return { discussion: discussionArr, discussionApi }
}

export default useDiscussion
