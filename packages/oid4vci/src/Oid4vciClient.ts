import {
  type CallbackContext,
  type CreateAuthorizationRequestUrlOptions,
  type CreatePkceReturn,
  Oauth2Client,
  Oauth2ClientAuthorizationChallengeError,
  Oauth2Error,
  Oauth2ErrorCodes,
  type RequestDpopOptions,
  type RetrieveAuthorizationCodeAccessTokenOptions,
  type RetrievePreAuthorizedCodeAccessTokenOptions,
  authorizationCodeGrantIdentifier,
  getAuthorizationServerMetadataFromList,
  preAuthorizedCodeGrantIdentifier,
} from '@animo-id/oauth2'

import {
  determineAuthorizationServerForCredentialOffer,
  resolveCredentialOffer,
} from './credential-offer/credential-offer'
import type { CredentialOfferObject } from './credential-offer/v-credential-offer'
import { getCredentialRequestFormatPayloadForCredentialConfigurationId } from './credential-request/format-payload'
import {
  type RetrieveCredentialsWithFormatOptions,
  retrieveCredentialsWithFormat,
} from './credential-request/retrieve-credentials'
import { Oid4vciError } from './error/Oid4vciError'
import { Oid4vciRetrieveCredentialsError } from './error/Oid4vciRetrieveCredentialsError'
import { Oid4vciSendNotificationError } from './error/Oid4vciSendNotificationError'
import {
  type CreateCredentialRequestJwtProofOptions,
  createCredentialRequestJwtProof,
} from './formats/proof-type/jwt/jwt-proof-type'
import { extractKnownCredentialConfigurationSupportedFormats } from './metadata/credential-issuer/credential-issuer-metadata'
import type { CredentialIssuerMetadata } from './metadata/credential-issuer/v-credential-issuer-metadata'
import { type IssuerMetadataResult, resolveIssuerMetadata } from './metadata/fetch-issuer-metadata'
import { type RequestNonceOptions, requestNonce } from './nonce/nonce-request'
import { type SendNotifcationOptions, sendNotifcation } from './notification/notification'

export enum AuthorizationFlow {
  Oauth2Redirect = 'Oauth2Redirect',
  PresentationDuringIssuance = 'PresentationDuringIssuance',
}

export interface Oid4vciClientOptions {
  /**
   * Callbacks required for the oid4vc client
   */
  callbacks: Omit<CallbackContext, 'clientAuthentication'>
}

export class Oid4vciClient {
  private oauth2Client: Oauth2Client

  public constructor(private options: Oid4vciClientOptions) {
    this.oauth2Client = new Oauth2Client({
      callbacks: this.options.callbacks,
    })
  }

  public getKnownCredentialConfigurationsSupported(credentialIssuerMetadata: CredentialIssuerMetadata) {
    return extractKnownCredentialConfigurationSupportedFormats(
      credentialIssuerMetadata.credential_configurations_supported
    )
  }

  /**
   * Resolve a credential offer into a credential offer object, handling both
   * 'credential_offer' and 'credential_offer_uri' params.
   */
  public async resolveCredentialOffer(credentialOffer: string): Promise<CredentialOfferObject> {
    return resolveCredentialOffer(credentialOffer, {
      fetch: this.options.callbacks.fetch,
    })
  }

  public async resolveIssuerMetadata(credentialIssuer: string): Promise<IssuerMetadataResult> {
    return resolveIssuerMetadata(credentialIssuer, {
      callbackContext: this.options.callbacks,
    })
  }

