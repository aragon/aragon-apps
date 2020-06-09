import React, { useMemo } from 'react'
import styled from 'styled-components'
import { GU, Link, useTheme } from '@aragon/ui'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'

function DetailedDescription({ path }) {
  const theme = useTheme()
  const description = useMemo(() => {
    return path
      ? path.map((step, index) => (
          <DescriptionStep step={step} depth={index + 1} />
        ))
      : ''
  }, [path, theme])
  return (
    <div
      css={`
        // overflow-wrap:anywhere and hyphens:auto are not supported yet by
        // the latest versions of Safari (as of June 2020), which
        // is why word-break:break-word has been added here.
        hyphens: auto;
        overflow-wrap: anywhere;
        word-break: break-word;
      `}
    >
      {description}
    </div>
  )
}

function DescriptionStep({ step, depth }) {
  const theme = useTheme()
  const app =
    step.name || step.identifier ? (
      <React.Fragment key={0}>
        {step.name && step.identifier
          ? `${step.name} (${step.identifier})`
          : step.name || step.identifier}
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
    description = step.annotatedDescription.map(({ type, value }, index) => {
      if (type === 'address' || type === 'any-account') {
        return (
          <span key={index + 1}>
            <LocalIdentityBadge
              compact
              entity={type === 'any-account' ? 'Any account' : value}
            />{' '}
          </span>
        )
      }

      if (type === 'role' || type === 'kernelNamespace' || type === 'app') {
        return <span key={index + 1}>'{value.name}' </span>
      }

      if (type === 'apmPackage') {
        return (
          <span key={index + 1}>
            <LocalIdentityBadge entity={value.name} />{' '}
          </span>
        )
      }

      return <span key={index + 1}>{value.description || value} </span>
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
    childrenDescriptions = step.children.map((child, index) => (
      <DescriptionStep step={child} depth={`${depth}${index + 1}`} />
    ))
  }

  return (
    <React.Fragment key={depth}>
      <span>{description}</span>
      {childrenDescriptions && (
        <ul
          css={`
            list-style-type: none;
            margin-left: 0;
            padding-left: 6px;
            text-indent: -6px;
          `}
        >
          <li
            css={`
              padding-left: ${2 * GU}px;
              &:before {
                content: '';
                width: 6px;
                height: 6px;
                background: ${theme.accent};
                border-radius: 6px;
                display: inline-block;
              }
              span {
                display: inline;
                color: ${theme.surfaceContentSecondary};
              }
            `}
          >
            {childrenDescriptions}
          </li>
        </ul>
      )}
    </React.Fragment>
  )
}

export default DetailedDescription
