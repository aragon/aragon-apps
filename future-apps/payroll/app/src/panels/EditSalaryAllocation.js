import React from 'react'
import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Button, DropDown, Info, SidePanel, Slider } from '@aragon/ui'

import { connect } from '../context/AragonContext'
import Input from '../components/Input'

const Form = styled.form`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`

const TokenContainer = styled.section`
  flex: 1;
  margin: 2em 0;
`

const TokenAllocation = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  > * {
    width: 80px;
    
    :nth-child(n+2) {
      width: 100%;
    }
  }
  
  :nth-child(n+2) {
    margin-top: 4em;
  }
`

const AllocationLabel = styled(Input).attrs({
  readOnly: true
})`
  padding: 8px 15px;
  font-size: 15px;
`

const SubmitButton = styled(Button).attrs({
  type: 'submit',
  mode: 'strong'
})`
  margin-top: 2em;
`

class EditSalaryAllocation extends React.Component {
  changeHandlers = new Map()

  state = {
    salaryAllocation: this.props.salaryAllocation,
    tokens: this.props.tokens
  }

  get pristine () {
    return this.state.salaryAllocation == null
  }

  get isValid () {
    const { salaryAllocation } = this.state

    if (!salaryAllocation || !salaryAllocation.length) {
      return false
    }

    const tokens = []
    let allocation = 0

    for (const item of salaryAllocation) {
      if (tokens.includes(item.symbol)) {
        return false
      }

      tokens.push(item.symbol)
      allocation += item.allocation
    }

    return allocation === 100
  }

  handleFormSubmit = (event) => {
    event.preventDefault()

    const { app } = this.props
    const { salaryAllocation } = this.state

    if (app) {
      const tokens = []
      const distribution = []

      for (const { address, allocation } of salaryAllocation) {
        if (allocation) {
          if (tokens.includes(address)) {
            distribution[tokens.indexOf(address)] += allocation
          } else {
            tokens.push(address)
            distribution.push(allocation)
          }
        }
      }

      app.determineAllocation(
        tokens,
        distribution
      ).subscribe(() => {
        this.props.onClose()
      })
    }
  }

  handleTokenAllocationChange = (index) => {
    if (!this.changeHandlers.has(index)) {
      const handler = value => {
        this.setState((state, props) => {
          const currentAllocation = state.salaryAllocation || props.salaryAllocation
          const newAllocation = JSON.parse(JSON.stringify(currentAllocation))

          newAllocation[index].allocation = parseInt(value * 100)

          const offset = parseInt(
            (currentAllocation[index].allocation - newAllocation[index].allocation) /
            (newAllocation.length - 1)
          )

          for (let i = 0; i < newAllocation.length; i++) {
            if (i !== index) {
              const value = newAllocation[i].allocation + offset

              newAllocation[i].allocation = Math.max(value, 0)
            }
          }

          return {
            salaryAllocation: newAllocation
          }
        })
      }

      this.changeHandlers.set(index, handler)
    }

    return this.changeHandlers.get(index)
  }

  handlePanelToggle = (opened) => {
    // Reset form when user closes the side panel
    if (!opened) {
      this.setState((state, props) => {
        return {
          salaryAllocation: props.salaryAllocation
        }
      })
    }
  }

  render () {
    const { opened, onClose, tokens = [], salaryAllocation: currentAllocation = [] } = this.props
    const { salaryAllocation = currentAllocation } = this.state

    const panel = (
      <SidePanel
        title='Edit salary allocation'
        opened={opened}
        onClose={onClose}
        onTransitionEnd={this.handlePanelToggle}
      >
        <Form onSubmit={this.handleFormSubmit}>
          <Info.Action title='Choose which tokens you get paid in'>
            You can add as many tokens as you like,
            as long as your DAO has these tokens.
          </Info.Action>

          <TokenContainer>
            {salaryAllocation.map((token, index) => (
              <TokenAllocation key={token.address}>
                <DropDown
                  items={tokens.map(token => token.symbol)}
                  active={index}
                />

                <Slider
                  name={token.symbol}
                  value={token.allocation / 100}
                  onUpdate={this.handleTokenAllocationChange(index)}
                />

                <AllocationLabel
                  value={token.allocation}
                />
              </TokenAllocation>
            ))}
          </TokenContainer>

          <Info.Permissions title='Submission note'>
            Your split contract will be updated on the blockchain,
            and you cannot request salary until it's complete
          </Info.Permissions>

          <SubmitButton disabled={this.pristine || !this.isValid}>
            Submit split configuration
          </SubmitButton>
        </Form>
      </SidePanel>
    )

    return createPortal(
      panel,
      document.getElementById('modal-root')
    )
  }
}

EditSalaryAllocation.propsType = {
  onClose: PropTypes.func,
  opened: PropTypes.bool
}

function mapStateToProps ({ tokens = [], salaryAllocation }) {
  return {
    tokens,
    salaryAllocation
  }
}

export default connect(mapStateToProps)(EditSalaryAllocation)
