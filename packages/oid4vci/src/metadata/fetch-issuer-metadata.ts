import {
  type AuthorizationServerMetadata,
  type CallbackContext,
  Oauth2Error,
  fetchAuthorizationServerMetadata,
  vAuthorizationServerMetadata,
} from '@animo-id/oauth2'
import { parseWithErrorHandling } from '@animo-id/oauth2-utils'
import type { Oid4vciDraftVersion } from '../version'
import { fetchCredentialIssuerMetadata } from './credential-issuer/credential-issuer-metadata'
import type { CredentialIssuerMetadata } from './credential-issuer/v-credential-issuer-metadata'

export interface ResolveIssuerMetadataOptions {
  /**
   * Only fetch metadata for authorization servers that are part of this list. This can help if you know beforehand
   * which authorization servers will be used. The list is not validated to ensure all entries are also
   * in the issuer metadata.
   */
  restrictToAuthorizationServers?: string[]

  /**
   * Allow extracting authorization server metadata from the credential issuer metadata. This is added for backwards
   * compatibility with some implementations that did not host a separate authorization server metadata and will be removed
   * in a future version.
   *
   * @default true
   */
  allowAuthorizationMetadataFromCredentialIssuerMetadata?: boolean

  callbackContext: Pick<CallbackContext, 'fetch' | 'verifyJwt' | 'signJwt'>
}

export interface IssuerMetadataResult {
  originalDraftVersion?: Oid4vciDraftVersion
  credentialIssuer: CredentialIssuerMetadata
  authorizationServers: AuthorizationServerMetadata[]
}

export async function resolveIssuerMetadata(
  credentialIssuer: string,
  options: ResolveIssuerMetadataOptions
): Promise<IssuerMetadataResult> {
  const allowAuthorizationMetadataFromCredentialIssuerMetadata =
    options?.allowAuthorizationMetadataFromCredentialIssuerMetadata ?? true

  const credentialIssuerMetadataWithDraftVersion = await fetchCredentialIssuerMetadata(credentialIssuer, {
    callbackContext: options.callbackContext,
  })
  if (!credentialIssuerMetadataWithDraftVersion) {
    throw new Oauth2Error(`Well known credential issuer metadata for issuer '${credentialIssuer}' not found.`)
  }

  const { credentialIssuerMetadata, originalDraftVersion } = credentialIssuerMetadataWithDraftVersion

  // If no authoriation servers are defined, use the credential issuer as the authorization server
  const authorizationServers = credentialIssuerMetadata.authorization_servers ?? [credentialIssuer]

  const authorizationServersMetadata: AuthorizationServerMetadata[] = []
  for (const authorizationServer of authorizationServers) {
    if (
      options?.restrictToAuthorizationServers &&
      !options.restrictToAuthorizationServers.includes(authorizationServer)
    ) {
      continue
    }

    let authorizationServerMetadata = await fetchAuthorizationServerMetadata(
      authorizationServer,
      options.callbackContext.fetch
    )
    if (
      !authorizationServerMetadata &&
      authorizationServer === credentialIssuer &&
      allowAuthorizationMetadataFromCredentialIssuerMetadata
    ) {
      authorizationServerMetadata = parseWithErrorHandling(
        vAuthorizationServerMetadata,
        {
          token_endpoint: credentialIssuerMetadata.token_endpoint,
          issuer: credentialIssuer,
        },
        `Well known authorization server metadata for authorization server '${authorizationServer}' not found, and could also not extract required values from the credential issuer metadata as a fallback.`
      )
    }

    if (!authorizationServerMetadata) {
      throw new Oauth2Error(
        `Well known openid configuration or authorization server metadata for authorization server '${authorizationServer}' not found.`
      )
    }

    authorizationServersMetadata.push(authorizationServerMetadata)
  }

  return {
    originalDraftVersion,
    credentialIssuer: credentialIssuerMetadata,
    authorizationServers: authorizationServersMetadata,
  }
}
