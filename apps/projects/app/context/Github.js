import React from 'react'

export const GithubContext = React.createContext()

const WithGithub = (Component, props) => (
  <GithubContext.Consumer>
    {value => <Component {...props} github={value} />}
  </GithubContext.Consumer>
)

export const withGithub = Component => WithGithub.bind(null, Component)
