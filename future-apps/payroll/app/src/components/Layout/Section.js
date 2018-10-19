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

export default Section
