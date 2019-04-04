import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { AppBar, AppView, Button, ButtonIcon, Viewport, font } from '@aragon/ui'
import { useAragonApi } from '@aragon/api-react'
import MenuButton from './MenuButton/MenuButton'

const AppLayout = ({
  children,
  title,
  afterTitle,
  smallViewPadding,
  largeViewPadding,
  mainButton,
}) => {
  const { requestMenu, displayMenuButton } = useAragonApi()
  return (
    <Viewport>
      {({ below }) => (
        <AppView
          padding={below('medium') ? smallViewPadding : largeViewPadding}
          appBar={
            <AppBar>
              <AppBarContainer
                style={{ padding: below('medium') ? '0' : '0 30px 0 10px' }}
              >
                <Title>
                  {displayMenuButton && <MenuButton onClick={requestMenu} />}
                  <TitleLabel
                    css={`
                      margin-left: ${displayMenuButton ? '0' : '20px'};
                    `}
                  >
                    {title}
                  </TitleLabel>
                  {afterTitle}
                </Title>
                {mainButton &&
                  (below('medium') ? (
                    <ButtonIcon
                      onClick={mainButton.onClick}
                      label={mainButton.label}
                      css={`
                        width: auto;
                        height: 100%;
                        padding: 0 20px 0 10px;
                        margin-left: 8px;
                      `}
                    >
                      {mainButton.icon}
                    </ButtonIcon>
                  ) : (
                    <Button mode="strong" onClick={mainButton.onClick}>
                      {mainButton.label}
                    </Button>
                  ))}
              </AppBarContainer>
            </AppBar>
          }
        >
          {children}
        </AppView>
      )}
    </Viewport>
  )
}

AppLayout.defaultProps = {
  smallViewPadding: 20,
  largeViewPadding: 30,
}

AppLayout.propTypes = {
  children: PropTypes.node,
  title: PropTypes.node.isRequired,
  afterTitle: PropTypes.node,
  smallViewPadding: PropTypes.number,
  largeViewPadding: PropTypes.number,
  mainButton: PropTypes.shape({
    icon: PropTypes.node.isRequired,
    label: PropTypes.node.isRequired,
    onClick: PropTypes.func.isRequired,
  }),
}

const Title = styled.h1`
  display: flex;
  flex: 1 1 auto;
  width: 0;
  align-items: center;
  height: 100%;
`

const TitleLabel = styled.span`
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 10px;
  ${font({ size: 'xxlarge' })};
`

const AppBarContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: space-between;
  align-items: center;
  flex-wrap: nowrap;
`

export default AppLayout
