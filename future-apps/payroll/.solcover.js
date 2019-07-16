module.exports = {
    norpc: true,
    copyPackages: ['@aragon/os', '@aragon/apps-finance', '@aragon/apps-vault', '@aragon/test-helpers'],
    skipFiles: [
	'test',
        'examples',
        '@aragon/os',
        '@aragon/apps-vault',
        '@aragon/apps-finance',
        '@aragon/ppf-contracts',
        '@aragon/test-helpers',
    ]
}
