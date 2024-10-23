import crypto from 'node:crypto'
import * as jose from 'jose'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import { Oid4vciClient } from '../client'
import { paradymDraft11, paradymDraft13 } from './__fixtures__/paradym'
import { bdrDraft13 } from './__fixtures__/bdr'
import { preAuthorizedCodeGrantIdentifier } from '../credential-offer/v-credential-offer'
import { type HashCallback, type SignJwtCallback, type GenerateRandomCallback, HashAlgorithm } from '../callbacks'
import { calculateJwkThumbprint } from '../common/jwk/jwk-thumbprint'
import { decodeBase64, encodeToUtf8String } from '../common/encoding'
import type { Jwk } from '../common/validation/v-common'
import { decodeJwt } from '../common/jwt/jwt'
import { extractScopesForCredentialConfigurationIds } from '../metadata/credential-issuer/credential-configurations'

const hashCallback: HashCallback = (data, alg) =>
  crypto.createHash(alg.replace('-', '').toLowerCase()).update(data).digest()
const generateRandom: GenerateRandomCallback = (bytes) => crypto.randomBytes(bytes)

const getSignJwtCallback = async (privateJwks: Jwk[]): Promise<SignJwtCallback> => {
  const privateJwkEntries = Object.fromEntries(
    await Promise.all(
      privateJwks.map(async (jwk) => [
        await calculateJwkThumbprint({
          hashAlgorithm: HashAlgorithm.Sha256,
          hashCallback,
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
      privateJwkEntries[await calculateJwkThumbprint({ jwk, hashAlgorithm: HashAlgorithm.Sha256, hashCallback })]
    if (!privateJwk) {
      throw new Error(`No private key available for public jwk \n${JSON.stringify(jwk, null, 2)}`)
    }

    const josePrivateKey = await jose.importJWK(privateJwk, signer.alg)
    const jwt = await new jose.SignJWT(payload).setProtectedHeader(header).sign(josePrivateKey)

    return jwt
  }
}

const server = setupServer()

describe('Oid4vciClient', () => {
  beforeAll(() => {
    server.listen()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  test('receive a credential from Paradym using draft 13', async () => {
    server.resetHandlers(
      http.get(paradymDraft13.credentialOfferUri.replace('?raw=true', ''), () =>
        HttpResponse.json(paradymDraft13.credentialOfferObject)
      ),
      http.get(`${paradymDraft13.credentialOfferObject.credential_issuer}/.well-known/openid-credential-issuer`, () =>
        HttpResponse.json(paradymDraft13.credentialIssuerMetadata)
      ),
      http.get(`${paradymDraft13.credentialOfferObject.credential_issuer}/.well-known/oauth-authorization-server`, () =>
        HttpResponse.text(undefined, { status: 404 })
      ),
      http.post(paradymDraft13.credentialIssuerMetadata.token_endpoint, async ({ request }) => {
        expect(await request.text()).toEqual(
          'pre-authorized_code=1130293840889780123292078&grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Apre-authorized_code'
        )
        return HttpResponse.json(paradymDraft13.accessTokenResponse)
      }),
      http.post(paradymDraft13.credentialIssuerMetadata.credential_endpoint, async ({ request }) => {
        expect(await request.json()).toEqual({
          format: 'vc+sd-jwt',
          vct: 'https://metadata.paradym.id/types/6fTEgFULv2-EmployeeBadge',
          proof: {
            proof_type: 'jwt',
            jwt: expect.any(String),
          },
        })
        return HttpResponse.json(paradymDraft13.credentialResponse)
      })
    )

    const client = new Oid4vciClient({
      callbacks: {
        hash: hashCallback,
        fetch,
        generateRandom,
        signJwt: await getSignJwtCallback([paradymDraft13.holderPrivateKeyJwk]),
      },
    })

    const credentialOffer = await client.resolveCredentialOffer(paradymDraft13.credentialOffer)
    expect(credentialOffer).toStrictEqual(paradymDraft13.credentialOfferObject)

    const issuerMetadata = await client.resolveIssuerMetadata(credentialOffer.credential_issuer)
    expect(issuerMetadata.credentialIssuer).toStrictEqual(paradymDraft13.credentialIssuerMetadata)

    const { accessTokenResponse, authorizationServer } = await client.retrievePreAuthorizedCodeAccessToken({
      credentialOffer,
      issuerMetadata,
    })
    expect(accessTokenResponse).toStrictEqual(paradymDraft13.accessTokenResponse)
    expect(authorizationServer).toStrictEqual(paradymDraft13.credentialIssuerMetadata.credential_issuer)

    const { d, ...publicKeyJwk } = paradymDraft13.holderPrivateKeyJwk
    const encodedJwk = Buffer.from(JSON.stringify(publicKeyJwk)).toString('base64url')
    const didUrl = `did:jwk:${encodedJwk}#0`

    const { jwt: proofJwt } = await client.createCredentialRequestJwtProof({
      issuerMetadata,
      signer: {
        alg: 'ES256',
        method: 'did',
        didUrl,
      },
      issuedAt: new Date('2024-10-10'),
      credentialConfigurationId: credentialOffer.credential_configuration_ids[0],
      nonce: accessTokenResponse.c_nonce,
    })
    expect(proofJwt).toMatch(
      'eyJhbGciOiJFUzI1NiIsInR5cCI6Im9wZW5pZDR2Y2ktcHJvb2Yrand0Iiwia2lkIjoiZGlkOmp3azpleUpyZEhraU9pSkZReUlzSW5naU9pSkJSVmh3U0hreE1FZG9kRmRvYkZaUVRtMXlSbk5pZVhSZmQwUnpVVjgzY1ROa2FrNXVjbWg2YWw4MElpd2llU0k2SWtSSFZFRkRUMEZCYmxGVVpYQmhSRFF3WjNsSE9WcHNMVzlFYUU5c2RqTlZRbXhVZEhoSlpYSTFaVzhpTENKamNuWWlPaUpRTFRJMU5pSjkjMCJ9.eyJub25jZSI6IjQ2MzI1MzkxNzA5NDg2OTE3MjA3ODMxMCIsImF1ZCI6Imh0dHBzOi8vYWdlbnQucGFyYWR5bS5pZC9vaWQ0dmNpL2RyYWZ0LTEzLWlzc3VlciIsImlhdCI6MTcyODUxODQwMH0.'
    )
    expect(decodeJwt({ jwt: proofJwt })).toStrictEqual({
      header: {
        alg: 'ES256',
        kid: 'did:jwk:eyJrdHkiOiJFQyIsIngiOiJBRVhwSHkxMEdodFdobFZQTm1yRnNieXRfd0RzUV83cTNkak5ucmh6al80IiwieSI6IkRHVEFDT0FBblFUZXBhRDQwZ3lHOVpsLW9EaE9sdjNVQmxUdHhJZXI1ZW8iLCJjcnYiOiJQLTI1NiJ9#0',
        typ: 'openid4vci-proof+jwt',
      },
      payload: {
        aud: 'https://agent.paradym.id/oid4vci/draft-13-issuer',
        iat: 1728518400,
        nonce: '463253917094869172078310',
      },
      signature: expect.any(String),
    })

    const { credentialResponse } = await client.retrieveCredentials({
      accessToken: accessTokenResponse.access_token,
      credentialConfigurationId: credentialOffer.credential_configuration_ids[0],
      issuerMetadata,
      proof: {
        proof_type: 'jwt',
        jwt: proofJwt,
      },
    })
    expect(credentialResponse).toStrictEqual(paradymDraft13.credentialResponse)
  })

  test('receive a credential from Paradym using draft 11', async () => {
    server.resetHandlers(
      http.get(paradymDraft11.credentialOfferUri.replace('?raw=true', ''), () =>
        HttpResponse.json(paradymDraft11.credentialOfferObject)
      ),
      http.get(`${paradymDraft11.credentialOfferObject.credential_issuer}/.well-known/openid-credential-issuer`, () =>
        HttpResponse.json(paradymDraft11.credentialIssuerMetadata)
      ),
      http.get(`${paradymDraft11.credentialOfferObject.credential_issuer}/.well-known/oauth-authorization-server`, () =>
        HttpResponse.text(undefined, { status: 404 })
      ),
      http.post(paradymDraft11.credentialIssuerMetadata.token_endpoint, async ({ request }) => {
        expect(await request.text()).toEqual(
          'pre-authorized_code=1130293840889780123292078&grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Apre-authorized_code&user_pin=some-tx-code'
        )
        return HttpResponse.json(paradymDraft11.accessTokenResponse)
      }),
      http.post(paradymDraft11.credentialIssuerMetadata.credential_endpoint, async ({ request }) => {
        expect(await request.json()).toEqual({
          format: 'vc+sd-jwt',
          vct: 'https://metadata.paradym.id/types/6fTEgFULv2-EmployeeBadge',
          proof: {
            proof_type: 'jwt',
            jwt: expect.any(String),
          },
        })
        return HttpResponse.json(paradymDraft11.credentialResponse)
      })
    )

    const client = new Oid4vciClient({
      callbacks: {
        hash: hashCallback,
        fetch,
        generateRandom,
        signJwt: await getSignJwtCallback([paradymDraft11.holderPrivateKeyJwk]),
      },
    })

    const credentialOffer = await client.resolveCredentialOffer(paradymDraft11.credentialOffer)
    expect(credentialOffer).toStrictEqual({
      ...paradymDraft13.credentialOfferObject,
      credential_issuer: 'https://agent.paradym.id/oid4vci/draft-11-issuer',
      grants: {
        ...paradymDraft13.credentialOfferObject.grants,
        [preAuthorizedCodeGrantIdentifier]: {
          'pre-authorized_code':
            paradymDraft13.credentialOfferObject.grants[preAuthorizedCodeGrantIdentifier]['pre-authorized_code'],
          tx_code: {
            input_mode: 'text',
          },
        },
      },
    })

    const issuerMetadata = await client.resolveIssuerMetadata(credentialOffer.credential_issuer)
    expect(issuerMetadata.credentialIssuer).toStrictEqual({
      credential_issuer: 'https://agent.paradym.id/oid4vci/draft-11-issuer',
      credential_endpoint: 'https://agent.paradym.id/oid4vci/draft-11-issuer/credential',
      display: [{ name: 'Animo', logo: { alt_text: 'Logo of Animo Solutions', url: 'https://github.com/animo.png' } }],
      credential_configurations_supported: {
        clv2gbawu000tfkrk5l067h1h: {
          format: 'vc+sd-jwt',
          cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
          credential_signing_alg_values_supported: ['EdDSA', 'ES256'],
          display: [
            {
              name: 'Paradym Contributor',
              description: 'Contributed to the Paradym Release',
              background_color: '#5535ed',
              text_color: '#ffffff',
            },
          ],
          vct: 'https://metadata.paradym.id/types/iuoQGyxlww-ParadymContributor',
        },
        clvi9a5od00127pap4obzoeuf: {
          format: 'vc+sd-jwt',
          cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
          credential_signing_alg_values_supported: ['EdDSA', 'ES256'],
          display: [
            {
              name: 'Employee Badge',
              description: 'Credential for employee badge',
              background_color: '#000000',
              background_image: { uri: 'https://github.com/animo.png' },
              text_color: '#ffffff',
            },
          ],
          vct: 'https://metadata.paradym.id/types/6fTEgFULv2-EmployeeBadge',
        },
        clx4z0auo00a6f0sibkutdqor: {
          format: 'vc+sd-jwt',
          cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
          credential_signing_alg_values_supported: ['EdDSA', 'ES256'],
          display: [{ name: 'Direct issuance revocation', background_color: '#000000', text_color: '#ffffff' }],
          vct: 'https://metadata.paradym.id/types/ULaVABcapZ-Heyo',
        },
      },
      token_endpoint: 'https://agent.paradym.id/oid4vci/draft-11-issuer/token',
    })

    const { accessTokenResponse, authorizationServer } = await client.retrievePreAuthorizedCodeAccessToken({
      credentialOffer,
      issuerMetadata,
      txCode: 'some-tx-code',
    })
    expect(accessTokenResponse).toStrictEqual(paradymDraft11.accessTokenResponse)
    expect(authorizationServer).toStrictEqual(paradymDraft11.credentialIssuerMetadata.credential_issuer)

    const { d, ...publicKeyJwk } = paradymDraft11.holderPrivateKeyJwk
    const encodedJwk = Buffer.from(JSON.stringify(publicKeyJwk)).toString('base64url')
    const didUrl = `did:jwk:${encodedJwk}#0`

    const { jwt: proofJwt } = await client.createCredentialRequestJwtProof({
      issuerMetadata,
      signer: {
        method: 'did',
        didUrl,
        alg: 'ES256',
      },
      issuedAt: new Date('2024-10-10'),
      credentialConfigurationId: credentialOffer.credential_configuration_ids[0],
      nonce: accessTokenResponse.c_nonce,
    })
    expect(proofJwt).toMatch(
      'eyJhbGciOiJFUzI1NiIsInR5cCI6Im9wZW5pZDR2Y2ktcHJvb2Yrand0Iiwia2lkIjoiZGlkOmp3azpleUpyZEhraU9pSkZReUlzSW5naU9pSkJSVmh3U0hreE1FZG9kRmRvYkZaUVRtMXlSbk5pZVhSZmQwUnpVVjgzY1ROa2FrNXVjbWg2YWw4MElpd2llU0k2SWtSSFZFRkRUMEZCYmxGVVpYQmhSRFF3WjNsSE9WcHNMVzlFYUU5c2RqTlZRbXhVZEhoSlpYSTFaVzhpTENKamNuWWlPaUpRTFRJMU5pSjkjMCJ9.eyJub25jZSI6IjQ2MzI1MzkxNzA5NDg2OTE3MjA3ODMxMCIsImF1ZCI6Imh0dHBzOi8vYWdlbnQucGFyYWR5bS5pZC9vaWQ0dmNpL2RyYWZ0LTExLWlzc3VlciIsImlhdCI6MTcyODUxODQwMH0.'
    )
    expect(decodeJwt({ jwt: proofJwt })).toStrictEqual({
      header: {
        alg: 'ES256',
        kid: 'did:jwk:eyJrdHkiOiJFQyIsIngiOiJBRVhwSHkxMEdodFdobFZQTm1yRnNieXRfd0RzUV83cTNkak5ucmh6al80IiwieSI6IkRHVEFDT0FBblFUZXBhRDQwZ3lHOVpsLW9EaE9sdjNVQmxUdHhJZXI1ZW8iLCJjcnYiOiJQLTI1NiJ9#0',
        typ: 'openid4vci-proof+jwt',
      },
      payload: {
        aud: 'https://agent.paradym.id/oid4vci/draft-11-issuer',
        iat: 1728518400,
        nonce: '463253917094869172078310',
      },
      signature: expect.any(String),
    })

    const { credentialResponse } = await client.retrieveCredentials({
      accessToken: accessTokenResponse.access_token,
      credentialConfigurationId: credentialOffer.credential_configuration_ids[0],
      issuerMetadata,
      proof: {
        proof_type: 'jwt',
        jwt: proofJwt,
      },
    })

    expect(credentialResponse).toStrictEqual(paradymDraft11.credentialResponse)
  })

  test('receive a credential from bdr using draft 13', async () => {
    server.resetHandlers(
      http.get(`${bdrDraft13.credentialOfferObject.credential_issuer}/.well-known/openid-credential-issuer`, () =>
        HttpResponse.json(bdrDraft13.credentialIssuerMetadata)
      ),
      http.get(`${bdrDraft13.credentialOfferObject.credential_issuer}/.well-known/oauth-authorization-server`, () =>
        HttpResponse.json(bdrDraft13.authorizationServerMetadata)
      ),
      http.post(bdrDraft13.authorizationServerMetadata.pushed_authorization_request_endpoint, async ({ request }) => {
        expect(await request.text()).toEqual(
          'response_type=code&client_id=76c7c89b-8799-4bd1-a693-d49948a91b00&redirect_uri=https%3A%2F%2Fexample.com%2Fredirect&scope=pid&code_challenge=MuPA1CQYF9t3udwnb4A_SWig3BArengnQXS2yo8AFew&code_challenge_method=S256'
        )
        return HttpResponse.json(bdrDraft13.pushedAuthorizationResponse)
      }),
      http.post(bdrDraft13.authorizationServerMetadata.token_endpoint, async ({ request }) => {
        expect(
          decodeJwt({
            jwt: request.headers.get('DPoP') as string,
          })
        ).toStrictEqual({
          header: {
            alg: 'ES256',
            typ: 'dpop+jwt',
            jwk: {
              kty: 'EC',
              crv: 'P-256',
              x: 'TSSFq4BS2ylSHJ9Ghh86NbBj0EbqZLD09seVVUETwuw',
              y: 'e758NDPPZf9s6siLNk4h6bQC03eVHP1qTit37OOCIg4',
            },
          },
          payload: {
            iat: expect.any(Number),
            jti: expect.any(String),
            htu: 'https://demo.pid-issuer.bundesdruckerei.de/c/token',
            htm: 'POST',
          },
          signature: expect.any(String),
        })
        expect(await request.text()).toEqual(
          'code=SHSw3KROXXsyvlCSPWBi4b&redirect_uri=https%3A%2F%2Fexample.com%2Fredirect&code_verifier=l-yZMbym56l7IlENP17y-XgKzT6a37ut5n9yXMrh9BpTOt9g77CwCsWheRW0oMA2tL471UZhIr705MdHxRSQvQ&grant_type=authorization_code'
        )
        return HttpResponse.json(bdrDraft13.accessTokenResponse, {
          headers: {
            'DPoP-Nonce': 'nonce-should-be-used',
          },
        })
      }),
      http.post(bdrDraft13.credentialIssuerMetadata.credential_endpoint, async ({ request }) => {
        expect(request.headers.get('Authorization')).toEqual('DPoP yvFUHf7pZBfgHd6pkI1ktc')
        console.log(request.headers.get('DPoP'))
        expect(
          decodeJwt({
            jwt: request.headers.get('DPoP') as string,
          })
        ).toStrictEqual({
          header: {
            alg: 'ES256',
            typ: 'dpop+jwt',
            jwk: {
              kty: 'EC',
              crv: 'P-256',
              x: 'TSSFq4BS2ylSHJ9Ghh86NbBj0EbqZLD09seVVUETwuw',
              y: 'e758NDPPZf9s6siLNk4h6bQC03eVHP1qTit37OOCIg4',
            },
          },
          payload: {
            iat: expect.any(Number),
            jti: expect.any(String),
            htu: 'https://demo.pid-issuer.bundesdruckerei.de/c/credential',
            htm: 'POST',
            nonce: 'nonce-should-be-used',
            ath: 'i5Jbpn1_j8TgO3O4K6Y9D_f9k1lkOPMqa0uCo8nIRd4',
          },
          signature: expect.any(String),
        })
        expect(await request.json()).toEqual({
          format: 'vc+sd-jwt',
          vct: 'https://example.bmi.bund.de/credential/pid/1.0',
          proof: {
            proof_type: 'jwt',
            jwt: expect.any(String),
          },
        })
        return HttpResponse.json(bdrDraft13.credentialResponse)
      })
    )

    const client = new Oid4vciClient({
      callbacks: {
        hash: hashCallback,
        fetch,
        generateRandom,
        signJwt: await getSignJwtCallback([bdrDraft13.holderPrivateKeyJwk, bdrDraft13.dpopPrivateKeyJwk]),
      },
    })

    const credentialOffer = await client.resolveCredentialOffer(bdrDraft13.credentialOffer)
    expect(credentialOffer).toStrictEqual(bdrDraft13.credentialOfferObject)

    const issuerMetadata = await client.resolveIssuerMetadata(credentialOffer.credential_issuer)
    expect(issuerMetadata.credentialIssuer).toStrictEqual(bdrDraft13.credentialIssuerMetadata)
    expect(issuerMetadata.authorizationServers[0]).toStrictEqual(bdrDraft13.authorizationServerMetadata)

    // Use a static value for the tests
    const pkceCodeVerifier = 'l-yZMbym56l7IlENP17y-XgKzT6a37ut5n9yXMrh9BpTOt9g77CwCsWheRW0oMA2tL471UZhIr705MdHxRSQvQ'
    const clientId = '76c7c89b-8799-4bd1-a693-d49948a91b00'
    const redirectUri = 'https://example.com/redirect'

    const { authorizationRequestUrl, pkce, authorizationServer } = await client.createAuthorizationRequestUrl({
      authorizationServer: issuerMetadata.authorizationServers[0].issuer,
      clientId,
      issuerMetadata,
      redirectUri,
      credentialOffer,
      pkceCodeVerifier,
      scope: extractScopesForCredentialConfigurationIds({
        credentialConfigurationIds: credentialOffer.credential_configuration_ids,
        issuerMetadata,
      }).join(' '),
    })

    expect(authorizationServer).toEqual(bdrDraft13.authorizationServerMetadata.issuer)
    expect(authorizationRequestUrl).toEqual(bdrDraft13.authorizationRequestUrl)
    expect(pkce).toStrictEqual({
      codeVerifier: pkceCodeVerifier,
      codeChallenge: 'MuPA1CQYF9t3udwnb4A_SWig3BArengnQXS2yo8AFew',
      codeChallengeMethod: 'S256',
    })

    const { d: d2, ...dpopPublicJwk } = bdrDraft13.dpopPrivateKeyJwk
    const dpopSigner = {
      method: 'jwk',
      alg: 'ES256',
      publicJwk: dpopPublicJwk,
    } as const

    const { accessTokenResponse, dpop } = await client.retrieveAuthorizationCodeAccessToken({
      issuerMetadata,
      authorizationCode: 'SHSw3KROXXsyvlCSPWBi4b',
      authorizationServer,
      pkceCodeVerifier: pkce?.codeVerifier,
      dpop: {
        signer: dpopSigner,
      },
      redirectUri,
    })

    expect(accessTokenResponse).toStrictEqual(bdrDraft13.accessTokenResponse)

    const { d, ...publicKeyJwk } = bdrDraft13.holderPrivateKeyJwk
    const { jwt: proofJwt } = await client.createCredentialRequestJwtProof({
      issuerMetadata,
      signer: {
        method: 'jwk',
        publicJwk: publicKeyJwk,
        alg: 'ES256',
      },
      clientId,
      issuedAt: new Date('2024-10-10'),
      credentialConfigurationId: credentialOffer.credential_configuration_ids[0],
      nonce: accessTokenResponse.c_nonce,
    })

    expect(proofJwt).toMatch(
      'eyJhbGciOiJFUzI1NiIsInR5cCI6Im9wZW5pZDR2Y2ktcHJvb2Yrand0IiwiandrIjp7Imt0eSI6IkVDIiwieCI6IkFFWHBIeTEwR2h0V2hsVlBObXJGc2J5dF93RHNRXzdxM2RqTm5yaHpqXzQiLCJ5IjoiREdUQUNPQUFuUVRlcGFENDBneUc5Wmwtb0RoT2x2M1VCbFR0eEllcjVlbyIsImNydiI6IlAtMjU2In19.eyJub25jZSI6InNqTk1pcXlmbUJlRDFxaW9DVnlxdlMiLCJhdWQiOiJodHRwczovL2RlbW8ucGlkLWlzc3Vlci5idW5kZXNkcnVja2VyZWkuZGUvYyIsImlhdCI6MTcyODUxODQwMCwiaXNzIjoiNzZjN2M4OWItODc5OS00YmQxLWE2OTMtZDQ5OTQ4YTkxYjAwIn0.'
    )
    expect(decodeJwt({ jwt: proofJwt })).toStrictEqual({
      header: {
        alg: 'ES256',
        jwk: publicKeyJwk,
        typ: 'openid4vci-proof+jwt',
      },
      payload: {
        aud: 'https://demo.pid-issuer.bundesdruckerei.de/c',
        iat: 1728518400,
        iss: clientId,
        nonce: 'sjNMiqyfmBeD1qioCVyqvS',
      },
      signature: expect.any(String),
    })

    const { credentialResponse } = await client.retrieveCredentials({
      accessToken: accessTokenResponse.access_token,
      credentialConfigurationId: credentialOffer.credential_configuration_ids[0],
      issuerMetadata,
      dpop: {
        ...dpop,
        signer: dpopSigner,
      },
      proof: {
        proof_type: 'jwt',
        jwt: proofJwt,
      },
    })
    expect(credentialResponse).toStrictEqual(bdrDraft13.credentialResponse)
  })
})
