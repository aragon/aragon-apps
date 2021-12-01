import React from 'react'

const IconArrow = props => (
  <svg width="15px" height="12px" viewBox="0 0 15 12" {...props}>
    <defs>
      <filter x="-5.8%" y="-12.9%" width="111.7%" height="125.8%" filterUnits="objectBoundingBox" id="filter-1">
        <feOffset dx="0" dy="2" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
        <feGaussianBlur stdDeviation="2" in="shadowOffsetOuter1" result="shadowBlurOuter1"></feGaussianBlur>
        <feColorMatrix values="0 0 0 0 0.596078431   0 0 0 0 0.62745098   0 0 0 0 0.635294118  0 0 0 0.339334239 0" type="matrix" in="shadowBlurOuter1" result="shadowMatrixOuter1"></feColorMatrix>
        <feMerge>
          <feMergeNode in="shadowMatrixOuter1"></feMergeNode>
          <feMergeNode in="SourceGraphic"></feMergeNode>
        </feMerge>
      </filter>
    </defs>
    <g id="Planning-app---NEW" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
      <g id="Group-49" transform="translate(-178.000000, -60.332075)" fill="#B3B3B3">
        <g id="Overflow-menu-Copy" transform="translate(0.360000, 0.667925)">
          <g id="Group-15" filter="url(#filter-1)" transform="translate(0.000000, 41.000000)">
            <polygon id="Icon_arrow-down-dark-Copy-11" points="181 21 189.36 21 185.18 25.18"></polygon>
          </g>
        </g>
      </g>
    </g>
  </svg>
)

export default IconArrow

