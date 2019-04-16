module.exports = {
  makeErrorMappingProxy (target) {
    return new Proxy(target, {
      get (target, property) {
        if (property in target) {
          return target[property]
        }

        throw new Error(`Could not find error ${property} in error mapping`)
      },
      set () {
        throw new Error('Unexpected set to error mapping')
      }
    })
  }
}