  /**
   * Retrieve an authorization code for a presentation during issuance session
   *
   * This can only be called if an authorization challenge was performed before and returned a
   * `presentation` paramater along with an `auth_session`. If the presentation response included
   * an `presentation_during_issuance_session` parameter it MUST be included in this request as well.
   */
  public async retrieveAuthorizationCodeUsingPresentation(options: {
    /**
     * Auth session as returned by `{@link Oid4vciClient.initiateAuthorization}
     */
    authSession: string

    /**
     * Presentation during issuance session, obtained from the RP after submitting
     * openid4vp authorization response
     */
    presentationDuringIssuanceSession?: string

    credentialOffer: CredentialOfferObject
    issuerMetadata: IssuerMetadataResult

    dpop?: RequestDpopOptions
  }) {
    if (!options.credentialOffer.grants?.[authorizationCodeGrantIdentifier]) {
      throw new Oauth2Error(`Provided credential offer does not include the 'authorization_code' grant.`)
    }

    const authorizationCodeGrant = options.credentialOffer.grants[authorizationCodeGrantIdentifier]
    const authorizationServer = determineAuthorizationServerForCredentialOffer({
      issuerMetadata: options.issuerMetadata,
      grantAuthorizationServer: authorizationCodeGrant.authorization_server,
    })

    const authorizationServerMetadata = getAuthorizationServerMetadataFromList(
      options.issuerMetadata.authorizationServers,
      authorizationServer
    )

    const oauth2Client = new Oauth2Client({ callbacks: this.options.callbacks })
    const { authorizationChallengeResponse, dpop } = await oauth2Client.sendAuthorizationChallengeRequest({
      authorizationServerMetadata,
      authSession: options.authSession,
      presentationDuringIssuanceSession: options.presentationDuringIssuanceSession,
      dpop: options.dpop,
    })

    return { authorizationChallengeResponse, dpop }
  }

  /**
   * Initiates authorization for credential issuance. It handles the following cases:
   * - Authorization Challenge
   * - Pushed Authorization Request
   * - Regular Authorization url
   *
   * In case the authorization challenge request returns an error with `insufficient_authorization`
   * with a `presentation` field it means the authorization server expects presentation of credentials
   * before issuance of crednetials. If this is the case, the value in `presentation` should be treated
   * as an openid4vp authorization request and submitted to the verifier. Once the presentation response
   * has been submitted, the RP will respnosd with a `presentation_during_issuance_session` parameter.
   * Together with the `auth_session` parameter returned in this call you can retrieve an `authorization_code`
   * using
   */
  public async initiateAuthorization(
    options: Omit<CreateAuthorizationRequestUrlOptions, 'callbacks' | 'authorizationServerMetadata'> & {
      credentialOffer: CredentialOfferObject
      issuerMetadata: IssuerMetadataResult
    }
  ): Promise<
    // TODO: cleanup these types
    | {
        authorizationFlow: AuthorizationFlow.PresentationDuringIssuance
        oid4vpRequestUrl: string
        authSession: string
        authorizationServer: string
      }
    | {
        authorizationFlow: AuthorizationFlow.Oauth2Redirect
        authorizationRequestUrl: string
        authorizationServer: string
        pkce?: CreatePkceReturn
      }
  > {
    if (!options.credentialOffer.grants?.[authorizationCodeGrantIdentifier]) {
      throw new Oauth2Error(`Provided credential offer does not include the 'authorization_code' grant.`)
    }

    const authorizationCodeGrant = options.credentialOffer.grants[authorizationCodeGrantIdentifier]
    const authorizationServer = determineAuthorizationServerForCredentialOffer({
      issuerMetadata: options.issuerMetadata,
      grantAuthorizationServer: authorizationCodeGrant.authorization_server,
    })

    const authorizationServerMetadata = getAuthorizationServerMetadataFromList(
      options.issuerMetadata.authorizationServers,
      authorizationServer
    )

    const oauth2Client = new Oauth2Client({ callbacks: this.options.callbacks })

    try {
      const result = await oauth2Client.initiateAuthorization({
        clientId: options.clientId,
        pkceCodeVerifier: options.pkceCodeVerifier,
        redirectUri: options.redirectUri,
        scope: options.scope,
        additionalRequestPayload: {
          ...options.additionalRequestPayload,
          issuer_state: options.credentialOffer?.grants?.authorization_code?.issuer_state,
        },
        dpop: options.dpop,
        clientAttestation: options.clientAttestation,
        resource: options.issuerMetadata.credentialIssuer.credential_issuer,
        authorizationServerMetadata,
      })

      return {
        ...result,
        authorizationFlow: AuthorizationFlow.Oauth2Redirect,
        authorizationServer: authorizationServerMetadata.issuer,
      }
    } catch (error) {
      // Authorization server asks us to complete oid4vp request before issuance
      if (
        error instanceof Oauth2ClientAuthorizationChallengeError &&
        error.errorResponse.error === Oauth2ErrorCodes.InsufficientAuthorization &&
        error.errorResponse.presentation
      ) {
        if (!error.errorResponse.auth_session) {
          throw new Oid4vciError(
            `Expected 'auth_session' to be defined with authorization challenge response error '${error.errorResponse.error}' and 'presentation' parameter`
          )
        }
        return {
          authorizationFlow: AuthorizationFlow.PresentationDuringIssuance,
          oid4vpRequestUrl: error.errorResponse.presentation,
          authSession: error.errorResponse.auth_session,
          authorizationServer: authorizationServerMetadata.issuer,
        }
      }

      throw error
    }
  }

