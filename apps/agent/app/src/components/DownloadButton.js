import React from 'react'
import { ButtonIcon } from '@aragon/ui'
import IconDownload from './IconDownload'

function Download({ url, filename, ...props }) {
  return (
    <ButtonIcon
      as="a"
      href={url}
      download={filename}
      rel="noopener noreferrer"
      label="Download"
      css={`
        height: 40px;
        padding-top: 4px;
      `}
      {...props}
    >
      <IconDownload />
    </ButtonIcon>
  )
}

export default Download
