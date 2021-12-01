import axios from 'axios'
import ipfsClient from 'ipfs-http-client'

// TODO: move settings to ENV (maybe don't use a gateway at all?)
const host = 'ipfs.autark.xyz'
const protocol = 'https'
const port = '5001'
const client = ipfsClient({ host, port, protocol })

const bufferFile = content => client.types.Buffer.from(JSON.stringify(content))

export const ipfsAdd = async content => {
  const file = bufferFile(content)
  try {
    const result = await client.add(file)
    return result[0].hash
  } catch (err) {
    console.error('Error pinning file to IPFS', err)
  }
}

export const ipfsGet = async hash => {
  const gatewayAPI = `${protocol}://${host}:${port}/api/v0`
  const endpoint = `${gatewayAPI}/cat?arg=${hash}`
  try {
    const { data } = await axios.get(endpoint)
    return data
  } catch (err) {
    console.error('Error getting data from IPFS', err)
  }
}
