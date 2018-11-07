import styled from 'styled-components'

const TwoColumn = styled.div`
  display: grid;
  grid-template-columns: 2fr auto;
  grid-gap: 30px;
`

TwoColumn.Left = styled.article`
  display: flex;
  flex-direction: column;
`

TwoColumn.Right = styled.aside`
  display: flex;
  flex-direction: column;
  min-width: 310px; 
`

export default TwoColumn
