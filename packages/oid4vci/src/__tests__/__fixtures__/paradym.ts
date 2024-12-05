export const paradymDraft13 = {
  credentialOffer:
    'https://paradym.id/invitation?credential_offer_uri=https%3A%2F%2Fparadym.id%2Finvitation%2Fdraft-13-issuer%2Foffers%2Fb99db8f1-4fa2-4b27-8dc7-ecf81478eb9b%3Fraw%3Dtrue',
  credentialOfferUri:
    'https://paradym.id/invitation/draft-13-issuer/offers/b99db8f1-4fa2-4b27-8dc7-ecf81478eb9b?raw=true',
  credentialOfferObject: {
    grants: {
      'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
        'pre-authorized_code': '1130293840889780123292078',
        user_pin_required: false,
      },
    },
    credential_configuration_ids: ['clvi9a5od00127pap4obzoeuf'],
    credential_issuer: 'https://agent.paradym.id/oid4vci/draft-13-issuer',
  },
  authorizationServerMetadata: null,
  credentialIssuerMetadata: {
    credential_issuer: 'https://agent.paradym.id/oid4vci/draft-13-issuer',
    token_endpoint: 'https://agent.paradym.id/oid4vci/draft-13-issuer/token',
    credential_endpoint: 'https://agent.paradym.id/oid4vci/draft-13-issuer/credential',
    credentials_supported: [
      {
        format: 'vc+sd-jwt',
        vct: 'https://metadata.paradym.id/types/iuoQGyxlww-ParadymContributor',
        id: 'clv2gbawu000tfkrk5l067h1h',
        cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
        cryptographic_suites_supported: ['EdDSA', 'ES256'],
        display: [
          {
            name: 'Paradym Contributor',
            description: 'Contributed to the Paradym Release',
            background_color: '#5535ed',
            background_image: {},
            text_color: '#ffffff',
          },
        ],
      },
      {
        format: 'vc+sd-jwt',
        vct: 'https://metadata.paradym.id/types/6fTEgFULv2-EmployeeBadge',
        id: 'clvi9a5od00127pap4obzoeuf',
        cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
        cryptographic_suites_supported: ['EdDSA', 'ES256'],
        display: [
          {
            name: 'Employee Badge',
            description: 'Credential for employee badge',
            background_color: '#000000',
            background_image: { url: 'https://github.com/animo.png' },
            text_color: '#ffffff',
          },
        ],
      },
      {
        format: 'vc+sd-jwt',
        vct: 'https://metadata.paradym.id/types/ULaVABcapZ-Heyo',
        id: 'clx4z0auo00a6f0sibkutdqor',
        cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
        cryptographic_suites_supported: ['EdDSA', 'ES256'],
        display: [
          {
            name: 'Direct issuance revocation',
            background_color: '#000000',
            background_image: {},
            text_color: '#ffffff',
          },
        ],
      },
    ],
    credential_configurations_supported: {
      clv2gbawu000tfkrk5l067h1h: {
        cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
        credential_signing_alg_values_supported: ['EdDSA', 'ES256'],
        proof_types_supported: { jwt: { proof_signing_alg_values_supported: ['EdDSA', 'ES256'] } },
        display: [
          {
            name: 'Paradym Contributor',
            description: 'Contributed to the Paradym Release',
            background_color: '#5535ed',
            background_image: {},
            text_color: '#ffffff',
          },
        ],
        format: 'vc+sd-jwt',
        vct: 'https://metadata.paradym.id/types/iuoQGyxlww-ParadymContributor',
      },
      clvi9a5od00127pap4obzoeuf: {
        cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
        credential_signing_alg_values_supported: ['EdDSA', 'ES256'],
        proof_types_supported: { jwt: { proof_signing_alg_values_supported: ['EdDSA', 'ES256'] } },
        display: [
          {
            name: 'Employee Badge',
            description: 'Credential for employee badge',
            background_color: '#000000',
            background_image: { url: 'https://github.com/animo.png' },
            text_color: '#ffffff',
          },
        ],
        format: 'vc+sd-jwt',
        vct: 'https://metadata.paradym.id/types/6fTEgFULv2-EmployeeBadge',
      },
      clx4z0auo00a6f0sibkutdqor: {
        cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
        credential_signing_alg_values_supported: ['EdDSA', 'ES256'],
        proof_types_supported: { jwt: { proof_signing_alg_values_supported: ['EdDSA', 'ES256'] } },
        display: [
          {
            name: 'Direct issuance revocation',
            background_color: '#000000',
            background_image: {},
            text_color: '#ffffff',
          },
        ],
        format: 'vc+sd-jwt',
        vct: 'https://metadata.paradym.id/types/ULaVABcapZ-Heyo',
      },
    },
    display: [{ name: 'Animo', logo: { url: 'https://github.com/animo.png', alt_text: 'Logo of Animo Solutions' } }],
  },
  accessTokenResponse: {
    access_token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJFZERTQSIsImp3ayI6eyJrdHkiOiJPS1AiLCJjcnYiOiJFZDI1NTE5IiwieCI6IjhXWGU4UFBEVTRrTnpIbjJuZ0FTUmFsUmxiZHF6NEJjYkU3X0RTUTN0aUkifX0.eyJwcmVBdXRob3JpemVkQ29kZSI6IjExMzAyOTM4NDA4ODk3ODAxMjMyOTIwNzgiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiaXNzIjoiaHR0cHM6Ly9hZ2VudC5wYXJhZHltLmlkL29pZDR2Y2kvOWI2ZGY1YmMtNTk2NS00YWVjLWEzOWEtMDNjYjNiMjc4NmI1IiwiZXhwIjoxNzI5NTY3ODk2LCJpYXQiOjE3Mjk1Njc3MTZ9.iBeLzXv7Z6kwGpgrT-5XoCyWOkl4FMDixVMqPbdSkLYq8eqU-iJWSWPsoqGnNhZ8B2H6zaEYKpxbZhdvSauSBg',
    token_type: 'bearer',
    expires_in: 180,
    c_nonce: '463253917094869172078310',
    c_nonce_expires_in: 300,
    authorization_pending: false,
  },
  credentialResponse: {
    credential:
      'eyJ0eXAiOiJ2YytzZC1qd3QiLCJhbGciOiJFZERTQSIsImtpZCI6IiN6Nk1rdWFiek4xdzRxcnlINENMY1pRSmllaEpRd3VpM3V3RVloSjEzd01qWG5RTnQifQ.eyJkZXBhcnRtZW50IjoiU3RyaW5nIHZhbHVlIiwidmN0IjoiaHR0cHM6Ly9tZXRhZGF0YS5wYXJhZHltLmlkL3R5cGVzLzZmVEVnRlVMdjItRW1wbG95ZWVCYWRnZSIsImNuZiI6eyJraWQiOiJkaWQ6andrOmV5SnJkSGtpT2lKRlF5SXNJbmdpT2lKQlJWaHdTSGt4TUVkb2RGZG9iRlpRVG0xeVJuTmllWFJmZDBSelVWODNjVE5rYWs1dWNtaDZhbDgwSWl3aWVTSTZJa1JIVkVGRFQwRkJibEZVWlhCaFJEUXdaM2xIT1Zwc0xXOUVhRTlzZGpOVlFteFVkSGhKWlhJMVpXOGlMQ0pqY25ZaU9pSlFMVEkxTmlKOSMwIn0sImlzcyI6ImRpZDp3ZWI6bWV0YWRhdGEucGFyYWR5bS5pZDowYzIwNzI3Ny02NjU2LTQ2MzItOWQyOC03MGYzNGRkZTllYTIiLCJpYXQiOjE3Mjk1Njc3MTcsIl9zZCI6WyJHY2NVSjNGdW1pb3I0bDdqZnpXSmFvUjBTSzNaQU5penQ4ZW1HOTBVLWQ0IiwiVWhCUEp5VWdmTFFnX1JUUnJLM2xNN25ldWhZT3JlYVNBNTlVNTJQUnNZUSIsInYtTHhvdDhWczBzWi1VMGRZZ0dZMFppem9BYVc4eWt3NC1kaVhDODhIeEkiLCJ2Y1pwZW5nUkhsV2hEUUhhczVvOW1TNUM3VDRFUU92ekVWcC05MHF2OHVVIl0sIl9zZF9hbGciOiJzaGEtMjU2In0.sceont7otHdLLwAMNQkkppakbZiX0YVWgxTejugsZUkaOFtIYVM8pNLZTs-Oi_AIRvwIZ6uuuMK8TOmp6QSfAg~WyI2NDU1NTI0ODUwOTEwNzMzMDk3MzI1NDUiLCJpc19hZG1pbiIsdHJ1ZV0~WyIxMDc0NzQzNzg3OTY1NzI0ODkxNDkwMDciLCJsYXN0X25hbWUiLCJTdHJpbmcgdmFsdWUiXQ~WyI2OTg2MDU4NTY2NDc3MjQwNTE0MTI3MTMiLCJmaXJzdF9uYW1lIiwiU3RyaW5nIHZhbHVlIl0~WyIyODIyODI0Nzg0ODQ4MTYxNjA4NDM0NTkiLCJlbXBsb3llZV9pZCIsIlN0cmluZyB2YWx1ZSJd~',
    c_nonce: '1f476b83-00fc-44e6-8cfa-c52c5df12d08',
    c_nonce_expires_in: 300,
  },
  holderPrivateKeyJwk: {
    kty: 'EC',
    x: 'AEXpHy10GhtWhlVPNmrFsbyt_wDsQ_7q3djNnrhzj_4',
    y: 'DGTACOAAnQTepaD40gyG9Zl-oDhOlv3UBlTtxIer5eo',
    crv: 'P-256',
    d: 'C75pQj72AAl6SCsBW8AKTKxqLGk2Fw7NutIpWZ-xjvE',
  },
}

