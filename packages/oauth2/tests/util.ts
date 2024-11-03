import crypto from 'node:crypto'
import { decodeBase64, encodeToUtf8String } from '@animo-id/oid4vc-utils'
import * as jose from 'jose'
import { type CallbackContext, HashAlgorithm, type SignJwtCallback } from '../src/callbacks'
import { clientAuthenticationNone } from '../src/client-authentication'
import { calculateJwkThumbprint } from '../src/common/jwk/jwk-thumbprint'
import type { Jwk } from '../src/common/jwk/v-jwk'

export const callbacks = {
  hash: (data, alg) => crypto.createHash(alg.replace('-', '').toLowerCase()).update(data).digest(),
  generateRandom: (bytes) => crypto.randomBytes(bytes),
  clientAuthentication: clientAuthenticationNone(),
  verifyJwt: async (signer, { compact, payload }) => {
    let jwk: Jwk
    if (signer.method === 'did') {
      jwk = JSON.parse(encodeToUtf8String(decodeBase64(signer.didUrl.split('#')[0].replace('did:jwk:', ''))))
    } else if (signer.method === 'jwk') {
      jwk = signer.publicJwk
    } else {
      throw new Error('Signer method not supported')
    }

    const josePublicKey = await jose.importJWK(jwk as jose.JWK, signer.alg)
    try {
      await jose.jwtVerify(compact, josePublicKey, {
        currentDate: payload.exp ? new Date((payload.exp - 300) * 1000) : undefined,
      })
      return true
    } catch (error) {
      return false
    }
  },
} as const satisfies Partial<CallbackContext>

export const getSignJwtCallback = async (privateJwks: Jwk[]): Promise<SignJwtCallback> => {
  const privateJwkEntries = Object.fromEntries(
    await Promise.all(
      privateJwks.map(async (jwk) => [
        await calculateJwkThumbprint({
          hashAlgorithm: HashAlgorithm.Sha256,
          hashCallback: callbacks.hash,
          jwk,
        }),
        jwk,
      ])
    )
  )

  return async (signer, { header, payload }) => {
    let jwk: Jwk
    if (signer.method === 'did') {
      jwk = JSON.parse(encodeToUtf8String(decodeBase64(signer.didUrl.split('#')[0].replace('did:jwk:', ''))))
    } else if (signer.method === 'jwk') {
      jwk = signer.publicJwk
    } else {
      throw new Error('Signer method not supported')
    }

    const privateJwk =
      privateJwkEntries[
        await calculateJwkThumbprint({ jwk, hashAlgorithm: HashAlgorithm.Sha256, hashCallback: callbacks.hash })
      ]
    if (!privateJwk) {
      throw new Error(`No private key available for public jwk \n${JSON.stringify(jwk, null, 2)}`)
    }

    const josePrivateKey = await jose.importJWK(privateJwk, signer.alg)
    const jwt = await new jose.SignJWT(payload).setProtectedHeader(header).sign(josePrivateKey)

    return jwt
  }
}