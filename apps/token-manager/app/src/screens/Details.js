import React from 'react'
import { Bar, Box, Split, GU, useTheme } from '@aragon/ui'

function Details() {
  const theme = useTheme()
  return (
    <React.Fragment>
      <Bar></Bar>
      <Split
        primary={<Box> </Box>}
        secondary={
          <React.Fragment>
            <Box heading="Vestings Info">
              <ul>
                {[
                  ['Total supply', <strong>0</strong>],
                  ['Vested', <strong>0</strong>],
                  ['Locked', <strong>0</strong>],
                  ['Unlocked', <strong>0</strong>],
                ].map(([label, content], index) => (
                  <li
                    key={index}
                    css={`
                      display: flex;
                      justify-content: space-between;
                      list-style: none;
                      color: ${theme.surfaceContent};

                      & + & {
                        margin-top: ${2 * GU}px;
                      }

                      > span:nth-child(1) {
                        color: ${theme.surfaceContentSecondary};
                      }
                      > span:nth-child(2) {
                        // “:” is here for accessibility reasons, we can hide it
                        opacity: 0;
                        width: 10px;
                      }
                      > span:nth-child(3) {
                        flex-shrink: 1;
                      }
                      > strong {
                        text-transform: uppercase;
                      }
                    `}
                  >
                    <span>{label}</span>
                    <span>:</span>
                    {content}
                  </li>
                ))}
              </ul>
            </Box>
          </React.Fragment>
        }
      />
    </React.Fragment>
  )
}

export default Details
