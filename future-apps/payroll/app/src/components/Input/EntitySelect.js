import React from 'react'
import styled from 'styled-components'
import { Text, theme } from '@aragon/ui'
import Autocomplete from 'react-autocomplete'

import BaseInput from './BaseInput'
import * as idm from '../../services/idm'

const EntityList = styled.ul`
  position: absolute;
  left: 0;
  right: 0;
  list-style: none;
  border: 1px solid ${theme.contentBorder};
  background: ${theme.contentBackground};
  z-index: 10;
`

const EntityItem = styled.li`
  padding: 10px;
  background: ${({ active }) => active && theme.contentBackgroundActive};
`

const styles = {
  wrapper: {
    position: 'relative',
    width: '100%'
  }
}

class EntitySelect extends React.Component {
  state = {
    matches: [],
    value: this.props.value || ''
  }

  componentDidUpdate (prevProps, prevState) {
    const value = this.state.value.trim()

    if (value !== prevState.value) {
      if (value) {
        idm.getIdentity(value).then(matches => {
          this.setState({ matches })
        })
      } else if (typeof this.props.onChange === 'function') {
        this.setState({ matches: [] })
        this.props.onChange()
      }
    }
  }

  getItemValue = (entity) => {
    return entity.accountAddress
  }

  handleChange = (event, value) => {
    if (!value || !this.props.value) {
      this.setState({ value })
    }
  }

  renderInput = ({ ref, ...props }) => (
    <BaseInput type='search' innerRef={ref} {...props}/>
  )

  renderMenu = (entities) => (
    <EntityList children={entities}/>
  )

  renderItem = (entity, isHighlighted) => (
    <EntityItem key={entity.domain} active={isHighlighted}>
      <Text weight={isHighlighted ? 'bold' : 'normal'}>
        {entity.name} ({entity.domain})
      </Text>
    </EntityItem>
  )

  render () {
    return (
      <Autocomplete
        ref={el => this.input = el}
        getItemValue={this.getItemValue}
        inputProps={this.props.inputProps}
        items={this.state.matches}
        onChange={this.handleChange}
        onSelect={this.props.onChange}
        open={this.state.matches.length > 0}
        renderInput={this.renderInput}
        renderItem={this.renderItem}
        renderMenu={this.renderMenu}
        value={this.state.value}
        wrapperStyle={styles.wrapper}
      />
    )
  }
}

export default EntitySelect
