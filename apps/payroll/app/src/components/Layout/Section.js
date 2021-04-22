import { theme, unselectable } from '@aragon/ui'
import styled from 'styled-components'

const Section = styled.section`
  display: grid;
  grid-template-columns: 2fr auto;
  grid-gap: 30px;
`

Section.Left = styled.article`
  display: flex;
  flex-direction: column;
`

Section.Right = styled.aside`
  display: flex;
  flex-direction: column;
  min-width: 310px;
`

Section.Title = styled.h1`
  margin-top: 10px;
  margin-bottom: 20px;
  font-size: 16px;
  font-weight: 600;
`
Section.SideBarTitle = styled.div`
  margin-bottom: 15px;
  color: ${theme.textSecondary};
  text-transform: lowercase;
  line-height: 30px;
  font-variant: small-caps;
  font-weight: 600;
  font-size: 16px;
  border-bottom: 1px solid ${theme.contentBorder};
  ${unselectable};
`

export default Section
