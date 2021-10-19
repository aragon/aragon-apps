/*
  There is some implied ordering going on
  relativeDiscussionId represents which conversation we're talking about (is this the first ocnversation? second conversation?)
  absoluteDiscussionid is the actual ID that represents the relativeDiscussionId
*/
const getDiscussion = (relativeDiscussionId, discussions) => {
  const absoluteDiscussionId = Object.keys(discussions)
    .map(discussionId => Number(discussionId))
    .sort()[relativeDiscussionId]

  return discussions[absoluteDiscussionId] || {}
}

export default getDiscussion
