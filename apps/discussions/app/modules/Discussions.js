import React, { useState, useEffect, createContext } from 'react'
import PropTypes from 'prop-types'
import DiscussionsApi from './DiscussionsApi'
import useHandshake from './useHandshake'

export const DiscussionsContext = createContext({})

const Discussions = ({ children, app }) => {
  const [hasInit, setHasInit] = useState(false)
  const [discussions, setDiscussions] = useState({})
  const [discussionApi, setDiscussionApi] = useState({})
  const { handshakeOccured } = useHandshake()

  useEffect(() => {
    const initDiscussions = async () => {
      const api = new DiscussionsApi(app)
      await api.init()
      const discussionData = await api.collect()
      setDiscussions(discussionData)
      setDiscussionApi(api)
      setHasInit(true)

      api.listenForUpdates(setDiscussions)
    }

    if (!hasInit && handshakeOccured) {
      initDiscussions()
    }
  }, [handshakeOccured])
  return (
    <DiscussionsContext.Provider value={{ discussions, discussionApi }}>
      {children}
    </DiscussionsContext.Provider>
  )
}

Discussions.propTypes = {
  children: PropTypes.node.isRequired,
  app: PropTypes.object,
}

export default Discussions
