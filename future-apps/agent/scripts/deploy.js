module.exports = async callback => {
  const c = await artifacts.require(require('../arapp').path).new()
  console.log(c.address)
  callback()
}
