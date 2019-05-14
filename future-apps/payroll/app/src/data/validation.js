import JsonSchemaValidator from 'ajv'
import { isAddress } from '../utils/web3'

const validator = new JsonSchemaValidator({
  coerceTypes: true,
  useDefaults: true,
})

validator.addFormat('address', {
  type: 'string',
  validate: isAddress,
})

export default validator
