import { type CallbackContext, type Jwk, Oauth2Error, fetchWellKnownMetadata } from '@animo-id/oauth2'
import { joinUriParts } from '@animo-id/oauth2-utils'
import { fetchEntityConfiguration } from '@openid-federation/core'
import * as v from 'valibot'
import type { JwtHeader } from '../../../../oauth2/src/common/jwt/v-jwt'
import type { CredentialFormatIdentifier } from '../../formats/credential'
import type { Oid4vciDraftVersion } from '../../version'
import {
  type CredentialConfigurationSupportedFormatSpecific,
  type CredentialConfigurationsSupported,
  type CredentialConfigurationsSupportedWithFormats,
  type CredentialIssuerMetadata,
  allCredentialIssuerMetadataFormatIdentifiers,
  vCredentialIssuerMetadataWithDraftVersion,
} from './v-credential-issuer-metadata'

const wellKnownCredentialIssuerSuffix = '.well-known/openid-credential-issuer'

type FetchCredentialIssuerMetadataOptions = {
  callbackContext: Pick<CallbackContext, 'fetch' | 'verifyJwt' | 'signJwt'>
}

/**
 * @inheritdoc {@link fetchWellKnownMetadata}
 */
export async function fetchCredentialIssuerMetadata(
  credentialIssuer: string,
  options: FetchCredentialIssuerMetadataOptions
): Promise<{ credentialIssuerMetadata: CredentialIssuerMetadata; originalDraftVersion: Oid4vciDraftVersion } | null> {
  let result: v.InferOutput<typeof vCredentialIssuerMetadataWithDraftVersion> | null = null

  const entityConfiguration = await fetchEntityConfiguration({
    entityId: credentialIssuer,
    fetchCallback: options.callbackContext.fetch,
    verifyJwtCallback: async ({ jwt, header, claims, jwk }) => {
      if (!jwk.alg) throw new Oauth2Error('JWK alg is required.')
      if (!header.alg || typeof header.alg !== 'string') throw new Oauth2Error('header alg is required.')

      const { verified } = await options.callbackContext.verifyJwt(
        {
          alg: jwk.alg,
          method: 'jwk',
          publicJwk: jwk as Jwk,
        },
        {
          header: header as JwtHeader,
          payload: claims,
          compact: jwt,
        }
      )
      return verified
    },
  }).catch((error) => {
    // TODO: Not really sure what we want to do with the error. I think most of the times it will be a 404.
    return null
  })

  if (entityConfiguration) {
    const credentialIssuerMetadata = await v.safeParseAsync(
      vCredentialIssuerMetadataWithDraftVersion,
      entityConfiguration.metadata?.openid_provider
    )

    if (credentialIssuerMetadata.success) {
      result = credentialIssuerMetadata.output
    }
  }

  // When the result isn't set yet we continue with the well known credential issuer metadata
  if (!result) {
    const wellKnownMetadataUrl = joinUriParts(credentialIssuer, [wellKnownCredentialIssuerSuffix])
    result = await fetchWellKnownMetadata(
      wellKnownMetadataUrl,
      vCredentialIssuerMetadataWithDraftVersion,
      options.callbackContext.fetch
    )
  }

  // credential issuer param MUST match
  if (result && result.credentialIssuerMetadata.credential_issuer !== credentialIssuer) {
    throw new Oauth2Error(
      `The 'credential_issuer' parameter '${result.credentialIssuerMetadata.credential_issuer}' in the credential issuer metadata does not match the provided credential issuer '${credentialIssuer}'.`
    )
  }

  return result
}

/**
 * Extract credential configuration supported entries where the `format` is known to this
 * library. Should be ran only after verifying the credential issuer metadata structure, so
 * we can be certain that if the `format` matches the other format specific requriements are also met.
 *
 * Validation is done when resolving issuer metadata, or when calling `createIssuerMetadata`.
 */
export function extractKnownCredentialConfigurationSupportedFormats(
  credentialConfigurationsSupported: CredentialConfigurationsSupported
): CredentialConfigurationsSupportedWithFormats {
  return Object.fromEntries(
    Object.entries(credentialConfigurationsSupported).filter(
      (entry): entry is [string, CredentialConfigurationSupportedFormatSpecific] =>
        allCredentialIssuerMetadataFormatIdentifiers.includes(entry[1].format as CredentialFormatIdentifier)
    )
  )
}
