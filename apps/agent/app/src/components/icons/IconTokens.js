import React from 'react'

const IconTokens = props => (
  <svg width={22} height={22} viewBox="0 0 22 22" {...props}>
    <g fill="none" fillRule="evenodd">
      <path d="M0 0h22v22H0z" />
      <g transform="translate(2 3)" stroke="currentColor">
        <circle cx={9} cy={13} r={3} />
        <circle cx={9} cy={2} r={2} />
        <circle cx={2} cy={5} r={2} />
        <circle cx={16} cy={5} r={2} />
        <path d="M3.275 6.48l3.715 4.164m1.994-6.645v5.99m5.844-3.393l-4.019 4.018" />
      </g>
    </g>
  </svg>
)

export default IconTokens
