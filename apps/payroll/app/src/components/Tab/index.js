import React from 'react'
import { Text } from '@aragon/ui'
import PropTypes from 'prop-types'

import TabItem from './TabItem'
import TabList from './TabList'

const Tab = props => (
  <TabItem {...props}>
    <Text size="large" weight={props.active ? 'bolder' : 'normal'}>
      {props.title || `Tab ${props.key}`}
    </Text>
  </TabItem>
)

Tab.propTypes = {
  active: PropTypes.bool,
  title: PropTypes.string,
}

Tab.Container = TabList

export default Tab
