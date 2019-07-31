module.exports = {
    norpc: true,
    copyPackages: ['@aragon/os', '@aragon/apps-shared-minime', '@aragon/test-helpers', '@aragon/apps-vault'],
    skipFiles: [
        'test',
        'examples',
        '@aragon/os',
        '@aragon/apps-vault',
        '@aragon/test-helpers',
        '@aragon/apps-shared-minime',
    ],
    // Turn on deep skip to avoid preprocessing (e.g. removing view/pure modifiers) for skipped files
    deepSkip: true
}
