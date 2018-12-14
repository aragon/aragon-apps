module.exports = {
    norpc: true,
    copyPackages: ['@aragon/os', '@aragon/apps-finance', '@aragon/apps-vault'],
    skipFiles: [
        'test/TestImports.sol',
        'test/mocks/ExecutionTarget.sol',
        'test/mocks/PayrollMock.sol',
        'test/mocks/Zombie.sol',
    ]
}
