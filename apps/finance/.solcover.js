module.exports = {
    copyPackages: ['@aragon/os', '@aragon/apps-vault'],
    skipFiles: [
        'test/TestImports.sol',
        'test/mocks/ExecutionTarget.sol',
        'test/mocks/FinanceMock.sol',
    ]
}