export const paradymDraft13Federation = {
  credentialOffer:
    'https://paradym.id/invitation?credential_offer_uri=https%3A%2F%2Fparadym.id%2Finvitation%2Fdraft-13-issuer%2Foffers%2Fb99db8f1-4fa2-4b27-8dc7-ecf81478eb9b%3Fraw%3Dtrue',
  credentialOfferUri:
    'https://paradym.id/invitation/draft-13-issuer/offers/b99db8f1-4fa2-4b27-8dc7-ecf81478eb9b?raw=true',
  credentialOfferObject: {
    grants: {
      'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
        'pre-authorized_code': '1130293840889780123292078',
        user_pin_required: false,
      },
    },
    credential_configuration_ids: ['clvi9a5od00127pap4obzoeuf'],
    credential_issuer: 'https://agent.paradym.id/oid4vci/draft-13-issuer',
  },
  authorizationServerMetadata: null,
  credentialIssuerMetadata: {
    credential_issuer: 'https://agent.paradym.id/oid4vci/draft-13-issuer',
    token_endpoint: 'https://agent.paradym.id/oid4vci/draft-13-issuer/token',
    credential_endpoint: 'https://agent.paradym.id/oid4vci/draft-13-issuer/credential',
    credentials_supported: [
      {
        format: 'vc+sd-jwt',
        vct: 'https://metadata.paradym.id/types/iuoQGyxlww-ParadymContributor',
        id: 'clv2gbawu000tfkrk5l067h1h',
        cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
        cryptographic_suites_supported: ['EdDSA', 'ES256'],
        display: [
          {
            name: 'Paradym Contributor',
            description: 'Contributed to the Paradym Release',
            background_color: '#5535ed',
            background_image: {},
            text_color: '#ffffff',
          },
        ],
      },
      {
        format: 'vc+sd-jwt',
        vct: 'https://metadata.paradym.id/types/6fTEgFULv2-EmployeeBadge',
        id: 'clvi9a5od00127pap4obzoeuf',
        cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
        cryptographic_suites_supported: ['EdDSA', 'ES256'],
        display: [
          {
            name: 'Employee Badge',
            description: 'Credential for employee badge',
            background_color: '#000000',
            background_image: { url: 'https://github.com/animo.png' },
            text_color: '#ffffff',
          },
        ],
      },
      {
        format: 'vc+sd-jwt',
        vct: 'https://metadata.paradym.id/types/ULaVABcapZ-Heyo',
        id: 'clx4z0auo00a6f0sibkutdqor',
        cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
        cryptographic_suites_supported: ['EdDSA', 'ES256'],
        display: [
          {
            name: 'Direct issuance revocation',
            background_color: '#000000',
            background_image: {},
            text_color: '#ffffff',
          },
        ],
      },
    ],
    credential_configurations_supported: {
      clv2gbawu000tfkrk5l067h1h: {
        cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
        credential_signing_alg_values_supported: ['EdDSA', 'ES256'],
        proof_types_supported: { jwt: { proof_signing_alg_values_supported: ['EdDSA', 'ES256'] } },
        display: [
          {
            name: 'Paradym Contributor',
            description: 'Contributed to the Paradym Release',
            background_color: '#5535ed',
            background_image: {},
            text_color: '#ffffff',
          },
        ],
        format: 'vc+sd-jwt',
        vct: 'https://metadata.paradym.id/types/iuoQGyxlww-ParadymContributor',
      },
      clvi9a5od00127pap4obzoeuf: {
        cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
        credential_signing_alg_values_supported: ['EdDSA', 'ES256'],
        proof_types_supported: { jwt: { proof_signing_alg_values_supported: ['EdDSA', 'ES256'] } },
        display: [
          {
            name: 'Employee Badge',
            description: 'Credential for employee badge',
            background_color: '#000000',
            background_image: { url: 'https://github.com/animo.png' },
            text_color: '#ffffff',
          },
        ],
        format: 'vc+sd-jwt',
        vct: 'https://metadata.paradym.id/types/6fTEgFULv2-EmployeeBadge',
      },
      clx4z0auo00a6f0sibkutdqor: {
        cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
        credential_signing_alg_values_supported: ['EdDSA', 'ES256'],
        proof_types_supported: { jwt: { proof_signing_alg_values_supported: ['EdDSA', 'ES256'] } },
        display: [
          {
            name: 'Direct issuance revocation',
            background_color: '#000000',
            background_image: {},
            text_color: '#ffffff',
          },
        ],
        format: 'vc+sd-jwt',
        vct: 'https://metadata.paradym.id/types/ULaVABcapZ-Heyo',
      },
    },
    display: [{ name: 'Animo', logo: { url: 'https://github.com/animo.png', alt_text: 'Logo of Animo Solutions' } }],
  },
  federationEntity: {
    organization_name: 'Animo',
    logo_uri: 'https://github.com/animo.png',
    homepage_uri: 'https://animo.id',
    contacts: ['support@animo.id'],
  },
  accessTokenResponse: {
    access_token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJFZERTQSIsImp3ayI6eyJrdHkiOiJPS1AiLCJjcnYiOiJFZDI1NTE5IiwieCI6IjhXWGU4UFBEVTRrTnpIbjJuZ0FTUmFsUmxiZHF6NEJjYkU3X0RTUTN0aUkifX0.eyJwcmVBdXRob3JpemVkQ29kZSI6IjExMzAyOTM4NDA4ODk3ODAxMjMyOTIwNzgiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiaXNzIjoiaHR0cHM6Ly9hZ2VudC5wYXJhZHltLmlkL29pZDR2Y2kvOWI2ZGY1YmMtNTk2NS00YWVjLWEzOWEtMDNjYjNiMjc4NmI1IiwiZXhwIjoxNzI5NTY3ODk2LCJpYXQiOjE3Mjk1Njc3MTZ9.iBeLzXv7Z6kwGpgrT-5XoCyWOkl4FMDixVMqPbdSkLYq8eqU-iJWSWPsoqGnNhZ8B2H6zaEYKpxbZhdvSauSBg',
    token_type: 'bearer',
    expires_in: 180,
    c_nonce: '463253917094869172078310',
    c_nonce_expires_in: 300,
    authorization_pending: false,
  },
  credentialResponse: {
    credential:
      'eyJ0eXAiOiJ2YytzZC1qd3QiLCJhbGciOiJFZERTQSIsImtpZCI6IiN6Nk1rdWFiek4xdzRxcnlINENMY1pRSmllaEpRd3VpM3V3RVloSjEzd01qWG5RTnQifQ.eyJkZXBhcnRtZW50IjoiU3RyaW5nIHZhbHVlIiwidmN0IjoiaHR0cHM6Ly9tZXRhZGF0YS5wYXJhZHltLmlkL3R5cGVzLzZmVEVnRlVMdjItRW1wbG95ZWVCYWRnZSIsImNuZiI6eyJraWQiOiJkaWQ6andrOmV5SnJkSGtpT2lKRlF5SXNJbmdpT2lKQlJWaHdTSGt4TUVkb2RGZG9iRlpRVG0xeVJuTmllWFJmZDBSelVWODNjVE5rYWs1dWNtaDZhbDgwSWl3aWVTSTZJa1JIVkVGRFQwRkJibEZVWlhCaFJEUXdaM2xIT1Zwc0xXOUVhRTlzZGpOVlFteFVkSGhKWlhJMVpXOGlMQ0pqY25ZaU9pSlFMVEkxTmlKOSMwIn0sImlzcyI6ImRpZDp3ZWI6bWV0YWRhdGEucGFyYWR5bS5pZDowYzIwNzI3Ny02NjU2LTQ2MzItOWQyOC03MGYzNGRkZTllYTIiLCJpYXQiOjE3Mjk1Njc3MTcsIl9zZCI6WyJHY2NVSjNGdW1pb3I0bDdqZnpXSmFvUjBTSzNaQU5penQ4ZW1HOTBVLWQ0IiwiVWhCUEp5VWdmTFFnX1JUUnJLM2xNN25ldWhZT3JlYVNBNTlVNTJQUnNZUSIsInYtTHhvdDhWczBzWi1VMGRZZ0dZMFppem9BYVc4eWt3NC1kaVhDODhIeEkiLCJ2Y1pwZW5nUkhsV2hEUUhhczVvOW1TNUM3VDRFUU92ekVWcC05MHF2OHVVIl0sIl9zZF9hbGciOiJzaGEtMjU2In0.sceont7otHdLLwAMNQkkppakbZiX0YVWgxTejugsZUkaOFtIYVM8pNLZTs-Oi_AIRvwIZ6uuuMK8TOmp6QSfAg~WyI2NDU1NTI0ODUwOTEwNzMzMDk3MzI1NDUiLCJpc19hZG1pbiIsdHJ1ZV0~WyIxMDc0NzQzNzg3OTY1NzI0ODkxNDkwMDciLCJsYXN0X25hbWUiLCJTdHJpbmcgdmFsdWUiXQ~WyI2OTg2MDU4NTY2NDc3MjQwNTE0MTI3MTMiLCJmaXJzdF9uYW1lIiwiU3RyaW5nIHZhbHVlIl0~WyIyODIyODI0Nzg0ODQ4MTYxNjA4NDM0NTkiLCJlbXBsb3llZV9pZCIsIlN0cmluZyB2YWx1ZSJd~',
    c_nonce: '1f476b83-00fc-44e6-8cfa-c52c5df12d08',
    c_nonce_expires_in: 300,
  },
  holderPrivateKeyJwk: {
    kty: 'EC',
    x: 'AEXpHy10GhtWhlVPNmrFsbyt_wDsQ_7q3djNnrhzj_4',
    y: 'DGTACOAAnQTepaD40gyG9Zl-oDhOlv3UBlTtxIer5eo',
    crv: 'P-256',
    d: 'C75pQj72AAl6SCsBW8AKTKxqLGk2Fw7NutIpWZ-xjvE',
  },
}

