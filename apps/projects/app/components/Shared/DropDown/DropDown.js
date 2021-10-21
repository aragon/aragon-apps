import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { theme, unselectable } from '@aragon/ui'

import { IconArrowDown } from '../../Shared'

const BASE_HEIGHT = 40

// TODO: This should extend the StyledDropDownItem
// TODO: Fix shadow to 0.03 and hover
/* // padding: 10px; */
const StyledButton = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  text-indent: 10px;
  line-height: ${BASE_HEIGHT - 2}px;
  box-shadow: 0 4px 4px 0 rgba(0, 0, 0, 0.03);

  :active {
    background: ${theme.contentBackgroundActive};
  }

  > :last-child {
    margin-right: 10px;
    color: ${theme.contentBorderActive};
    transform: rotate(${({ opened }) => (opened ? -180 : 0)}deg);
    transition: all 0.2s ease-out;
  }
`
const StyledDropDown = styled.div`
  position: relative;
  display: inline-block;
  width: ${({ BASE_WIDTH }) => BASE_WIDTH}px;
  height: ${BASE_HEIGHT}px;
  ${unselectable};

  > * {
    background: ${theme.contentBackground};
    border: 1px solid ${theme.contentBorder};
    border-radius: 3px;
    cursor: pointer;
    font-size: 15px;
    position: absolute;
    width: 100%;
  }
`

// TODO: Join the child with StyledButton into DropDownItem and DropDowItemActive
const DropDownItems = styled.div`
  box-shadow: 0 4px 4px 0 rgba(0, 0, 0, 0.1);
  opacity: ${({ opened }) => (opened ? 1 : 0)};
  transition: all 0.2s ease-out;
  top: calc(100% - 1px);

  > * {
    text-indent: 10px;
    line-height: ${BASE_HEIGHT - 2}px;

    :hover {
      color: ${theme.accent};
    }

    :active {
      background: ${theme.contentBackgroundActive};
    }
  }
`
/**
 * TODO: Document each component with this kind of comments
 */
class DropDown extends React.PureComponent {
  state = { opened: false }

  // static defaultProps = {
  //   control: StyledButton,
  //   // TODO: better with units? as seen in: https://www.styled-components.com/docs/api#taggedtemplateliteral
  //   width: 193,
  // }

  open = () => {
    this.setState({ opened: true })
    document.addEventListener('click', this.close)
  }

  close = () => {
    this.setState({ opened: false })
    document.removeEventListener('click', this.close)
  }

  loadItems = items => items.map(item => <div key={item}>{item}</div>)

  render() {
    const {
      // control: DropDownControl,
      items,
      // width,
      className,
    } = this.props
    const { opened } = this.state
    return (
      <StyledDropDown className={className}>
        <StyledButton onClick={this.open} opened={opened}>
          {items[0]}
          <IconArrowDown />
        </StyledButton>
        <DropDownItems opened={opened}>{this.loadItems(items)}</DropDownItems>
      </StyledDropDown>
    )
  }
}

DropDown.propTypes = {
  className: PropTypes.string,
  items: PropTypes.array.isRequired,
}

export default DropDown
