import React from 'react'
import { ButtonIcon } from '@aragon/ui'
import IconDownload from './IconDownload'

const Download = ({ url, filename, ...props }) => (
  <ButtonIcon
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

export default Download
