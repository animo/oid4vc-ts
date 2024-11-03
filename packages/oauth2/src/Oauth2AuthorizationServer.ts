import { type CreateAccessTokenOptions, createAccessTokenJwt } from './access-token/create-access-token'
import {
  type CreateAccessTokenResponseOptions,
  createAccessTokenResponse,
} from './access-token/create-access-token-response'
import { type ParseAccessTokenRequestOptions, parseAccessTokenRequest } from './access-token/parse-access-token-request'
import {
  type VerifyAuthorizationCodeAccessTokenRequestOptions,
  type VerifyPreAuthorizedCodeAccessTokenRequestOptions,
  verifyAuthorizationCodeAccessTokenRequest,
  verifyPreAuthorizedCodeAccessTokenRequest,
} from './access-token/verify-access-token-request'
import type { CallbackContext } from './callbacks'

export interface Oauth2AuthorizationServerOptions {
  /**
   * Callbacks required for the oauth2 authorization server
   */
  callbacks: CallbackContext
}

export class Oauth2AuthorizationServer {
  public constructor(private options: Oauth2AuthorizationServerOptions) {}

  /**
   * Parse access token request and extract the grant specific properties.
   *
   * If something goes wrong, such as the grant is not supported, missing parameters, etc,
   * it will throw `Oauth2ServerErrorResponseError` containing an error response object
   * that can be returned to the client.
   */
  public parseAccessTokenRequest(options: ParseAccessTokenRequestOptions) {
    return parseAccessTokenRequest(options)
  }

  public verifyPreAuthorizedCodeAccessTokenRequest(
    options: Omit<VerifyPreAuthorizedCodeAccessTokenRequestOptions, 'callbacks'>
  ) {
    return verifyPreAuthorizedCodeAccessTokenRequest({
      ...options,
      callbacks: this.options.callbacks,
    })
  }

  public verifyAuthorizationCodeAccessTokenRequest(
    options: Omit<VerifyAuthorizationCodeAccessTokenRequestOptions, 'callbacks'>
  ) {
    return verifyAuthorizationCodeAccessTokenRequest({
      ...options,
      callbacks: this.options.callbacks,
    })
  }

  /**
   * Create an access token.
   *
   * The `sub` claim can be used to identify the resource owner is subsequent requests.
   * For pre-auth flow this can be the pre-authorized_code but there are no requirements
   * on the value.
   */
  public async createAccessToken(
    options: Pick<
      CreateAccessTokenOptions,
      | 'expiresInSeconds'
      | 'scope'
      | 'clientId'
      | 'audience'
      | 'signer'
      | 'dpopJwk'
      | 'authorizationServer'
      | 'now'
      | 'subject'
    > &
      Pick<CreateAccessTokenResponseOptions, 'cNonce' | 'cNonceExpiresIn'> & {
        additionalAccessTokenPayload?: CreateAccessTokenOptions['additionalPayload']
        additionalAccessTokenResponsePayload?: CreateAccessTokenResponseOptions['additionalPayload']
      }
  ) {
    const { jwt: accessToken } = await createAccessTokenJwt({
      audience: options.audience,
      authorizationServer: options.authorizationServer,
      callbacks: this.options.callbacks,
      expiresInSeconds: options.expiresInSeconds,
      subject: options.subject,
      scope: options.scope,
      clientId: options.clientId,
      signer: options.signer,
      dpopJwk: options.dpopJwk,
      now: options.now,
      additionalPayload: options.additionalAccessTokenPayload,
    })

    return createAccessTokenResponse({
      accessToken,
      callbacks: this.options.callbacks,
      expiresInSeconds: options.expiresInSeconds,
      tokenType: options.dpopJwk ? 'DPoP' : 'Bearer',
      cNonce: options.cNonce,
      cNonceExpiresIn: options.cNonceExpiresIn,
      additionalPayload: options.additionalAccessTokenResponsePayload,
    })
  }
}