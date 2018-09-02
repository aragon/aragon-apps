module.exports = {
    norpc: true,
    copyPackages: ['@aragon/os'],
    skipFiles: [
        'test/TestImports.sol',
        'test/mocks/SimpleERC20.sol',
    ]
}
