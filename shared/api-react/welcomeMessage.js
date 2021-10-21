const mainStyles = 'font-size: 14px; line-height: 1.5'

export default functionNames => {
  console.log( // eslint-disable-line no-console
`%cWelcome!

%cNote:

🖼 Usually Aragon apps run within an iframe

👩🏽‍💻 You're running this app in a dev environment, loading it directly

🔌 A bunch of things can't actually work in that setup

💡 Fear not; we've set up a stubbed version of @aragon/api-react for you

🚧 This stubbed version is very incomplete!

💅🏽 You can override it with customized initialState and functions for your app

📦 Clear localStorage to go back to your initialState

💙 Update core stubbing logic in shared/api-react`,

    'color: rgb(0, 203, 230); font-size: 18px',
    mainStyles
  )

  if (functionNames.length > 0) {
    console.log(
      `%cAvailable functions: %c
      ${functionNames.map(name => `\n  ${name}`)
      }\n\n%c(Your app can use these, but you can also call them on \`window.api\` directly!)`,

      mainStyles,
      `${mainStyles}; color: rgb(0, 203, 230)`,
      mainStyles
    )
  }
}
