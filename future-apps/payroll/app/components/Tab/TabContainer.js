import React from 'react'
import PropTypes from 'prop-types'
import styled, { css } from 'styled-components'

import { Text, theme } from '@aragon/ui'
import Tab from './Tab'

const TabList = styled.ul`
  margin: 0;
  padding: 0 30px;
  list-style-type: none;
  background: ${theme.contentBackground};

  ${({ border = true }) => border && css`
    border-bottom: 1px solid ${theme.contentBorder};
    margin-top: -1px; // Overlap AppBar border
  `}
  
  ${Tab} {
    margin-right: 30px;
  }
`

class TabContainer extends React.PureComponent {
  state = {
    selectedIndex: 0
  }

  componentDidUpdate (prevProps, prevState) {
    const { children, onTabChange } = this.props
    const { selectedIndex } = this.state

    if (typeof onTabChange === 'function') {
      const valueChanged = selectedIndex !== prevState.selectedIndex

      if (valueChanged && selectedIndex < children.length) {
        const tab = children[selectedIndex]
        const name = tab.props.name || `tab-${selectedIndex}`

        onTabChange(selectedIndex, name)
      }
    }
  }

  render () {
    const { children } = this.props
    const { selectedIndex } = this.state

    return (
      <TabList>
        {React.Children.map(children, (child, index) => {
          if (child.type === Tab) {
            const tab = child
            const active = tab.props.active || selectedIndex === index

            return React.cloneElement(tab, {
              active,
              onClick: () => this.setState({ selectedIndex: index }),
              children: tab.props.children || (
                <Text size='large' weight={active ? 'bolder' : 'normal'}>
                  {tab.props.title || `Tab ${index}`}
                </Text>
              )
            })
          }

          return child
        })}
      </TabList>
    )
  }
}

TabContainer.propTypes = {
  children: PropTypes.arrayOf(PropTypes.node),
  onTabChange: PropTypes.func
}

export default TabContainer
