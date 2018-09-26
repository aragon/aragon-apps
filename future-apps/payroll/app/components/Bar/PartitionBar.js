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
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  
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

const PartitionBar = ({ partition, legend }) => partition && partition.length && (
  <React.Fragment>
    <Bar>
      {partition.map((data, index) => (
        <Partition
          key={index}
          title={`${data.token}: ${data.distribution}%`}
          value={data.distribution}
          color={DEFAULT_COLORS[partition.indexOf(data)]}
        />
      ))}
    </Bar>
    {legend && (
      <Legend>
        {partition.map((data, index) => (
          <Label key={data.token + index}>
            <Text color={theme.textSecondary}>
              <Bullet color={DEFAULT_COLORS[partition.indexOf(data)]}/> {data.token}
            </Text>
            <Text weight='bolder'>
              {data.distribution}%
            </Text>
          </Label>
        ))}
      </Legend>
    )}
  </React.Fragment>
)

PartitionBar.propTypes = {
  legend: PropTypes.bool,
  partition: PropTypes.arrayOf(
    PropTypes.shape({
      token: PropTypes.string.isRequired,
      distribution: PropTypes.number.isRequired
    })
  ).isRequired
}

PartitionBar.defaultProps = {
  legend: true
}

export default PartitionBar
