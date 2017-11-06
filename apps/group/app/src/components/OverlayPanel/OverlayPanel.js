import React from 'react'
import styled from 'styled-components'
import { Motion, spring } from 'react-motion'
import { lerp } from '../../math-utils'

const PANEL_SPRING = { stiffness: 150, damping: 18, precision: 0.001 }

const PANEL_WIDTH = 400
const PANEL_OVERFLOW = PANEL_WIDTH * 0.2
const PANEL_HIDE_RIGHT = -PANEL_WIDTH * 1.6

const StyledOverlayPanel = styled.div`
  position: fixed;
  z-index: 3;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(68, 81, 89, 0.65);
`

const Panel = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${PANEL_WIDTH + PANEL_OVERFLOW}px;
  padding-right: ${PANEL_OVERFLOW}px;
  height: 100%;
  background: white;
  position: absolute;
  top: 0;
  right: 0;
  box-shadow: -2px 0 36px rgba(0, 0, 0, 0.2);
`

const motionStyles = progress => ({
  overlay: { opacity: progress },
  panel: { right: `${lerp(progress, PANEL_HIDE_RIGHT, -PANEL_OVERFLOW)}px` },
})

const OverlayPanel = ({ opened, onClose }) => {
  return (
    <Motion style={{ progress: spring(Number(opened), PANEL_SPRING) }}>
      {({ progress }) => {
        const styles = motionStyles(progress)
        return (
          <StyledOverlayPanel hidden={progress === 0} onClick={onClose}>
            <Overlay style={styles.overlay} />
            <Panel style={styles.panel}>Panel</Panel>
          </StyledOverlayPanel>
        )
      }}
    </Motion>
  )
}

export default OverlayPanel
