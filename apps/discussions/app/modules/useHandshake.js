import { useEffect, useState } from 'react'

export default () => {
  const [handshakeOccured, setHandshakeOccured] = useState(false)
  const sendMessageToWrapper = (name, value) => {
    window.parent.postMessage({ from: 'app', name, value }, '*')
  }
  const handleWrapperMessage = ({ data }) => {
    if (data.from !== 'wrapper') {
      return
    }
    if (data.name === 'ready') {
      sendMessageToWrapper('ready', true)
      setHandshakeOccured(true)
    }
  }
  useEffect(() => {
    return window.addEventListener('message', handleWrapperMessage)
  }, [])
  return { handshakeOccured }
}
