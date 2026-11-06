import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'

function hashConsentToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

function generateConsentToken() {
  return randomBytes(32).toString('base64url')
}

function consentSatisfiesCurrent({ status, generalTermsId, productTermsId, active }) {
  return (
    status === 'agreed' &&
    generalTermsId === active.generalId &&
    productTermsId === active.productId
  )
}

function publicTokenOutcome({ found, status, expiresAt, now = new Date() }) {
  if (!found || !status || !expiresAt) return 'invalid'
  if (status !== 'pending') return 'invalid'
  if (new Date(expiresAt).getTime() <= now.getTime()) return 'invalid'
  return 'usable'
}

const token = generateConsentToken()
assert.ok(token.length >= 43, 'token should be 32 bytes base64url')
const hash = hashConsentToken(token)
assert.equal(hash.length, 64)
assert.notEqual(hash, token)
assert.equal(hashConsentToken(token), hash)
assert.notEqual(hashConsentToken(token + 'x'), hash)

const current = { generalId: 'g1', productId: 'p1' }
assert.equal(
  consentSatisfiesCurrent({
    status: 'agreed',
    generalTermsId: 'g1',
    productTermsId: 'p1',
    active: current,
  }),
  true
)
assert.equal(
  consentSatisfiesCurrent({
    status: 'agreed',
    generalTermsId: 'g1',
    productTermsId: 'p-old',
    active: current,
  }),
  false,
  'new product policy version requires agreement again'
)
assert.equal(
  consentSatisfiesCurrent({
    status: 'agreed',
    generalTermsId: 'g-new',
    productTermsId: 'p1',
    active: current,
  }),
  false,
  'new general terms require agreement again'
)
assert.equal(
  consentSatisfiesCurrent({
    status: 'pending',
    generalTermsId: 'g1',
    productTermsId: 'p1',
    active: current,
  }),
  false
)

const now = new Date('2026-11-06T12:00:00Z')
assert.equal(
  publicTokenOutcome({ found: false, status: null, expiresAt: null, now }),
  'invalid'
)
assert.equal(
  publicTokenOutcome({
    found: true,
    status: 'agreed',
    expiresAt: '2026-11-10T12:00:00Z',
    now,
  }),
  'invalid',
  'reused token rejected'
)
assert.equal(
  publicTokenOutcome({
    found: true,
    status: 'pending',
    expiresAt: '2026-11-01T12:00:00Z',
    now,
  }),
  'invalid',
  'expired token rejected'
)
assert.equal(
  publicTokenOutcome({
    found: true,
    status: 'pending',
    expiresAt: '2026-11-10T12:00:00Z',
    now,
  }),
  'usable'
)

function findUnfilledTermPlaceholders(text) {
  const matches = text.match(/\[[^\[\]]{1,300}\]/g) ?? []
  const unique = []
  for (const match of matches) {
    const normalised = match.replace(/\s+/g, ' ').trim()
    if (!unique.includes(normalised)) unique.push(normalised)
  }
  return unique
}

assert.deepEqual(findUnfilledTermPlaceholders('No blanks here.'), [])
assert.deepEqual(findUnfilledTermPlaceholders('Refund [__]% within [__] working days.'), [
  '[__]',
])
assert.ok(
  findUnfilledTermPlaceholders('Licence: [to be completed by the Company].').includes(
    '[to be completed by the Company]'
  )
)

console.log('invoice consent tests passed')
