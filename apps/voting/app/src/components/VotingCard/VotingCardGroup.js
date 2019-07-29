import React from 'react'
import styled from 'styled-components'
import {
  Badge,
  CardLayout,
  GU,
  Text,
  breakpoint,
  textStyle,
  unselectable,
  useLayout,
  useTheme,
} from '@aragon/ui'

const VotingCardGroup = ({ title, count, children }) => {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const rowHeight = layoutName === 'small' ? 256 : 294

  return (
    <Main>
      <Title>
        <div
          css={`
            ${textStyle('body3')};
            color: ${theme.content};
          `}
        >
          {title}
        </div>
        <TitleBadge>
          <Badge.Info>{count}</Badge.Info>
        </TitleBadge>
      </Title>
      <CardLayout columnWidthMin={30 * GU} rowHeight={rowHeight}>
        {children}
      </CardLayout>
    </Main>
  )
}

const Main = styled.section`
  & + & {
    padding-top: 35px;
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-auto-rows: 270px;
  grid-gap: 30px;

  ${breakpoint(
    'medium',
    `
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
     `
  )};
`

const Title = styled.h1`
  display: flex;
  align-items: center;
  margin-bottom: 25px;
  ${unselectable};
`

const TitleBadge = styled.span`
  margin-left: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
`

export default VotingCardGroup
