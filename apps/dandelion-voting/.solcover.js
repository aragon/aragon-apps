module.exports = {
    norpc: true,
    copyPackages: [
        '@aragon/os', 
        '@aragon/apps-shared-minime', 
        '@aragon/test-helpers', 
        '@aragon/apps-token-manager', 
        '@aragon/apps-vault', 
        '@aragon/apps-voting'
    ],
    skipFiles: [
        'test',
        'examples',
        '@aragon/os', 
        '@aragon/apps-shared-minime', 
        '@aragon/test-helpers', 
        '@aragon/apps-token-manager', 
        '@aragon/apps-vault', 
        '@aragon/apps-voting'
    ]
}