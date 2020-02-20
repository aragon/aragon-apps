import React, { useEffect, useState } from 'react'
import { ButtonBase, GU, Info, useTheme } from '@aragon/ui'
import FrameSvg from './FrameSvg'
import FrameModal from './FrameModal'

// const FRAME_SERVER = 'http://localhost:1248'

function InstallFrame() {
  const [frameInstalled, setFrameInstalled] = useState(false)
  const [opened, setOpened] = useState(false)
  const handleInstallFrameClick = () => setOpened(true)
  const handleClose = () => setOpened(false)
  const theme = useTheme()

  useEffect(() => {
    const isFrameInstalled = async () => {
      try {
        setFrameInstalled(false)
      } catch (err) {
        // not running
      }
    }
    isFrameInstalled()
  }, [])

  if (frameInstalled) {
    return null
  }

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
              <ButtonBase
                onClick={handleInstallFrameClick}
                css={`
                  font-weight: 600;
                  color: ${theme.link};
                `}
              >
                Install Frame
              </ButtonBase>
            </div>
          </div>
        </div>
      </Info>
    </React.Fragment>
  )
}

export default InstallFrame