  /**
   * Convenience method around {@link Oauth2Client.createAuthorizationRequestUrl}
   * but specifically focused on a credential offer
   */
  public async createAuthorizationRequestUrlFromOffer(
    options: Omit<CreateAuthorizationRequestUrlOptions, 'callbacks' | 'authorizationServerMetadata'> & {
      credentialOffer: CredentialOfferObject
      issuerMetadata: IssuerMetadataResult
    }
  ) {
    if (!options.credentialOffer.grants?.[authorizationCodeGrantIdentifier]) {
      throw new Oauth2Error(`Provided credential offer does not include the 'authorization_code' grant.`)
    }

    const authorizationCodeGrant = options.credentialOffer.grants[authorizationCodeGrantIdentifier]
    const authorizationServer = determineAuthorizationServerForCredentialOffer({
      issuerMetadata: options.issuerMetadata,
      grantAuthorizationServer: authorizationCodeGrant.authorization_server,
    })

    const authorizationServerMetadata = getAuthorizationServerMetadataFromList(
      options.issuerMetadata.authorizationServers,
      authorizationServer
    )

    const { authorizationRequestUrl, pkce, dpop } = await this.oauth2Client.createAuthorizationRequestUrl({
      authorizationServerMetadata,
      clientId: options.clientId,
      additionalRequestPayload: {
        ...options.additionalRequestPayload,
        issuer_state: options.credentialOffer?.grants?.authorization_code?.issuer_state,
      },
      resource: options.issuerMetadata.credentialIssuer.credential_issuer,
      redirectUri: options.redirectUri,
      scope: options.scope,
      pkceCodeVerifier: options.pkceCodeVerifier,
      clientAttestation: options.clientAttestation,
      dpop: options.dpop,
    })

    return {
      authorizationRequestUrl,
      pkce,
      dpop,
      authorizationServer: authorizationServerMetadata.issuer,
    }
  }

