import entities from './mock/entities'

export async function getIdentity (search, limit = 5) {
  const criteria = new RegExp(search, 'i')

  const matches = entities.filter(entity =>
    criteria.test(entity.domain) ||
    criteria.test(entity.name) ||
    criteria.test(entity.role)
  )

  return matches.slice(0, limit)
}
