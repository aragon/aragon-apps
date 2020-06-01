import React, { useMemo } from 'react'
import styled from 'styled-components'
import { GU, useTheme } from '@aragon/ui'
import LocalIdentityBadge from './components/LocalIdentityBadge/LocalIdentityBadge'
import LocalLabelAppBadge from './components/LocalIdentityBadge/LocalLabelAppBadge'

export function renderDescription(path) {
  const theme = useTheme()
  const description = useMemo(() => {
    return path
      ? path.map((step, index) =>
          renderForwardingStep(step, [index + 1], theme)
        )
      : ''
  }, [path])
  return <React.Fragment>{description}</React.Fragment>
}

function renderForwardingStep(step, depth, theme) {
  const app =
    step.name || step.identifier ? (
      <React.Fragment key={0}>
        {step.name && step.name}
        {step.identifier ? ` (${step.identifier})` : ''}
        <span
          css={`
            padding-right: ${1 * GU}px;
          `}
        >
          :
        </span>
      </React.Fragment>
    ) : (
      <React.Fragment key={0}>
        <LocalIdentityBadge
          compact
          entity={step.to}
          css={`
            padding-right: 0;
          `}
        />
        <span
          css={`
            padding-right: ${1 * GU}px;
          `}
        >
          :
        </span>
      </React.Fragment>
    )

  let description = ''
  if (step.annotatedDescription) {
    description = step.annotatedDescription.map((descriptionLine, index) => {
      if (descriptionLine.type == 'address') {
        return (
          <LocalIdentityBadge
            key={index + 1}
            compact
            entity={descriptionLine.value}
          />
        )
      }
      return (
        <span key={index + 1}>
          {descriptionLine.value.description || descriptionLine.value}
        </span>
      )
    })

    description.unshift(app)
  } else {
    description = step.description ? (
      <React.Fragment>
        {app}
        {step.description}
      </React.Fragment>
    ) : (
      <span>No description</span>
    )
  }

  let childrenDescriptions = ''
  if (step.children) {
    childrenDescriptions = step.children.map((child, index) =>
      renderForwardingStep(child, depth.concat(index + 1), theme)
    )
  }

  const IndentedDescription = styled.div`
    padding-left: ${2 * GU}px;
    &:before {
      content: '';
      width: 6px;
      height: 6px;
      margin-right: 10px;
      background: #08bee5;
      border-radius: 6px;
      display: inline-block;
    }
    span {
      display: inline;
      color: ${theme.surfaceContentSecondary};
    }
  `

  return (
    <React.Fragment key={depth}>
      <span>{description}</span>
      {childrenDescriptions && (
        <IndentedDescription>{childrenDescriptions}</IndentedDescription>
      )}
    </React.Fragment>
  )
}
