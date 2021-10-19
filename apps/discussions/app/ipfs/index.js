import ipfsClient from 'ipfs-http-client'

export const ipfs = ipfsClient({
  host: 'ipfs.autark.xyz',
  port: '5001',
  protocol: 'https',
})