export const paradymDraft11 = {
  credentialOffer:
    'https://paradym.id/invitation?credential_offer_uri=https%3A%2F%2Fparadym.id%2Finvitation%2Fdraft-11-issuer%2Foffers%2Fb99db8f1-4fa2-4b27-8dc7-ecf81478eb9b%3Fraw%3Dtrue',
  credentialOfferUri:
    'https://paradym.id/invitation/draft-11-issuer/offers/b99db8f1-4fa2-4b27-8dc7-ecf81478eb9b?raw=true',
  credentialOfferObject: {
    grants: {
      'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
        'pre-authorized_code': '1130293840889780123292078',
        user_pin_required: true,
      },
    },
    credentials: ['clvi9a5od00127pap4obzoeuf'],
    credential_issuer: 'https://agent.paradym.id/oid4vci/draft-11-issuer',
  },
  authorizationServerMetadata: null,
  credentialIssuerMetadata: {
    credential_issuer: 'https://agent.paradym.id/oid4vci/draft-11-issuer',
    token_endpoint: 'https://agent.paradym.id/oid4vci/draft-11-issuer/token',
    credential_endpoint: 'https://agent.paradym.id/oid4vci/draft-11-issuer/credential',
    credentials_supported: [
      {
        format: 'vc+sd-jwt',
        vct: 'https://metadata.paradym.id/types/iuoQGyxlww-ParadymContributor',
        id: 'clv2gbawu000tfkrk5l067h1h',
        cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
        cryptographic_suites_supported: ['EdDSA', 'ES256'],
        display: [
          {
            name: 'Paradym Contributor',
            description: 'Contributed to the Paradym Release',
            background_color: '#5535ed',
            background_image: {},
            text_color: '#ffffff',
          },
        ],
      },
      {
        format: 'vc+sd-jwt',
        vct: 'https://metadata.paradym.id/types/6fTEgFULv2-EmployeeBadge',
        id: 'clvi9a5od00127pap4obzoeuf',
        cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
        cryptographic_suites_supported: ['EdDSA', 'ES256'],
        display: [
          {
            name: 'Employee Badge',
            description: 'Credential for employee badge',
            background_color: '#000000',
            background_image: { url: 'https://github.com/animo.png' },
            text_color: '#ffffff',
          },
        ],
      },
      {
        format: 'vc+sd-jwt',
        vct: 'https://metadata.paradym.id/types/ULaVABcapZ-Heyo',
        id: 'clx4z0auo00a6f0sibkutdqor',
        cryptographic_binding_methods_supported: ['did:key', 'did:jwk', 'did:web'],
        cryptographic_suites_supported: ['EdDSA', 'ES256'],
        display: [
          {
            name: 'Direct issuance revocation',
            background_color: '#000000',
            background_image: {},
            text_color: '#ffffff',
          },
        ],
      },
    ],
    display: [{ name: 'Animo', logo: { url: 'https://github.com/animo.png', alt_text: 'Logo of Animo Solutions' } }],
  },
  accessTokenResponse: {
    access_token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJFZERTQSIsImp3ayI6eyJrdHkiOiJPS1AiLCJjcnYiOiJFZDI1NTE5IiwieCI6IjhXWGU4UFBEVTRrTnpIbjJuZ0FTUmFsUmxiZHF6NEJjYkU3X0RTUTN0aUkifX0.eyJwcmVBdXRob3JpemVkQ29kZSI6IjExMzAyOTM4NDA4ODk3ODAxMjMyOTIwNzgiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiaXNzIjoiaHR0cHM6Ly9hZ2VudC5wYXJhZHltLmlkL29pZDR2Y2kvOWI2ZGY1YmMtNTk2NS00YWVjLWEzOWEtMDNjYjNiMjc4NmI1IiwiZXhwIjoxNzI5NTY3ODk2LCJpYXQiOjE3Mjk1Njc3MTZ9.iBeLzXv7Z6kwGpgrT-5XoCyWOkl4FMDixVMqPbdSkLYq8eqU-iJWSWPsoqGnNhZ8B2H6zaEYKpxbZhdvSauSBg',
    token_type: 'bearer',
    expires_in: 180,
    c_nonce: '463253917094869172078310',
    c_nonce_expires_in: 300,
    authorization_pending: false,
  },
  credentialResponse: {
    credential:
      'eyJ0eXAiOiJ2YytzZC1qd3QiLCJhbGciOiJFZERTQSIsImtpZCI6IiN6Nk1rdWFiek4xdzRxcnlINENMY1pRSmllaEpRd3VpM3V3RVloSjEzd01qWG5RTnQifQ.eyJkZXBhcnRtZW50IjoiU3RyaW5nIHZhbHVlIiwidmN0IjoiaHR0cHM6Ly9tZXRhZGF0YS5wYXJhZHltLmlkL3R5cGVzLzZmVEVnRlVMdjItRW1wbG95ZWVCYWRnZSIsImNuZiI6eyJraWQiOiJkaWQ6andrOmV5SnJkSGtpT2lKRlF5SXNJbmdpT2lKQlJWaHdTSGt4TUVkb2RGZG9iRlpRVG0xeVJuTmllWFJmZDBSelVWODNjVE5rYWs1dWNtaDZhbDgwSWl3aWVTSTZJa1JIVkVGRFQwRkJibEZVWlhCaFJEUXdaM2xIT1Zwc0xXOUVhRTlzZGpOVlFteFVkSGhKWlhJMVpXOGlMQ0pqY25ZaU9pSlFMVEkxTmlKOSMwIn0sImlzcyI6ImRpZDp3ZWI6bWV0YWRhdGEucGFyYWR5bS5pZDowYzIwNzI3Ny02NjU2LTQ2MzItOWQyOC03MGYzNGRkZTllYTIiLCJpYXQiOjE3Mjk1Njc3MTcsIl9zZCI6WyJHY2NVSjNGdW1pb3I0bDdqZnpXSmFvUjBTSzNaQU5penQ4ZW1HOTBVLWQ0IiwiVWhCUEp5VWdmTFFnX1JUUnJLM2xNN25ldWhZT3JlYVNBNTlVNTJQUnNZUSIsInYtTHhvdDhWczBzWi1VMGRZZ0dZMFppem9BYVc4eWt3NC1kaVhDODhIeEkiLCJ2Y1pwZW5nUkhsV2hEUUhhczVvOW1TNUM3VDRFUU92ekVWcC05MHF2OHVVIl0sIl9zZF9hbGciOiJzaGEtMjU2In0.sceont7otHdLLwAMNQkkppakbZiX0YVWgxTejugsZUkaOFtIYVM8pNLZTs-Oi_AIRvwIZ6uuuMK8TOmp6QSfAg~WyI2NDU1NTI0ODUwOTEwNzMzMDk3MzI1NDUiLCJpc19hZG1pbiIsdHJ1ZV0~WyIxMDc0NzQzNzg3OTY1NzI0ODkxNDkwMDciLCJsYXN0X25hbWUiLCJTdHJpbmcgdmFsdWUiXQ~WyI2OTg2MDU4NTY2NDc3MjQwNTE0MTI3MTMiLCJmaXJzdF9uYW1lIiwiU3RyaW5nIHZhbHVlIl0~WyIyODIyODI0Nzg0ODQ4MTYxNjA4NDM0NTkiLCJlbXBsb3llZV9pZCIsIlN0cmluZyB2YWx1ZSJd~',
    c_nonce: '1f476b83-00fc-44e6-8cfa-c52c5df12d08',
    c_nonce_expires_in: 300,
    format: 'vc+sd-jwt',
  },
  holderPrivateKeyJwk: {
    kty: 'EC',
    x: 'AEXpHy10GhtWhlVPNmrFsbyt_wDsQ_7q3djNnrhzj_4',
    y: 'DGTACOAAnQTepaD40gyG9Zl-oDhOlv3UBlTtxIer5eo',
    crv: 'P-256',
    d: 'C75pQj72AAl6SCsBW8AKTKxqLGk2Fw7NutIpWZ-xjvE',
  },
}
