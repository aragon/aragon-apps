module.exports = {
    norpc: true,
    copyPackages: ['@aragon/os', '@aragon/apps-shared-minime', '@aragon/test-helpers'],
    skipFiles: [
        'test',
        '@aragon/test-helpers/contracts/TimeHelpersMock.sol',
    ]
}
