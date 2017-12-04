#!/usr/bin/env node

const path = require('path')
const syncFiles = require('sync-files')

const defaultSyncOpts = {
  delete: true, // Always delete extraneous files from to directory
}

// Asset directories
const assets = {
  aragonUi: {
    from: path.dirname(require.resolve('@aragon/ui')),
    to: path.resolve('public', 'aragon-ui'),
  },
}

// Sync each directory
for ({ from, to, opts = {} } of Object.values(assets)) {
  syncFiles(from, to, { ...defaultSyncOpts, ...opts }, (event, data) => {
    if (event === 'error') {
      console.error(data.message || data)
    }
  })
}
