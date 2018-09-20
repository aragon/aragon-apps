import React from 'react'
import styled, { css } from 'styled-components'
import { Text, theme } from '@aragon/ui'

const TabList = styled.ul`
  list-style-type: none;
  margin: 0;
  padding: 0 30px;
  background: ${theme.contentBackground};

  ${({ border = true }) => border && css`
    border-bottom: 1px solid ${theme.contentBorder};
    margin-top: -1px; // Overlap AppBar border
  `}
`

const Tab = styled.li`
  display: inline-block;
  margin-right: 30px;
  padding: 8px 0 4px;
  cursor: pointer;
  border-bottom: 4px solid ${({ active }) => active ? theme.gradientEndActive : 'transparent'};
`

class TabContainer extends React.Component {
  state = { selectedIndex: 0 }

  componentDidUpdate (prevProps, prevState) {
    const { onTabChange } = this.props

    if (typeof this.props.onTabChange === 'function') {
      const { children } = this.props
      const { selectedIndex } = this.state

      if (selectedIndex !== prevState.selectedIndex && selectedIndex < children.length) {
        const name = children[selectedIndex].props.name || `tab-${selectedIndex}`

        onTabChange(selectedIndex, name)
      }
    }
  }

  onTabClick (index) {
    this.setState({ selectedIndex: index })
  }

  render () {
    const { selectedIndex } = this.state

    return (
      <TabList>
        {React.Children.map(this.props.children, (child, index) => {
          if (child.type !== Tab) {
            return child
          }

          return React.cloneElement(child, {
            active: selectedIndex === index,
            onClick: () => this.onTabClick(index, child.props.name),
            children: child.props.children || (
              <Text size='large' weight={selectedIndex === index ? 'bolder' : 'normal'}>
                {child.props.title || `Tab ${index}`}
              </Text>
            )
          })
        })}
      </TabList>
    )
  }
}

Tab.Container = TabContainer

export default Tab
