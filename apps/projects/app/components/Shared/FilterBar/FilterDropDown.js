import React, { useState } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Spring, animated } from 'react-spring'
import ClickOutHandler from 'react-onclickout'
import { springs, GU, theme } from '@aragon/ui'
import FilterButton from './FilterButton'
import { IconMore, IconDropArrow } from '../../../assets'

const SpringWrap = ({ handleClickOut, opened, children }) => (
  <ClickOutHandler onClickOut={handleClickOut}>
    <Spring
      config={springs.smooth}
      to={{ openProgress: Number(opened) }}
      native
    >
      {({ openProgress }) => children(openProgress)}
    </Spring>
  </ClickOutHandler>
)
SpringWrap.propTypes = {
  children: PropTypes.func.isRequired,
  opened: PropTypes.bool.isRequired,
  handleClickOut: PropTypes.func.isRequired,
}

export const OverflowDropDown = ({ children, enabled }) => {
  const [ opened, setOpened ] = useState(false)
  const handleClickOut = () => setOpened(false)
  const handleBaseButtonClick = () => {
    if (enabled) setOpened(!opened)
  }

  return (
    <SpringWrap handleClickOut={handleClickOut} opened={opened}>
      {(openProgress) => (
        <Main>
          <FilterButton
            onClick={handleBaseButtonClick}
            disabled={!enabled}
            width="40px"
          >
            <IconMore />
          </FilterButton>
          {opened &&
            <PopupOverflow style={{ opacity: openProgress }}>
              {children}
            </PopupOverflow>
          }
        </Main>
      )}
    </SpringWrap>
  )
}
OverflowDropDown.propTypes = {
  children: PropTypes.node.isRequired,
  enabled: PropTypes.bool.isRequired,
}
OverflowDropDown.defaultProps = {
  enabled: true,
}

export const FilterDropDown = ({ caption, children, enabled }) => {
  const [ opened, setOpened ] = useState(false)
  const handleClickOut = () => setOpened(false)
  const handleBaseButtonClick = () => {
    if (enabled) setOpened(!opened)
  }

  return (
    <SpringWrap handleClickOut={handleClickOut} opened={opened}>
      {(openProgress) => (
        <Main>
          <FilterButton
            onClick={handleBaseButtonClick}
            disabled={!enabled}
            width="128px"
          >
            <div css={`display: flex; width: 100%; justify-content: space-between; padding: 0 ${2 * GU}px`}>
              {caption}
              <animated.div
                style={{
                  height: '16px',
                  transformOrigin: '50% 70%',
                  transform: openProgress.interpolate(
                    t => `rotate(${t * 180}deg)`
                  ),
                }}
              >
                <IconDropArrow color={`${theme.surfaceContentSecondary}`} />
              </animated.div>
            </div>
          </FilterButton>

          {opened &&
            <Popup style={{ opacity: openProgress }}>
              {children}
            </Popup>
          }
        </Main>
      )}
    </SpringWrap>
  )
}
FilterDropDown.propTypes = {
  caption: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  enabled: PropTypes.bool.isRequired,
}
FilterDropDown.defaultProps = {
  enabled: true,
}

const Main = styled(animated.div)`
  background: ${theme.contentBackground};
  height: 100%;
  position: relative;
  box-shadow: 0 4px 4px rgba(0, 0, 0, 0);
`
const Popup = styled(animated.div)`
  background: ${theme.contentBackground};
  border: 1px solid ${theme.contentBorder};
  border-radius: 3px;
  box-shadow: 0 4px 4px rgba(0, 0, 0, 0.3);
  padding: ${GU}px;
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1;
`
const PopupOverflow = styled(animated.div)`
  border: 0;
  border-radius: 3px;
  padding: 0;
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1;
`