  /**
   * Convenience method around {@link Oauth2Client.retrievePreAuthorizedCodeAccessToken}
   * but specifically focused on a credential offer
   */
  public async retrievePreAuthorizedCodeAccessTokenFromOffer({
    credentialOffer,
    issuerMetadata,
    additionalRequestPayload,
    txCode,
    dpop,
    clientAttestation,
  }: Omit<
    RetrievePreAuthorizedCodeAccessTokenOptions,
    'callbacks' | 'authorizationServerMetadata' | 'preAuthorizedCode' | 'resource'
  > & {
    credentialOffer: CredentialOfferObject
    issuerMetadata: IssuerMetadataResult
  }) {
    if (!credentialOffer.grants?.[preAuthorizedCodeGrantIdentifier]) {
      throw new Oauth2Error(`The credential offer does not contain the '${preAuthorizedCodeGrantIdentifier}' grant.`)
    }

    if (credentialOffer.grants[preAuthorizedCodeGrantIdentifier].tx_code && !txCode) {
      // TODO: we could further validate the tx_code, but not sure if that's needed?
      // the server will do that for us as well
      throw new Oauth2Error(
        `Retrieving access token requires a 'tx_code' in the request, but the 'txCode' parameter was not provided.`
      )
    }

    const preAuthorizedCode = credentialOffer.grants[preAuthorizedCodeGrantIdentifier]['pre-authorized_code']
    const authorizationServer = determineAuthorizationServerForCredentialOffer({
      grantAuthorizationServer: credentialOffer.grants[preAuthorizedCodeGrantIdentifier].authorization_server,
      issuerMetadata,
    })

    const authorizationServerMetadata = getAuthorizationServerMetadataFromList(
      issuerMetadata.authorizationServers,
      authorizationServer
    )

    const result = await this.oauth2Client.retrievePreAuthorizedCodeAccessToken({
      authorizationServerMetadata,
      preAuthorizedCode,
      txCode,
      resource: issuerMetadata.credentialIssuer.credential_issuer,
      additionalRequestPayload,
      dpop,
      clientAttestation,
    })

    return {
      ...result,
      authorizationServer,
    }
  }

  /**
   * Convenience method around {@link Oauth2Client.retrieveAuthorizationCodeAccessTokenFrom}
   * but specifically focused on a credential offer
   */
  public async retrieveAuthorizationCodeAccessTokenFromOffer({
    issuerMetadata,
    additionalRequestPayload,
    credentialOffer,
    authorizationCode,
    pkceCodeVerifier,
    redirectUri,
    dpop,
    clientAttestation,
  }: Omit<RetrieveAuthorizationCodeAccessTokenOptions, 'authorizationServerMetadata' | 'callbacks'> & {
    credentialOffer: CredentialOfferObject
    issuerMetadata: IssuerMetadataResult
  }) {
    if (!credentialOffer.grants?.[authorizationCodeGrantIdentifier]) {
      throw new Oauth2Error(`The credential offer does not contain the '${authorizationCodeGrantIdentifier}' grant.`)
    }

    const authorizationServer = determineAuthorizationServerForCredentialOffer({
      grantAuthorizationServer: credentialOffer.grants[authorizationCodeGrantIdentifier].authorization_server,
      issuerMetadata,
    })

    const authorizationServerMetadata = getAuthorizationServerMetadataFromList(
      issuerMetadata.authorizationServers,
      authorizationServer
    )

    const result = await this.oauth2Client.retrieveAuthorizationCodeAccessToken({
      authorizationServerMetadata,
      authorizationCode,
      pkceCodeVerifier,
      additionalRequestPayload,
      dpop,
      clientAttestation,
      redirectUri,
      resource: issuerMetadata.credentialIssuer.credential_issuer,
    })

    return {
      ...result,
      authorizationServer,
    }
  }

  /**
   * Request a nonce to be used in credential request proofs from the `nonce_endpoint`
   *
   * @throws Oid4vciError - if no `nonce_endpoint` is configured in the issuer metadata
   * @thrwos InvalidFetchResponseError - if the nonce endpoint did not return a succesfull response
   * @throws ValidationError - if validating the nonce response failed
   */
  public async requestNonce(options: Pick<RequestNonceOptions, 'issuerMetadata'>) {
    return requestNonce(options)
  }

