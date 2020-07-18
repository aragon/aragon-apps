module.exports = {
    norpc: true,
    copyPackages: ['@aragon/os', '@aragon/apps-vault', '@aragon/contract-helpers-test'],
    skipFiles: [
        'test',
        '@aragon/os',
        '@aragon/apps-vault',
        '@aragon/contract-helpers-test',
    ]
}
