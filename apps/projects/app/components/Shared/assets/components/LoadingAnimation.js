import React from 'react'
import styled from 'styled-components'

const StyledSvg = styled.svg`
  @keyframes eefEiCil_fade{
    0%,83.33333333333334%{stroke-opacity:1}
  }
  @keyframes eefEiCil_draw_0{
    0%{stroke-dashoffset:29}
    5.633255633255633%{stroke-dashoffset:0}
  }
  @keyframes eefEiCil_draw_1{5.633255633255633%{stroke-dashoffset:55}
    16.317016317016318%{stroke-dashoffset:0}
  }
  @keyframes eefEiCil_draw_2{
    16.317016317016318%{stroke-dashoffset:48}
    25.641025641025646%{stroke-dashoffset:0}
  }
  @keyframes eefEiCil_draw_3{
    25.641025641025646%{stroke-dashoffset:29}
    31.27428127428128%{stroke-dashoffset:0}
  }
  @keyframes eefEiCil_draw_4{
    31.274281274281275%{stroke-dashoffset:48}
    40.598290598290596%{stroke-dashoffset:0}
  }
  @keyframes eefEiCil_draw_5{
    40.598290598290596%{stroke-dashoffset:27}
    45.84304584304584%{stroke-dashoffset:0}
  }
  @keyframes eefEiCil_draw_6{
    45.84304584304584%{stroke-dashoffset:27}
    51.08780108780109%{stroke-dashoffset:0}
  }
  @keyframes eefEiCil_draw_7{
    51.08780108780109%{stroke-dashoffset:22}
    55.361305361305355%{stroke-dashoffset:0}
  }
  @keyframes eefEiCil_draw_8{
    55.36130536130537%{stroke-dashoffset:43}
    63.71406371406372%{stroke-dashoffset:0}
  }
  @keyframes eefEiCil_draw_9{
    63.71406371406372%{stroke-dashoffset:43}
    72.06682206682207%{stroke-dashoffset:0}
  }
  @keyframes eefEiCil_draw_10{
    72.06682206682207%{stroke-dashoffset:29}
    77.7000777000777%{stroke-dashoffset:0}
  }
  @keyframes eefEiCil_draw_11{
    77.7000777000777%{stroke-dashoffset:29}
    83.33333333333333%{stroke-dashoffset:0}
  }
`

const LoadingAnimation = () => (
  <StyledSvg xmlns="http://www.w3.org/2000/svg" width="51" height="83">
    <g id="Page-1" fill="none" fillRule="evenodd" strokeLinecap="round">
      <g id="Group" stroke="#00CBE6" strokeWidth="2" transform="translate(1 1)">
        <path id="Line-3" strokeDasharray="28 30" strokeDashoffset="29" d="M48 40L24 54" style={{ animation: 'eefEiCil_draw_0 4800ms ease-in-out 0ms infinite,eefEiCil_fade 4800ms linear 0ms infinite' }}/>
        <path id="Line" strokeDasharray="54 56" strokeDashoffset="55" d="M24 0v54" style={{ animation: 'eefEiCil_draw_1 4800ms ease-in-out 0ms infinite,eefEiCil_fade 4800ms linear 0ms infinite' }}/>
        <path id="Line-Copy-2" strokeDasharray="47 49" strokeDashoffset="48" d="M24 0L0 40" style={{ animation: 'eefEiCil_draw_2 4800ms ease-in-out 0ms infinite,eefEiCil_fade 4800ms linear 0ms infinite' }}/>
        <path id="Line-2" strokeDasharray="28 30" strokeDashoffset="29" d="M0 40l24.063 14.039" style={{ animation: 'eefEiCil_draw_3 4800ms ease-in-out 0ms infinite,eefEiCil_fade 4800ms linear 0ms infinite' }}/>
        <path id="Line-Copy" strokeDasharray="47 49" strokeDashoffset="48" d="M24 0l24 40" style={{ animation: 'eefEiCil_draw_4 4800ms ease-in-out 0ms infinite,eefEiCil_fade 4800ms linear 0ms infinite' }}/>
        <path id="Line-4" strokeDasharray="26 28" strokeDashoffset="27" d="M.5 39.5L24 29" style={{ animation: 'eefEiCil_draw_5 4800ms ease-in-out 0ms infinite,eefEiCil_fade 4800ms linear 0ms infinite' }}/>
        <path id="Line-5" strokeDasharray="26 28" strokeDashoffset="27" d="M24 28.5l22.807 10.24" style={{ animation: 'eefEiCil_draw_6 4800ms ease-in-out 0ms infinite,eefEiCil_fade 4800ms linear 0ms infinite' }}/>
        <path id="Line-6" strokeDasharray="21 23" strokeDashoffset="22" d="M24.5 60.5v20.025" style={{ animation: 'eefEiCil_draw_7 4800ms ease-in-out 0ms infinite,eefEiCil_fade 4800ms linear 0ms infinite' }}/>
        <path id="Line-7" strokeDasharray="42 44" strokeDashoffset="43" d="M.405 46.463L24.5 80.5" style={{ animation: 'eefEiCil_draw_8 4800ms ease-in-out 0ms infinite,eefEiCil_fade 4800ms linear 0ms infinite' }}/>
        <path id="Line-8" strokeDasharray="42 44" strokeDashoffset="43" d="M24.5 80.5l24-34" style={{ animation: 'eefEiCil_draw_9 4800ms ease-in-out 0ms infinite,eefEiCil_fade 4800ms linear 0ms infinite' }}/>
        <path id="Line-9" strokeDasharray="28 30" strokeDashoffset="29" d="M24.5 60.5l-24-14" style={{ animation: 'eefEiCil_draw_10 4800ms ease-in-out 0ms infinite,eefEiCil_fade 4800ms linear 0ms infinite' }}/>
        <path id="Line-10" strokeDasharray="28 30" strokeDashoffset="29" d="M24.5 60.5l24-14" style={{ animation: 'eefEiCil_draw_11 4800ms ease-in-out 0ms infinite,eefEiCil_fade 4800ms linear 0ms infinite' }}/>
      </g>
    </g>
  </StyledSvg>
)
export default LoadingAnimation
