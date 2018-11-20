import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Text, theme } from '@aragon/ui'

const DEFAULT_COLORS = [
  '#000000',
  '#57666F',
  '#028CD1',
  '#21AAE7',
  '#39CAD0',
  '#ADE9EC',
  '#80AEDC'
]

const Bar = styled.div`
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 10px;
  margin: 20px 0px;
  border-radius: 4px;
  overflow: hidden;
`

const Partition = styled.div`
  flex: ${({ value }) => value};
  background: ${({ color }) => color || DEFAULT_COLORS[0]};
`

const Bullet = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  background: ${({ color }) => color || DEFAULT_COLORS[0]};
  border-radius: 10px;
`

const Label = styled.li`
  display: grid;
  grid-template-columns: 2fr 6fr 1fr;

  > :last-child {
    justify-self: end;
  }

  ${Bullet} {
    margin-right: 10px;
  }
`

const Legend = styled.ol`
  display: flex;
  flex-direction: column;
  list-style-type: none;
  padding: 0;

  ${Label} {
    padding-bottom: 8px;
  }
`

const PartitionBar = ({ data, legend, colors = DEFAULT_COLORS }) => {
  if (Array.isArray(data) && data.length) {
    const partitions = data.sort(
      (p1, p2) => p2.allocation - p1.allocation
    )

    return (
      <React.Fragment>
        <Bar>
          {partitions.map(({ symbol, allocation }, index) => (
            <Partition
              key={index}
              title={`${symbol}: ${allocation}%`}
              value={allocation}
              color={colors[index]}
            />
          ))}
        </Bar>
        {legend && (
          <Legend>
            {partitions.map(({ symbol, description, allocation }, index) => (
              <Label key={symbol + index}>
                <Text color={theme.textSecondary}>
                  <Bullet color={colors[index]}/>
                  {symbol}
                </Text>
                <div>
                  {description}
                </div>
                <Text weight='bolder'>
                  {allocation}%
                </Text>
              </Label>
            ))}
          </Legend>
        )}
      </React.Fragment>
    )
  }

  return null
}

PartitionBar.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      symbol: PropTypes.string.isRequired,
      allocation: PropTypes.number.isRequired,
      description: PropTypes.node
    })
  ).isRequired,
  colors: PropTypes.arrayOf(PropTypes.string),
  legend: PropTypes.bool
}

PartitionBar.defaultProps = {
  legend: true
}

export default PartitionBar
