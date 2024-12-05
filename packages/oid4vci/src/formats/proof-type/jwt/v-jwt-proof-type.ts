import * as v from 'valibot'

import { vCompactJwt, vJwtHeader, vJwtPayload } from '@animo-id/oauth2'
import { vHttpsUrl, vInteger } from '@animo-id/oauth2-utils'

export const vJwtProofTypeIdentifier = v.literal('jwt')
export const jwtProofTypeIdentifier = vJwtProofTypeIdentifier.literal
export type JwtProofTypeIdentifier = v.InferOutput<typeof vJwtProofTypeIdentifier>

export const vCredentialRequestProofJwt = v.object({
  proof_type: vJwtProofTypeIdentifier,
  jwt: vCompactJwt,
})

export const vCredentialRequestJwtProofTypeHeader = v.pipe(
  v.looseObject({
    ...vJwtHeader.entries,
    key_attestation: v.optional(vCompactJwt),
    typ: v.literal('openid4vci-proof+jwt'),
  }),
  v.check(
    ({ kid, jwk }) => jwk === undefined || kid === undefined,
    `Both 'jwk' and 'kid' are defined. Only one is allowed`
  ),
  v.check(
    ({ trust_chain, kid }) => !trust_chain || kid !== undefined,
    `When 'trust_chain' is provided, 'kid' is required`
  )
)
export type CredentialRequestJwtProofTypeHeader = v.InferOutput<typeof vCredentialRequestJwtProofTypeHeader>

export const vCredentialRequestJwtProofTypePayload = v.looseObject({
  ...vJwtPayload.entries,
  aud: vHttpsUrl,
  iat: vInteger,
})

export type CredentialRequestJwtProofTypePayload = v.InferOutput<typeof vCredentialRequestJwtProofTypePayload>
