import React, { useMemo } from 'react'
import { GU, useTheme } from '@aragon/ui'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'

function DetailedDescription({ path }) {
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
      {path
        ? path.map((step, index) => <DescriptionStep key={index} step={step} />)
        : ''}
    </div>
  )
}

function DescriptionStep({ step }) {
  const theme = useTheme()

  const description = []

  const appName =
    step.name && step.identifier
      ? `${step.name} (${step.identifier})`
      : step.name || step.identifier

  // Add app
  description.push(
    <React.Fragment key={0}>
      {appName || (
        <LocalIdentityBadge
          compact
          entity={step.to}
          css={`
            padding-right: 0;
          `}
        />
      )}
      <span>:</span>
    </React.Fragment>
  )

  if (step.annotatedDescription) {
    description.push(
      step.annotatedDescription.map(({ type, value }, index) => {
        // The app has already been pushed as the first element, so we increment the index by 1 for
        // these keys
        const key = index + 1

        if (type === 'address' || type === 'any-account') {
          return (
            <span key={key}>
              {' '}
              <LocalIdentityBadge
                compact
                entity={type === 'any-account' ? 'Any account' : value}
              />
            </span>
          )
        }

        if (type === 'role' || type === 'kernelNamespace' || type === 'app') {
          return <span key={key}> “{value.name}”</span>
        }

        if (type === 'apmPackage') {
          return <span key={key}> “{value.appName}”</span>
        }

        return <span key={key}> {value.description || value}</span>
      })
    )
  } else {
    description.push(
      <span key={description.length + 1}>
        {step.description || 'No description'}
      </span>
    )
  }
  description.push(<br key={description.lenth + 1} />)

  const childrenDescriptions = (step.children || []).map((child, index) => {
    return <DescriptionStep step={child} key={index} />
  })

  return (
    <React.Fragment>
      <span>{description}</span>
      {childrenDescriptions.length > 0 && (
        <ul
          css={`
            list-style-type: none;
            margin-left: 0;
            padding-left: ${0.5 * GU}px;
            text-indent: -${0.5 * GU}px;
          `}
        >
          <li
            css={`
              padding-left: ${2 * GU}px;
              &:before {
                content: '';
                width: ${0.5 * GU}px;
                height: ${0.5 * GU}px;
                background: ${theme.accent};
                border-radius: 50%;
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
