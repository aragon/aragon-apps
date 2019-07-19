module.exports = {
    norpc: true,
    copyPackages: [
        '@aragon/os',
        '@aragon/apps-finance',
        '@aragon/apps-vault',
        '@aragon/ppf-contracts',
        '@aragon/test-helpers'
    ],
    skipFiles: [
        'test',
        'examples',
        '@aragon/os',
        '@aragon/apps-vault',
        '@aragon/apps-finance',
        '@aragon/ppf-contracts',
        '@aragon/test-helpers',
    ],
    // Turn on deep skip to avoid preprocessing (e.g. removing view/pure modifiers) for skipped files
    deepSkip: true
}
