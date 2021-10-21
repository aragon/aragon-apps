import React from 'react'
import { Button, useViewport } from '@aragon/ui'

function MainButton({ label, icon, onClick }) {
  const { below } = useViewport()
  return (
    <Button
      mode="strong"
      onClick={onClick}
      label={label}
      icon={icon}
      display={below('medium') ? 'icon' : 'label'}
    />
  )
}

export default MainButton
