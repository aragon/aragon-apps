import React, { useState } from 'react'
import { ButtonBase, GU, IconUp, RADIUS, springs, useTheme } from '@aragon/ui'
import { Transition, animated } from 'react-spring'

const AnimatedDiv = animated.div

function ToggleContent({ label, children }) {
  const theme = useTheme()
  const [opened, setOpened] = useState()
  return (
    <React.Fragment>
      <ButtonBase
        onClick={() => setOpened(opened => !opened)}
        focusRingRadius={RADIUS}
        focusRingSpacing={0.5 * GU}
        css={`
          display: flex;
          align-items: center;
          width: calc(100%);
          &:active {
            color: ${theme.surfaceContentSecondary};
          }
        `}
      >
        {label}{' '}
        <IconUp
          size="small"
          css={`
            position: relative;
            top: -1px;
            margin-left: ${1 * GU}px;
            transform-origin: 50% 50%;
            transform: rotate(${opened ? 180 : 0}deg);
            transition: transform 200ms ease-in-out;
          `}
        />
      </ButtonBase>

      <Transition
        items={opened}
        config={springs.swift}
        from={{ height: 0, opacity: 0 }}
        enter={{ height: 'auto', opacity: 1 }}
        leave={{ height: 0, opacity: 0 }}
        native
      >
        {show =>
          show &&
          (props => (
            <AnimatedDiv style={props} css="overflow: hidden">
              {children}
            </AnimatedDiv>
          ))
        }
      </Transition>
    </React.Fragment>
  )
}

export default ToggleContent
