import {
  HashAlgorithm,
  type Jwk,
  calculateJwkThumbprint,
  decodeJwt,
  preAuthorizedCodeGrantIdentifier,
} from '@animo-id/oauth2'
import { decodeBase64, encodeToUtf8String, parseWithErrorHandling } from '@animo-id/oauth2-utils'
import { createEntityConfiguration } from '@openid-federation/core'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import { vAuthorizationChallengeRequest } from '../../../oauth2/src/authorization-challenge/v-authorization-challenge'
import { callbacks, getSignJwtCallback, parseXwwwFormUrlEncoded } from '../../../oauth2/tests/util'
import { AuthorizationFlow, Oid4vciClient } from '../Oid4vciClient'
import { extractScopesForCredentialConfigurationIds } from '../metadata/credential-issuer/credential-configurations'
import { bdrDraft13 } from './__fixtures__/bdr'
import { paradymDraft11, paradymDraft13, paradymDraft13Federation } from './__fixtures__/paradym'
import { presentationDuringIssuance } from './__fixtures__/presentationDuringIssuance'

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
      http.get(`${paradymDraft13.credentialOfferObject.credential_issuer}/.well-known/openid-federation`, () =>
        HttpResponse.text(undefined, { status: 404 })
      ),
      http.get(`${paradymDraft13.credentialOfferObject.credential_issuer}/.well-known/openid-credential-issuer`, () =>
        HttpResponse.json(paradymDraft13.credentialIssuerMetadata)
      ),
      http.get(`${paradymDraft13.credentialOfferObject.credential_issuer}/.well-known/openid-configuration`, () =>
        HttpResponse.text(undefined, { status: 404 })
      ),
      http.get(`${paradymDraft13.credentialOfferObject.credential_issuer}/.well-known/oauth-authorization-server`, () =>
        HttpResponse.text(undefined, { status: 404 })
      ),
      http.post(paradymDraft13.credentialIssuerMetadata.token_endpoint, async ({ request }) => {
        expect(parseXwwwFormUrlEncoded(await request.text())).toEqual({
          'pre-authorized_code': '1130293840889780123292078',
          grant_type: preAuthorizedCodeGrantIdentifier,
          resource: credentialOffer.credential_issuer,
        })

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
        ...callbacks,
        fetch,
        signJwt: getSignJwtCallback([paradymDraft13.holderPrivateKeyJwk]),
      },
    })

    const credentialOffer = await client.resolveCredentialOffer(paradymDraft13.credentialOffer)
    expect(credentialOffer).toStrictEqual(paradymDraft13.credentialOfferObject)

    const issuerMetadata = await client.resolveIssuerMetadata(credentialOffer.credential_issuer)
    expect(issuerMetadata.credentialIssuer).toStrictEqual(paradymDraft13.credentialIssuerMetadata)

    const { accessTokenResponse, authorizationServer } = await client.retrievePreAuthorizedCodeAccessTokenFromOffer({
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
      'eyJhbGciOiJFUzI1NiIsInR5cCI6Im9wZW5pZDR2Y2ktcHJvb2Yrand0Iiwia2lkIjoiZGlkOmp3azpleUpyZEhraU9pSkZReUlzSW5naU9pSkJSVmh3U0hreE1FZG9kRmRvYkZaUVRtMXlSbk5pZVhSZmQwUnpVVjgzY1ROa2FrNXVjbWg2YWw4MElpd2llU0k2SWtSSFZFRkRUMEZCYmxGVVpYQmhSRFF3WjNsSE9WcHNMVzlFYUU5c2RqTlZRbXhVZEhoSlpYSTFaVzhpTENKamNuWWlPaUpRTFRJMU5pSjkjMCJ9.eyJhdWQiOiJodHRwczovL2FnZW50LnBhcmFkeW0uaWQvb2lkNHZjaS9kcmFmdC0xMy1pc3N1ZXIiLCJpYXQiOjE3Mjg1MTg0MDAsIm5vbmNlIjoiNDYzMjUzOTE3MDk0ODY5MTcyMDc4MzEwIn0.'
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

    const credentialResponse = await client.retrieveCredentials({
      accessToken: accessTokenResponse.access_token,
      credentialConfigurationId: credentialOffer.credential_configuration_ids[0],
      issuerMetadata,
      proof: {
        proof_type: 'jwt',
        jwt: proofJwt,
      },
    })
    expect(credentialResponse.credentialResponse).toStrictEqual(paradymDraft13.credentialResponse)
  })

  test('receive a credential from Paradym using draft 11', async () => {
    server.resetHandlers(
      http.get(paradymDraft11.credentialOfferUri.replace('?raw=true', ''), () =>
        HttpResponse.json(paradymDraft11.credentialOfferObject)
      ),
      http.get(`${paradymDraft11.credentialOfferObject.credential_issuer}/.well-known/openid-federation`, () =>
        HttpResponse.text(undefined, { status: 404 })
      ),
      http.get(`${paradymDraft11.credentialOfferObject.credential_issuer}/.well-known/openid-credential-issuer`, () =>
        HttpResponse.json(paradymDraft11.credentialIssuerMetadata)
      ),
      http.get(`${paradymDraft11.credentialOfferObject.credential_issuer}/.well-known/openid-configuration`, () =>
        HttpResponse.text(undefined, { status: 404 })
      ),
      http.get(`${paradymDraft11.credentialOfferObject.credential_issuer}/.well-known/oauth-authorization-server`, () =>
        HttpResponse.text(undefined, { status: 404 })
      ),
      http.post(paradymDraft11.credentialIssuerMetadata.token_endpoint, async ({ request }) => {
        expect(parseXwwwFormUrlEncoded(await request.text())).toEqual({
          'pre-authorized_code': '1130293840889780123292078',
          grant_type: preAuthorizedCodeGrantIdentifier,
          tx_code: 'some-tx-code',
          user_pin: 'some-tx-code',
          resource: credentialOffer.credential_issuer,
        })
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
        ...callbacks,
        fetch,
        signJwt: getSignJwtCallback([paradymDraft11.holderPrivateKeyJwk]),
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

    const { accessTokenResponse, authorizationServer } = await client.retrievePreAuthorizedCodeAccessTokenFromOffer({
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
      'eyJhbGciOiJFUzI1NiIsInR5cCI6Im9wZW5pZDR2Y2ktcHJvb2Yrand0Iiwia2lkIjoiZGlkOmp3azpleUpyZEhraU9pSkZReUlzSW5naU9pSkJSVmh3U0hreE1FZG9kRmRvYkZaUVRtMXlSbk5pZVhSZmQwUnpVVjgzY1ROa2FrNXVjbWg2YWw4MElpd2llU0k2SWtSSFZFRkRUMEZCYmxGVVpYQmhSRFF3WjNsSE9WcHNMVzlFYUU5c2RqTlZRbXhVZEhoSlpYSTFaVzhpTENKamNuWWlPaUpRTFRJMU5pSjkjMCJ9.eyJhdWQiOiJodHRwczovL2FnZW50LnBhcmFkeW0uaWQvb2lkNHZjaS9kcmFmdC0xMS1pc3N1ZXIiLCJpYXQiOjE3Mjg1MTg0MDAsIm5vbmNlIjoiNDYzMjUzOTE3MDk0ODY5MTcyMDc4MzEwIn0.'
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

    const credentialResponse = await client.retrieveCredentials({
      accessToken: accessTokenResponse.access_token,
      credentialConfigurationId: credentialOffer.credential_configuration_ids[0],
      issuerMetadata,
      proof: {
        proof_type: 'jwt',
        jwt: proofJwt,
      },
    })
    expect(credentialResponse.credentialResponse).toStrictEqual(paradymDraft11.credentialResponse)
  })

  test('receive a credential from bdr using draft 13', async () => {
    server.resetHandlers(
      http.get(`${bdrDraft13.credentialOfferObject.credential_issuer}/.well-known/openid-credential-issuer`, () =>
        HttpResponse.json(bdrDraft13.credentialIssuerMetadata)
      ),
      http.get(`${bdrDraft13.credentialOfferObject.credential_issuer}/.well-known/openid-federation`, () =>
        HttpResponse.text(undefined, { status: 404 })
      ),
      http.get(`${bdrDraft13.credentialOfferObject.credential_issuer}/.well-known/openid-configuration`, () =>
        HttpResponse.text(undefined, { status: 404 })
      ),
      http.get(`${bdrDraft13.credentialOfferObject.credential_issuer}/.well-known/oauth-authorization-server`, () =>
        HttpResponse.json(bdrDraft13.authorizationServerMetadata)
      ),
      http.post(bdrDraft13.authorizationServerMetadata.pushed_authorization_request_endpoint, async ({ request }) => {
        const parsed = parseXwwwFormUrlEncoded(await request.text())
        expect(parsed).toEqual({
          response_type: 'code',
          resource: issuerMetadata.credentialIssuer.credential_issuer,
          client_id: '76c7c89b-8799-4bd1-a693-d49948a91b00',
          scope: 'pid',
          redirect_uri: 'https://example.com/redirect',
          code_challenge: 'MuPA1CQYF9t3udwnb4A_SWig3BArengnQXS2yo8AFew',
          code_challenge_method: 'S256',
        })
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
        expect(parseXwwwFormUrlEncoded(await request.text())).toEqual({
          code: 'SHSw3KROXXsyvlCSPWBi4b',
          redirect_uri: 'https://example.com/redirect',
          code_verifier: 'l-yZMbym56l7IlENP17y-XgKzT6a37ut5n9yXMrh9BpTOt9g77CwCsWheRW0oMA2tL471UZhIr705MdHxRSQvQ',
          grant_type: 'authorization_code',
          resource: credentialOffer.credential_issuer,
        })

        return HttpResponse.json(bdrDraft13.accessTokenResponse, {
          headers: {
            'DPoP-Nonce': 'nonce-should-be-used',
          },
        })
      }),
      http.post(bdrDraft13.credentialIssuerMetadata.credential_endpoint, async ({ request }) => {
        expect(request.headers.get('Authorization')).toEqual('DPoP yvFUHf7pZBfgHd6pkI1ktc')
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
        ...callbacks,
        fetch,
        signJwt: getSignJwtCallback([bdrDraft13.holderPrivateKeyJwk, bdrDraft13.dpopPrivateKeyJwk]),
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

    const { authorizationRequestUrl, pkce, authorizationServer } = await client.createAuthorizationRequestUrlFromOffer({
      clientId,
      issuerMetadata,
      redirectUri,
      credentialOffer,
      pkceCodeVerifier,
      scope: extractScopesForCredentialConfigurationIds({
        credentialConfigurationIds: credentialOffer.credential_configuration_ids,
        issuerMetadata,
      })?.join(' '),
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

    const { accessTokenResponse, dpop } = await client.retrieveAuthorizationCodeAccessTokenFromOffer({
      issuerMetadata,
      authorizationCode: 'SHSw3KROXXsyvlCSPWBi4b',
      credentialOffer,
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
      'eyJhbGciOiJFUzI1NiIsInR5cCI6Im9wZW5pZDR2Y2ktcHJvb2Yrand0IiwiandrIjp7Imt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4IjoiQUVYcEh5MTBHaHRXaGxWUE5tckZzYnl0X3dEc1FfN3EzZGpObnJoempfNCIsInkiOiJER1RBQ09BQW5RVGVwYUQ0MGd5RzlabC1vRGhPbHYzVUJsVHR4SWVyNWVvIn19.eyJpc3MiOiI3NmM3Yzg5Yi04Nzk5LTRiZDEtYTY5My1kNDk5NDhhOTFiMDAiLCJhdWQiOiJodHRwczovL2RlbW8ucGlkLWlzc3Vlci5idW5kZXNkcnVja2VyZWkuZGUvYyIsImlhdCI6MTcyODUxODQwMCwibm9uY2UiOiJzak5NaXF5Zm1CZUQxcWlvQ1Z5cXZTIn0.'
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

    const credentialResponse = await client.retrieveCredentials({
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
    expect(credentialResponse.credentialResponse).toStrictEqual(bdrDraft13.credentialResponse)
  })

  test('receive a credential using presentation during issuance', async () => {
    server.resetHandlers(
      http.get(
        `${presentationDuringIssuance.credentialOfferObject.credential_issuer}/.well-known/openid-credential-issuer`,
        () => HttpResponse.json(presentationDuringIssuance.credentialIssuerMetadata)
      ),
      http.get(
        `${presentationDuringIssuance.credentialOfferObject.credential_issuer}/.well-known/openid-federation`,
        () => HttpResponse.text(undefined, { status: 404 })
      ),
      http.get(
        `${presentationDuringIssuance.credentialOfferObject.credential_issuer}/.well-known/openid-configuration`,
        () => HttpResponse.text(undefined, { status: 404 })
      ),
      http.get(
        `${presentationDuringIssuance.credentialOfferObject.credential_issuer}/.well-known/oauth-authorization-server`,
        () => HttpResponse.json(presentationDuringIssuance.authorizationServerMetadata)
      ),
      http.post(
        presentationDuringIssuance.authorizationServerMetadata.authorization_challenge_endpoint,
        async ({ request }) => {
          const authorizationChallengeRequest = parseWithErrorHandling(
            vAuthorizationChallengeRequest,
            parseXwwwFormUrlEncoded(await request.text())
          )

          if (
            authorizationChallengeRequest.auth_session &&
            authorizationChallengeRequest.presentation_during_issuance_session
          ) {
            expect(authorizationChallengeRequest).toEqual({
              auth_session: 'auth-session-identifier',
              presentation_during_issuance_session: 'some-session',
            })
            return HttpResponse.json(presentationDuringIssuance.authorizationChallengeResponse)
          }

          expect(authorizationChallengeRequest).toEqual({
            client_id: '76c7c89b-8799-4bd1-a693-d49948a91b00',
            scope: 'pid',
            code_challenge: expect.any(String),
            code_challenge_method: 'S256',
            resource: credentialOffer.credential_issuer,
          })
          return HttpResponse.json(presentationDuringIssuance.authorizationChallengeErrorResponse, { status: 400 })
        }
      ),
      http.post(presentationDuringIssuance.authorizationServerMetadata.token_endpoint, async ({ request }) => {
        expect(parseXwwwFormUrlEncoded(await request.text())).toEqual({
          code: presentationDuringIssuance.authorizationChallengeResponse.authorization_code,
          redirect_uri: 'https://example.com/redirect',
          grant_type: 'authorization_code',
          resource: credentialOffer.credential_issuer,
        })
        return HttpResponse.json(presentationDuringIssuance.accessTokenResponse)
      }),
      http.post(presentationDuringIssuance.credentialIssuerMetadata.credential_endpoint, async ({ request }) => {
        expect(request.headers.get('Authorization')).toEqual('Bearer yvFUHf7pZBfgHd6pkI1ktc')
        expect(await request.json()).toEqual({
          format: 'vc+sd-jwt',
          vct: 'https://example.bmi.bund.de/credential/pid/1.0',
          proof: {
            proof_type: 'jwt',
            jwt: expect.any(String),
          },
        })
        return HttpResponse.json(presentationDuringIssuance.credentialResponse)
      })
    )

    const client = new Oid4vciClient({
      callbacks: {
        ...callbacks,
        fetch,
        signJwt: getSignJwtCallback([presentationDuringIssuance.holderPrivateKeyJwk]),
      },
    })

    const credentialOffer = await client.resolveCredentialOffer(presentationDuringIssuance.credentialOffer)
    expect(credentialOffer).toStrictEqual(presentationDuringIssuance.credentialOfferObject)

    const issuerMetadata = await client.resolveIssuerMetadata(credentialOffer.credential_issuer)
    expect(issuerMetadata.credentialIssuer).toStrictEqual(presentationDuringIssuance.credentialIssuerMetadata)
    expect(issuerMetadata.authorizationServers[0]).toStrictEqual(presentationDuringIssuance.authorizationServerMetadata)

    // Use a static value for the tests
    const pkceCodeVerifier = 'l-yZMbym56l7IlENP17y-XgKzT6a37ut5n9yXMrh9BpTOt9g77CwCsWheRW0oMA2tL471UZhIr705MdHxRSQvQ'
    const clientId = '76c7c89b-8799-4bd1-a693-d49948a91b00'
    const redirectUri = 'https://example.com/redirect'

    const authorization = await client.initiateAuthorization({
      clientId,
      issuerMetadata,
      redirectUri,
      credentialOffer,
      pkceCodeVerifier,
      scope: extractScopesForCredentialConfigurationIds({
        credentialConfigurationIds: credentialOffer.credential_configuration_ids,
        issuerMetadata,
      })?.join(' '),
    })

    if (authorization.authorizationFlow !== AuthorizationFlow.PresentationDuringIssuance) {
      throw new Error('Expected presentation during issuance')
    }
    expect(authorization.oid4vpRequestUrl).toEqual(
      presentationDuringIssuance.authorizationChallengeErrorResponse.presentation
    )
    expect(authorization.authSession).toEqual(
      presentationDuringIssuance.authorizationChallengeErrorResponse.auth_session
    )
    expect(authorization.authorizationServer).toEqual(presentationDuringIssuance.authorizationServerMetadata.issuer)

    const { authorizationChallengeResponse } = await client.retrieveAuthorizationCodeUsingPresentation({
      issuerMetadata,
      authSession: authorization.authSession,
      credentialOffer,
      // out of scope for now, handled by RP
      presentationDuringIssuanceSession: 'some-session',
    })
    expect(authorizationChallengeResponse).toStrictEqual(presentationDuringIssuance.authorizationChallengeResponse)

    const { accessTokenResponse } = await client.retrieveAuthorizationCodeAccessTokenFromOffer({
      issuerMetadata,
      authorizationCode: authorizationChallengeResponse.authorization_code,
      credentialOffer,
      // TOOD: pkce with presentation_during_issuance? I don't think so
      // pkceCodeVerifier: pkce?.codeVerifier,
      redirectUri,
    })
    expect(accessTokenResponse).toStrictEqual(presentationDuringIssuance.accessTokenResponse)

    const { d, ...publicKeyJwk } = presentationDuringIssuance.holderPrivateKeyJwk
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

    expect(decodeJwt({ jwt: proofJwt })).toStrictEqual({
      header: {
        alg: 'ES256',
        jwk: publicKeyJwk,
        typ: 'openid4vci-proof+jwt',
      },
      payload: {
        aud: presentationDuringIssuance.authorizationServerMetadata.issuer,
        iat: 1728518400,
        iss: clientId,
        nonce: 'sjNMiqyfmBeD1qioCVyqvS',
      },
      signature: expect.any(String),
    })

    const credentialResponse = await client.retrieveCredentials({
      accessToken: accessTokenResponse.access_token,
      credentialConfigurationId: credentialOffer.credential_configuration_ids[0],
      issuerMetadata,
      proof: {
        proof_type: 'jwt',
        jwt: proofJwt,
      },
    })
    expect(credentialResponse.credentialResponse).toStrictEqual(presentationDuringIssuance.credentialResponse)
  })

  test('receive a credential from Paradym using federation', async () => {
    const { d, ...publicKeyJwk } = paradymDraft13Federation.holderPrivateKeyJwk
    const jwtSigner = getSignJwtCallback([paradymDraft13Federation.holderPrivateKeyJwk])
    const jwkKid = await calculateJwkThumbprint({
      hashAlgorithm: HashAlgorithm.Sha256,
      hashCallback: callbacks.hash,
      jwk: paradymDraft13Federation.holderPrivateKeyJwk,
    })

    const entityConfigurationJwt = await createEntityConfiguration({
      signJwtCallback: async ({ jwk, toBeSigned }) => {
        const toBeSignedString = encodeToUtf8String(toBeSigned)
        const [header, payload] = toBeSignedString.split('.')

        const headerObject = JSON.parse(encodeToUtf8String(decodeBase64(header)))
        const payloadObject = JSON.parse(encodeToUtf8String(decodeBase64(payload)))

        const signed = await jwtSigner(
          { publicJwk: jwk as Jwk, alg: 'ES256', method: 'jwk' },
          {
            header: headerObject,
            payload: payloadObject,
          }
        )

        const [, , signature] = signed.jwt.split('.')

        return decodeBase64(signature)
      },
      header: {
        kid: jwkKid,
        alg: 'ES256',
        typ: 'entity-statement+jwt',
      },
      claims: {
        exp: new Date(new Date().getTime() + 1000 * 60 * 60 * 24).getTime(),
        iat: new Date().getTime(),
        sub: paradymDraft13Federation.credentialIssuerMetadata.credential_issuer,
        iss: paradymDraft13Federation.credentialIssuerMetadata.credential_issuer,
        jwks: {
          keys: [
            {
              ...publicKeyJwk,
              alg: 'ES256',
              kid: jwkKid,
            },
          ],
        },
        metadata: {
          federation_entity: paradymDraft13Federation.federationEntity,
          openid_provider: {
            ...paradymDraft13Federation.credentialIssuerMetadata,
            client_registration_types_supported: ['automatic'],
          },
        },
      },
    })

    server.resetHandlers(
      http.get(paradymDraft13Federation.credentialOfferUri.replace('?raw=true', ''), () =>
        HttpResponse.json(paradymDraft13Federation.credentialOfferObject)
      ),
      http.get(
        `${paradymDraft13Federation.credentialOfferObject.credential_issuer}/.well-known/openid-federation`,
        () =>
          HttpResponse.text(entityConfigurationJwt, {
            headers: {
              'Content-Type': 'application/entity-statement+jwt',
            },
          })
      ),
      http.get(
        `${paradymDraft13Federation.credentialOfferObject.credential_issuer}/.well-known/openid-credential-issuer`,
        () => HttpResponse.json(paradymDraft13Federation.credentialIssuerMetadata)
      ),
      http.get(
        `${paradymDraft13Federation.credentialOfferObject.credential_issuer}/.well-known/openid-configuration`,
        () => HttpResponse.text(undefined, { status: 404 })
      ),
      http.get(
        `${paradymDraft13Federation.credentialOfferObject.credential_issuer}/.well-known/oauth-authorization-server`,
        () => HttpResponse.text(undefined, { status: 404 })
      ),
      http.post(paradymDraft13Federation.credentialIssuerMetadata.token_endpoint, async ({ request }) => {
        expect(parseXwwwFormUrlEncoded(await request.text())).toEqual({
          'pre-authorized_code': '1130293840889780123292078',
          grant_type: preAuthorizedCodeGrantIdentifier,
          resource: credentialOffer.credential_issuer,
        })

        return HttpResponse.json(paradymDraft13Federation.accessTokenResponse)
      }),
      http.post(paradymDraft13Federation.credentialIssuerMetadata.credential_endpoint, async ({ request }) => {
        expect(await request.json()).toEqual({
          format: 'vc+sd-jwt',
          vct: 'https://metadata.paradym.id/types/6fTEgFULv2-EmployeeBadge',
          proof: {
            proof_type: 'jwt',
            jwt: expect.any(String),
          },
        })
        return HttpResponse.json(paradymDraft13Federation.credentialResponse)
      })
    )

    const client = new Oid4vciClient({
      callbacks: {
        ...callbacks,
        fetch,
        signJwt: jwtSigner,
      },
    })

    const credentialOffer = await client.resolveCredentialOffer(paradymDraft13Federation.credentialOffer)
    expect(credentialOffer).toStrictEqual(paradymDraft13Federation.credentialOfferObject)

    const issuerMetadata = await client.resolveIssuerMetadata(credentialOffer.credential_issuer)
    expect(issuerMetadata.credentialIssuer).toStrictEqual({
      ...paradymDraft13Federation.credentialIssuerMetadata,
      client_registration_types_supported: ['automatic'],
    })

    const { accessTokenResponse, authorizationServer } = await client.retrievePreAuthorizedCodeAccessTokenFromOffer({
      credentialOffer,
      issuerMetadata,
    })
    expect(accessTokenResponse).toStrictEqual(paradymDraft13Federation.accessTokenResponse)
    expect(authorizationServer).toStrictEqual(paradymDraft13Federation.credentialIssuerMetadata.credential_issuer)

    const encodedJwk = Buffer.from(JSON.stringify(publicKeyJwk)).toString('base64url')
    const didUrl = `did:jwk:${encodedJwk}#0`

    // This is the holder side that will create a proof of possession of the private key
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
      'eyJhbGciOiJFUzI1NiIsInR5cCI6Im9wZW5pZDR2Y2ktcHJvb2Yrand0Iiwia2lkIjoiZGlkOmp3azpleUpyZEhraU9pSkZReUlzSW5naU9pSkJSVmh3U0hreE1FZG9kRmRvYkZaUVRtMXlSbk5pZVhSZmQwUnpVVjgzY1ROa2FrNXVjbWg2YWw4MElpd2llU0k2SWtSSFZFRkRUMEZCYmxGVVpYQmhSRFF3WjNsSE9WcHNMVzlFYUU5c2RqTlZRbXhVZEhoSlpYSTFaVzhpTENKamNuWWlPaUpRTFRJMU5pSjkjMCJ9.eyJhdWQiOiJodHRwczovL2FnZW50LnBhcmFkeW0uaWQvb2lkNHZjaS9kcmFmdC0xMy1pc3N1ZXIiLCJpYXQiOjE3Mjg1MTg0MDAsIm5vbmNlIjoiNDYzMjUzOTE3MDk0ODY5MTcyMDc4MzEwIn0.'
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

    const credentialResponse = await client.retrieveCredentials({
      accessToken: accessTokenResponse.access_token,
      credentialConfigurationId: credentialOffer.credential_configuration_ids[0],
      issuerMetadata,
      proof: {
        proof_type: 'jwt',
        jwt: proofJwt,
      },
    })
    expect(credentialResponse.credentialResponse).toStrictEqual(paradymDraft13Federation.credentialResponse)
  })
})