  /**
   * Creates the jwt proof payload and header to be included in a credential request.
   */
  public async createCredentialRequestJwtProof(
    options: Pick<
      CreateCredentialRequestJwtProofOptions,
      'signer' | 'nonce' | 'issuedAt' | 'clientId' | 'keyAttestationJwt'
    > & {
      issuerMetadata: IssuerMetadataResult
      credentialConfigurationId: string
    }
  ) {
    const credentialConfiguration =
      options.issuerMetadata.credentialIssuer.credential_configurations_supported[options.credentialConfigurationId]
    if (!credentialConfiguration) {
      throw new Oid4vciError(
        `Credential configuration with '${options.credentialConfigurationId}' not found in 'credential_configurations_supported' from credential issuer '${options.issuerMetadata.credentialIssuer.credential_issuer}'`
      )
    }

    if (credentialConfiguration.proof_types_supported) {
      if (!credentialConfiguration.proof_types_supported.jwt) {
        throw new Oid4vciError(
          `Credential configuration with id '${options.credentialConfigurationId}' does not support the 'jwt' proof type.`
        )
      }

      if (
        !credentialConfiguration.proof_types_supported.jwt.proof_signing_alg_values_supported.includes(
          options.signer.alg
        )
      ) {
        throw new Oid4vciError(
          `Credential configuration with id '${options.credentialConfigurationId}' does not support the '${options.signer.alg}' alg for 'jwt' proof type.`
        )
      }

      // TODO: might be beneficial to also decode the key attestation and see if the required level is reached
      if (credentialConfiguration.proof_types_supported.jwt.key_attestations_required && !options.keyAttestationJwt) {
        throw new Oid4vciError(
          `Credential configuration with id '${options.credentialConfigurationId}' requires key attestations for 'jwt' proof type but no 'keyAttestationJwt' was provided`
        )
      }
    }

    const jwt = await createCredentialRequestJwtProof({
      credentialIssuer: options.issuerMetadata.credentialIssuer.credential_issuer,
      signer: options.signer,
      clientId: options.clientId,
      issuedAt: options.issuedAt,
      nonce: options.nonce,
      keyAttestationJwt: options.keyAttestationJwt,
      callbacks: this.options.callbacks,
    })

    return {
      jwt,
    }
  }

  /**
   * @throws Oid4vciRetrieveCredentialsError - if an unsuccesfull response or the respnose couldn't be parsed as credential response
   * @throws ValidationError - if validation of the credential request failed
   * @throws Oid4vciError - if the `credentialConfigurationId` couldn't be found, or if the the format specific request couldn't be constructed
   */
  public async retrieveCredentials({
    issuerMetadata,
    proof,
    proofs,
    credentialConfigurationId,
    additionalRequestPayload,
    accessToken,
    dpop,
  }: Pick<
    RetrieveCredentialsWithFormatOptions,
    'accessToken' | 'additionalRequestPayload' | 'issuerMetadata' | 'proof' | 'proofs' | 'dpop'
  > & { credentialConfigurationId: string }) {
    const formatPayload = getCredentialRequestFormatPayloadForCredentialConfigurationId({
      credentialConfigurationId,
      issuerMetadata,
    })

    const credentialResponse = await retrieveCredentialsWithFormat({
      accessToken,
      formatPayload,
      issuerMetadata,
      additionalRequestPayload,
      proof,
      proofs,
      callbacks: this.options.callbacks,
      dpop,
    })

    if (!credentialResponse.ok) {
      throw new Oid4vciRetrieveCredentialsError(
        `Error retrieving credentials from '${issuerMetadata.credentialIssuer.credential_issuer}'`,
        credentialResponse,
        await credentialResponse.response.clone().text()
      )
    }

    return credentialResponse
  }

  /**
   * @throws Oid4vciSendNotificationError - if an unsuccesfull response
   * @throws ValidationError - if validation of the notification request failed
   */
  public async sendNotification({
    issuerMetadata,
    notification,
    additionalRequestPayload,
    accessToken,
    dpop,
  }: Pick<
    SendNotifcationOptions,
    'accessToken' | 'additionalRequestPayload' | 'issuerMetadata' | 'dpop' | 'notification'
  >) {
    const notificationResponse = await sendNotifcation({
      accessToken,
      issuerMetadata,
      additionalRequestPayload,
      callbacks: this.options.callbacks,
      dpop,
      notification,
    })

    if (!notificationResponse.ok) {
      throw new Oid4vciSendNotificationError(
        `Error sending notification to '${issuerMetadata.credentialIssuer.credential_issuer}'`,
        notificationResponse
      )
    }

    return notificationResponse
  }
}
