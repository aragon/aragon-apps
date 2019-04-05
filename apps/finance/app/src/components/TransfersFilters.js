import React from 'react'
import styled, { css } from 'styled-components'
import { DropDown, springs, theme, unselectable } from '@aragon/ui'
import { Spring, animated } from 'react-spring'
import DownloadButton from './DownloadButton'
import DateRange from './DateRange/DateRangeInput'

const TransfersFilters = ({
  compactMode,
  opened,
  dateRangeFilter,
  onDateRangeChange,
  onTokenChange,
  symbols,
  tokenFilter,
  transferTypes,
  transferTypeFilter,
  onTransferTypeChange,
  downloadFileName,
  downloadUrl,
}) => (
  <Spring
    native
    config={springs.smooth}
    from={{ progress: 0, height: 0 }}
    to={{
      progress: Number(opened),
      height: opened || !compactMode ? 'auto' : 0,
    }}
    immediate={!compactMode}
  >
    {({ progress, height }) => (
      <animated.div
        style={{
          width: '100%',
          overflow: progress.interpolate(v => (v === 1 ? 'unset' : 'hidden')),
          height,
        }}
      >
        <Filters compact={compactMode}>
          <div
            css={`
              display: flex;
              width: 100%;
              justify-content: space-between;
            `}
          >
            <div
              css={`
                width: 100%;
                display: flex;
                flex-wrap: nowrap;
                flex-direction: ${compactMode ? 'column' : 'row'};
              `}
            >
              <FiltersGroup compact={compactMode}>
                <Filter>
                  <FilterLabel>Period</FilterLabel>
                  <WrapDateRange>
                    <DateRange
                      startDate={dateRangeFilter.start}
                      endDate={dateRangeFilter.end}
                      onChange={onDateRangeChange}
                    />
                  </WrapDateRange>
                </Filter>
              </FiltersGroup>
              <FiltersGroup compact={compactMode}>
                <Filter>
                  <FilterLabel>Token</FilterLabel>
                  <DropDown
                    items={['All', ...symbols]}
                    active={tokenFilter}
                    onChange={onTokenChange}
                  />
                </Filter>
                <Filter>
                  <FilterLabel>Type</FilterLabel>
                  <DropDown
                    items={transferTypes}
                    active={transferTypeFilter}
                    onChange={onTransferTypeChange}
                  />
                </Filter>
              </FiltersGroup>
            </div>
            <div>
              <Download compact={compactMode}>
                <DownloadLabel>Export</DownloadLabel>
                <DownloadButton filename={downloadFileName} url={downloadUrl} />
              </Download>
            </div>
          </div>
        </Filters>
      </animated.div>
    )}
  </Spring>
)

const WrapDateRange = styled.div`
  display: inline-block;
  box-shadow: 0 4px 4px 0 rgba(0, 0, 0, 0.03);
`

const Filter = styled.label``

const FilterLabel = styled.span`
  display: block;
  margin-right: 8px;
  font-variant: small-caps;
  text-transform: lowercase;
  color: ${theme.textSecondary};
  font-weight: 600;
  ${unselectable};
`

const Filters = styled.div`
  margin: 0 20px 10px 20px;
  padding-bottom: 16px;
  ${Filter} {
    margin-right: 16px;
  }
  ${p =>
    p.compact
      ? ''
      : css`
          width: 100%;
          margin: 0;
          justify-content: space-between;
          margin-left: 0;
          margin-right: 0;

          /* Easier than passing compactMode to every Filter & FilterLabel */
          ${Filter} {
            display: flex;
            flex-wrap: nowrap;
            align-items: center;
            white-space: nowrap;
          }
          ${FilterLabel} {
            display: inline;
          }
        `};
`

const FiltersGroup = styled.div`
  display: ${p => (p.compact ? 'flex' : 'inline-flex')};
  align-items: flex-start;
  justify-content: ${p => (p.compact ? 'unset' : 'space-between')};
  & + & {
    margin-top: ${p => (p.compact ? '16px' : '0')};
  }
`

const DownloadLabel = styled(FilterLabel)``

const Download = styled(Filter).attrs({ as: 'div' })`
  && {
    display: flex;
    flex-direction: ${p => (p.compact ? 'column' : 'row')};
    align-items: ${p => (p.compact ? 'flex-end' : 'center')};
    margin-top: ${p => (p.compact ? '78px' : '0')};
    margin-right: 0;
  }
  ${DownloadLabel} {
    margin-right: ${p => (p.compact ? '0' : '4px')};
  }
`

export default TransfersFilters
