module.exports = {
    norpc: true,
    copyPackages: ['@aragon/os', '@aragon/apps-shared-minime', '@aragon/test-helpers'],
    skipFiles: [
        'test',
        '@aragon/os',
        '@aragon/apps-shared-minime',
        '@aragon/test-helpers',
    ],
    // Turn on deep skip to avoid preprocessing (e.g. removing view/pure modifiers) for skipped files
    deepSkip: true
}
