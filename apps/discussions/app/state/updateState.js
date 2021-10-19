import cloneDeep from 'lodash.clonedeep'
import { ipfs } from '../ipfs'

/*
{
  discussions: {
    discussionId: {
      postId: {
        author:
        createdAt:
        postId:
        postCid:
      }
    }
  }
}

*/

export const handleHide = async (
  state,
  { returnValues: { discussionId, postId } }
) => {
  const newState = cloneDeep(state)
  delete newState.discussions[discussionId][postId]
  return newState
}

export const handleRevise = async (
  state,
  { returnValues: { author, revisedAt, discussionId, postId, revisedPostCid } }
) => {
  const newState = cloneDeep(state)
  try {
    const {
      value: { text, revisions },
    } = await ipfs.dag.get(revisedPostCid)

    newState.discussions[discussionId][postId] = {
      ...newState.discussions[discussionId][postId],
      author,
      text,
      postCid: revisedPostCid,
      revisedAt,
      revisions,
    }
    return newState
  } catch (error) {
    console.error(error)
  }
}

export const handlePost = async (
  state,
  { returnValues: { author, createdAt, discussionId, postId, postCid } }
) => {
  const newState = cloneDeep(state)
  try {
    const {
      value: { text },
    } = await ipfs.dag.get(postCid)

    if (!newState.discussions[discussionId]) {
      newState.discussions[discussionId] = {}
    }

    newState.discussions[discussionId][postId] = {
      author,
      createdAt,
      text,
      postCid,
      revisions: [],
    }
    return newState
  } catch (error) {
    console.error(error)
  }
}
