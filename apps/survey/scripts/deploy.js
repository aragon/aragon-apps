const deploy_kit = require('./deploy-kit')

// Make sure that you have deployed ENS and APM and that you set the first one in `ENS` env variable

async function deploy() {
  const network = process.argv[process.argv.findIndex(arg => arg === '--network') + 1]

  const deployConfig = {
    artifacts,
    network,
    kitName: 'survey-kit',
    kitContractName: 'SurveyKit',
    returnKit: true,
  }

  const { address } = await deploy_kit(null, deployConfig)
  console.log(address)
}

module.exports = callback => {
  deploy().then(() => callback()).catch(err => callback(err))
}
