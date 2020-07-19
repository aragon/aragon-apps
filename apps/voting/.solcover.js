module.exports = {
    norpc: true,
    copyPackages: ['@aragon/os', '@aragon/apps-shared-minime', '@aragon/contract-helpers-test'],
    skipFiles: [
        'test',
        '@aragon/os',
        '@aragon/apps-shared-minime',
        '@aragon/contract-helpers-test',
    ]
}
