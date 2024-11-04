import { objectToQueryParams } from '@animo-id/oid4vc-utils'
import {
  type RetrieveAuthorizationCodeAccessTokenOptions,
  type RetrievePreAuthorizedCodeAccessTokenOptions,
  retrieveAuthorizationCodeAccessToken,
  retrievePreAuthorizedCodeAccessToken,
} from './access-token/retrieve-access-token'
import {
  type SendAuthorizationChallengeRequestOptions,
  sendAuthorizationChallengeRequest,
} from './authorization-challenge/authorization-challenge'
import {
  type CreateAuthorizationRequestUrlOptions,
  createAuthorizationRequestUrl,
} from './authorization-request/create-authorization-request'
import type { CallbackContext } from './callbacks'
import { Oauth2ErrorCodes } from './common/v-oauth2-error'
import { Oauth2ClientAuthorizationChallengeError } from './error/Oauth2ClientAuthorizationChallengeError'
import { fetchAuthorizationServerMetadata } from './metadata/authorization-server/authorization-server-metadata'
import type { AuthorizationServerMetadata } from './metadata/authorization-server/v-authorization-server-metadata'
import { createPkce } from './pkce'

export interface Oauth2ClientOptions {
  /**
   * Callbacks required for the oauth2 client
   */
  callbacks: Omit<CallbackContext, 'verifyJwt'>
}

export class Oauth2Client {
  public constructor(private options: Oauth2ClientOptions) {}

  public isDpopSupported(options: { authorizationServerMetadata: AuthorizationServerMetadata }) {
    if (
      !options.authorizationServerMetadata.dpop_signing_alg_values_supported ||
      options.authorizationServerMetadata.dpop_signing_alg_values_supported.length === 0
    ) {
      return {
        supported: false,
      } as const
    }

    return {
      supported: true,
      dpopSigningAlgValuesSupported: options.authorizationServerMetadata.dpop_signing_alg_values_supported,
    } as const
  }

  public async fetchAuthorizationServerMetadata(issuer: string) {
    return fetchAuthorizationServerMetadata(issuer, this.options.callbacks.fetch)
  }

  /**
   * Initiate authorization.
   *
   * It will take the followings steps:
   * - if `authorization_challenge_endpoint` is defined, send an authorization challenge request
   * - if authorization challenge request returns a `redirect_to_web` error code with `request_uri`
   *   then construct the authorization request url based on the `request_uri`
   * - if the `authorization_challenge_endpoint` is not defined, or authorization challenge request reuturns a `redirect_to_web` error code without `request_uri`
   *   then the authorization request url will be constructed as usual (optionally using PAR).
   *
   * @throws {Oauth2ClientAuthorizationChallengeError} in case of an error response. If `error` is
   * `insufficient_authorization` possible extra steps can be taken.
   */
  public async initiateAuthorization(options: Omit<CreateAuthorizationRequestUrlOptions, 'callbacks'>) {
    const pkce = options.authorizationServerMetadata.code_challenge_methods_supported
      ? await createPkce({
          allowedCodeChallengeMethods: options.authorizationServerMetadata.code_challenge_methods_supported,
          callbacks: this.options.callbacks,
          codeVerifier: options.pkceCodeVerifier,
        })
      : undefined

    if (options.authorizationServerMetadata.authorization_challenge_endpoint) {
      try {
        await this.sendAuthorizationChallengeRequest({
          authorizationServerMetadata: options.authorizationServerMetadata,
          additionalRequestPayload: options.additionalRequestPayload,
          clientId: options.clientId,
          pkceCodeVerifier: pkce?.codeVerifier,
          scope: options.scope,
        })
      } catch (error) {
        // In this case we resume with the normal auth flow
        const isRecoverableError =
          error instanceof Oauth2ClientAuthorizationChallengeError &&
          error.errorResponse.error === Oauth2ErrorCodes.RedirectToWeb

        if (!isRecoverableError) throw error

        // If a request_uri was returned we can treat the response as if PAR was used
        if (error.errorResponse.request_uri) {
          const authorizationRequestUrl = `${options.authorizationServerMetadata.authorization_endpoint}?${objectToQueryParams(
            {
              request_uri: error.errorResponse.request_uri,
              client_id: options.clientId,
            }
          )}`

          return {
            authorizationRequestUrl,
            pkce,
          }
        }
      }
    }

    return this.createAuthorizationRequestUrl({
      authorizationServerMetadata: options.authorizationServerMetadata,
      clientId: options.clientId,
      additionalRequestPayload: options.additionalRequestPayload,
      redirectUri: options.redirectUri,
      scope: options.scope,
      pkceCodeVerifier: pkce?.codeVerifier,
    })
  }

  public sendAuthorizationChallengeRequest(options: Omit<SendAuthorizationChallengeRequestOptions, 'callbacks'>) {
    return sendAuthorizationChallengeRequest({
      ...options,
      callbacks: this.options.callbacks,
    })
  }

  public async createAuthorizationRequestUrl(options: Omit<CreateAuthorizationRequestUrlOptions, 'callbacks'>) {
    return createAuthorizationRequestUrl({
      authorizationServerMetadata: options.authorizationServerMetadata,
      clientId: options.clientId,
      additionalRequestPayload: options.additionalRequestPayload,
      redirectUri: options.redirectUri,
      scope: options.scope,
      callbacks: this.options.callbacks,
      pkceCodeVerifier: options.pkceCodeVerifier,
    })
  }

  public async retrievePreAuthorizedCodeAccessToken({
    authorizationServerMetadata,
    preAuthorizedCode,
    additionalRequestPayload,
    txCode,
    dpop,
  }: Omit<RetrievePreAuthorizedCodeAccessTokenOptions, 'callbacks'>) {
    const result = await retrievePreAuthorizedCodeAccessToken({
      authorizationServerMetadata,
      preAuthorizedCode,
      txCode,
      additionalRequestPayload: {
        ...additionalRequestPayload,
        tx_code: txCode,
      },
      callbacks: this.options.callbacks,
      dpop,
    })

    return result
  }

  public async retrieveAuthorizationCodeAccessToken({
    authorizationServerMetadata,
    additionalRequestPayload,
    authorizationCode,
    pkceCodeVerifier,
    redirectUri,
    dpop,
  }: Omit<RetrieveAuthorizationCodeAccessTokenOptions, 'callbacks'>) {
    const result = await retrieveAuthorizationCodeAccessToken({
      authorizationServerMetadata,
      authorizationCode,
      pkceCodeVerifier,
      additionalRequestPayload,
      callbacks: this.options.callbacks,
      dpop,
      redirectUri,
    })

    return result
  }
}
