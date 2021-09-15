import React from 'react'
import styled from 'styled-components'

function Title({ text, after }) {
  return (
    <Wrapper>
      <Label>{text}</Label>
      {after}
    </Wrapper>
  )
}

const Wrapper = styled.h1`
  display: flex;
  flex: 1 1 auto;
  width: 0;
  align-items: center;
  height: 100%;
`

const Label = styled.span`
  flex: 0 1 auto;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 10px;
  font-size: 26px;
`
// TODO: (fabri) replace font-size with ${font({ size: 'xxlarge' })}; when new client released

export default Title
