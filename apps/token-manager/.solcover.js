module.exports = {
    norpc: true,
    copyPackages: ['@aragon/os', '@aragon-apps/minime'],
    skipFiles: [
        'test/TestImports.sol',
        'test/mocks/ExecutionTarget.sol',
    ]
}
