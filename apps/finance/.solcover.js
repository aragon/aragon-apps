module.exports = {
    norpc: true,
    copyPackages: ['@aragon/os', '@aragon/apps-vault', '@aragon/test-helpers'],
    skipFiles: [
        'test',
        '@aragon/os',
        '@aragon/apps-vault/contracts/Vault.sol',
        '@aragon/test-helpers/contracts/TimeHelpersMock.sol',
    ]
}
