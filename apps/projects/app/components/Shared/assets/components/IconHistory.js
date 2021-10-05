import React from 'react'
import styled from 'styled-components'

const StyledIcon = styled.div`
  display: inline-flex;
  align-self: baseline;
  margin-right: 2px;
  svg {
    transform: scale(0.9);
    bottom: -1.6px;
    position: relative;
  }
`

const IconHistory = props => (
  <StyledIcon>
    <svg
      aria-hidden="true"
      viewBox="0 0 16 14"
      width="1em"
      height="1.1em"
      fill="#666"
      {...props}
    >
      <path d="M8 13H6V6h5v2H8v5zM7 1C4.81 1 2.87 2.02 1.59 3.59L0 2v4h4L2.5 4.5C3.55 3.17 5.17 2.3 7 2.3c3.14 0 5.7 2.56 5.7 5.7s-2.56 5.7-5.7 5.7A5.71 5.71 0 0 1 1.3 8c0-.34.03-.67.09-1H.08C.03 7.33 0 7.66 0 8c0 3.86 3.14 7 7 7s7-3.14 7-7-3.14-7-7-7z" />
    </svg>
  </StyledIcon>
)

export default IconHistory
