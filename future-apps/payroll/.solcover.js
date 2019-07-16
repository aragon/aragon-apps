module.exports = {
    norpc: true,
    copyPackages: [
        '@aragon/os',
        '@aragon/apps-finance',
        '@aragon/apps-vault',
        '@aragon/ppf-contracts',
        '@aragon/test-helpers'
    ],
    skipFiles: [
        'examples',
        'test',
        '@aragon/os',
        '@aragon/apps-vault/contracts/Finance.sol',
        '@aragon/apps-vault/contracts/Vault.sol',
        '@aragon/ppf-contracts',
        '@aragon/test-helpers/contracts/TimeHelpersMock.sol',
    ],
    // Turn on deep skip to avoid preprocessing (e.g. removing view/pure modifiers) for skipped files
    deepSkip: true
}
