workflow "test" {
  on = "push"
  resolves = [
    "install",
    "bootstrap",
    "lint",
    "test:shared",
    "test:voting",
    "test:finance",
    "test:token-manager",
    "test:vault",
    "test:survey",
    "test:agent",
    "coverage:agent",
    "coverage:finance",
    "coverage:survey",
    "coverage:token-manager",
    "coverage:vault",
    "coverage:voting"
  ]
}

action "install" {
  uses = "actions/npm@master"
  args = "install"
}

action "bootstrap" {
  needs = "install"
  uses = "actions/npm@master"
  args = "run bootstrap:ci"
  env = {
    INSTALL_FRONTEND = "true"
  }
}

action "lint" {
  needs = "bootstrap"
  uses = "actions/npm@master"
  args = "run lint"
}

action "test:shared" {
  needs = "bootstrap"
  uses = "actions/npm@master"
  args = "run test:shared"
}

action "test:agent" {
  needs = "test:finance"
  uses = "actions/npm@master"
  args = "run test:agent"
}

action "test:finance" {
  needs = "bootstrap"
  uses = "actions/npm@master"
  args = "run test:finance"
}

action "test:survey" {
  needs = "test:finance"
  uses = "actions/npm@master"
  args = "run test:survey"
}

action "test:token-manager" {
  needs = "bootstrap"
  uses = "actions/npm@master"
  args = "run test:token-manager"
}

action "test:token-manager:app" {
  needs = "bootstrap"
  uses = "actions/npm@master"
  args = "run test:token-manager:app"
}

action "test:vault" {
  needs = "test:finance"
  uses = "actions/npm@master"
  args = "run test:vault"
}

action "test:voting" {
  needs = "bootstrap"
  uses = "actions/npm@master"
  args = "run test:voting"
}

action "coverage:agent" {
  needs = "test:agent"
  uses = "actions/npm@master"
  args = "run coverage:agent"
}

action "coverage:finance" {
  needs = "test:survey"
  uses = "actions/npm@master"
  args = "run coverage:finance"
}

action "coverage:survey" {
  needs = "test:survey"
  uses = "actions/npm@master"
  args = "run coverage:survey"
}

action "coverage:token-manager" {
  needs = "test:survey"
  uses = "actions/npm@master"
  args = "run coverage:token-manager"
}

action "coverage:vault" {
  needs = "test:survey"
  uses = "actions/npm@master"
  args = "run coverage:vault"
}

action "coverage:voting" {
  needs = "test:survey"
  uses = "actions/npm@master"
  args = "run coverage:voting"
}
