const interfaces = require('glob').sync('contracts/interfaces/**/*.sol').map(n => n.replace('contracts/', ''))

module.exports = {
    norpc: true,
    // rsync is needed so symlinks are resolved on copy of lerna packages
    testCommand: 'rsync --copy-links -r ../node_modules/@aragon node_modules && node --max-old-space-size=4096 ../node_modules/.bin/truffle test --network coverage',
    skipFiles: interfaces,
    copyNodeModules: true,
}
