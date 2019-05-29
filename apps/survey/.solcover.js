module.exports = {
    norpc: true,
    copyPackages: ['@aragon/os', '@aragon/apps-shared-minime', '@aragon/test-helpers'],
    skipFiles: [
        'test',
        '@aragon/os',
        '@aragon/apps-shared-minime/contracts/MiniMeToken.sol',
        '@aragon/test-helpers/contracts/TimeHelpersMock.sol',
    ]
}
