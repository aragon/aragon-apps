const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const APPS_GIT_URL = 'https://github.com/aragon/aragon-apps.git'

module.exports = (web3, TruffleContract, TruffleConfig) => {
  return class VersionedContractsProvider {
    static fromBranch({ commit, source = APPS_GIT_URL, projectDir = '.', outputDir = 'tmp' }) {
      const outputPath = path.resolve(outputDir)
      const compiler = new RemoteCompiler(source, commit, projectDir, outputPath)
      const buildDirPath = compiler.call()
      return new VersionedContractsProvider(buildDirPath)
    }

    static fromPath(buildDirPath) {
      return new VersionedContractsProvider(buildDirPath)
    }

    constructor(buildDirPath) {
      this.buildDirPath = buildDirPath
    }

    getContract(contractName) {
      const path = `${this.buildDirPath}/${contractName}.json`
      const contract = TruffleContract(require(path))
      return this._provideContract(contract)
    }
 
    _provideContract(contract) {
      contract.setNetwork('test')
      contract.defaults(this._getContractsDefaults())
      contract.setProvider(web3.currentProvider)
      return contract
    }
 
    _getContractsDefaults() {
      const config = TruffleConfig.detect({ logger: console })
      const defaults = this._pickKeys(config, ['from', 'gas', 'gasPrice'])
      if (!defaults.from) defaults.from = web3.eth.accounts[0]
      return defaults
    }
 
    _pickKeys(object, keys) {
      return keys.reduce((result, key) => {
        if (object[key] !== undefined) result[key] = object[key]
        return result
      }, {})
    }
  }
}

class RemoteCompiler {
  constructor(source, commit, projectDir, outputPath) {
    this.source = source
    this.commit = commit
    this.outputPath = outputPath
    this.projectPath = path.resolve(this.outputPath, projectDir)
  }

  call() {
    this.cloneGithubRepo()
    return this.compile()
  }

  cloneGithubRepo() {
    if (!fs.existsSync(this.outputPath)) fs.mkdirSync(this.outputPath)
    this._run('git', ['clone', this.source, this.outputPath])
    this._run('git', ['reset', '--hard', this.commit], this.outputPath)
  }

  compile() {
    this._run('npm', ['install'], this.outputPath)
    this._run('npx', ['truffle', 'compile'], this.projectPath)
    return path.resolve(this.projectPath, 'build/contracts')
  }

  _run(cmd, args = [], cwd = '.') {
    console.log(`Running ${cmd} with args ${args} in ${cwd}`)
    const output = spawnSync(cmd, args, { cwd })
    if (output.error) throw new Error(`Failed running command ${cmd} in ${cwd}: \n${output.error}`)
  }
}
