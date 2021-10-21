import React from 'react'
import styled from 'styled-components'
import { TextInput, theme } from '@aragon/ui'

const SearchBar = () => (
  <StyledSearchBar>
    <StyledSearchInput>
      <StyledTextInput />
      <Magnifier />
    </StyledSearchInput>
  </StyledSearchBar>
)

const StyledSearchBar = styled.div`
  display: flex;
  justify-content: space-between;
`

// TODO: Use @aragon-ui search input with custom icon
const StyledSearchInput = styled.div`
  position: relative;
  width: 220px;
  height: 50px;
  > :last-child {
    position: absolute;
    right: 15px;
    top: 10px;
    color: ${theme.textSecondary};
    pointer-events: none;
  }
`

// TODO: Extract to shared with StyledTextInput from settings
const StyledTextInput = styled(TextInput).attrs({
  type: 'text',
})`
  width: 100%;
  border: 1px sold #ccc;
  padding-right: 35px;
  font-size: 16px;
`

// TODO: credit simple-line-icons project
const Magnifier = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    width="16"
    height="16"
    viewBox="0 0 1024 1024"
  >
    <path d="M1014.64 969.04L703.71 656.207c57.952-69.408 92.88-158.704 92.88-256.208 0-220.912-179.088-400-400-400s-400 179.088-400 400 179.088 400 400 400c100.368 0 192.048-37.056 262.288-98.144l310.496 312.448c12.496 12.497 32.769 12.497 45.265 0 12.48-12.496 12.48-32.752 0-45.263zM396.59 736.527c-185.856 0-336.528-150.672-336.528-336.528S210.734 63.471 396.59 63.471c185.856 0 336.528 150.672 336.528 336.528S582.446 736.527 396.59 736.527z" />
  </svg>
)

// eslint-disable-next-line import/no-unused-modules
export default SearchBar
