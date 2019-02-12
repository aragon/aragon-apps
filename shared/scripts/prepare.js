#!/usr/bin/env node

const execute = require('child_process').execSync
const shouldInstallFrontend = process.env.INSTALL_FRONTEND === 'true'

if (shouldInstallFrontend) {
  execute('npm run install:frontend', { stdio: 'inherit' })
} else {
  console.log('Skipping frontend installation')
}
