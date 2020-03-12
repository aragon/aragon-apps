import React, { useState } from 'react'
import { GU, Info, Link } from '@aragon/ui'
import FrameSvg from './FrameSvg'
import FrameModal from './FrameModal'

function InstallFrame() {
  const [opened, setOpened] = useState(false)
  const handleInstallFrameClick = () => setOpened(true)
  const handleClose = () => setOpened(false)

  return (
    <React.Fragment>
      <FrameModal visible={opened} onClose={handleClose} />
      <Info
        css={`
          margin-bottom: ${2 * GU}px;
        `}
      >
        <div
          css={`
            display: grid;
            grid-template-rows: auto auto;
            grid-template-columns: auto 1fr;
            grid-column-gap: ${2 * GU}px;
            align-items: center;
          `}
        >
          <div>
            <FrameSvg />
          </div>
          <div>
            <div
              css={`
                margin-bottom: ${0.5 * GU}px;
              `}
            >
              To interact with the Agent app you must install Frame.
            </div>
            <div>
              <Link onClick={handleInstallFrameClick}>Install Frame</Link>
            </div>
          </div>
        </div>
      </Info>
    </React.Fragment>
  )
}

export default InstallFrame
