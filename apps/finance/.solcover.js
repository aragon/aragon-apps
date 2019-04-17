module.exports = {
    norpc: true,
    copyPackages: ['@aragon/os', '@aragon/apps-vault', '@aragon/test-helpers'],
    skipFiles: [
        'test',
        '@aragon/test-helpers/contracts/TimeHelpersMock.sol',
    ]
}
