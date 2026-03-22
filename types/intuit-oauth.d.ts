/**
 * Type declarations for intuit-oauth library
 */

declare module 'intuit-oauth' {
  interface OAuthClientConfig {
    clientId: string
    clientSecret: string
    environment: 'sandbox' | 'production'
    redirectUri: string
    logging?: boolean
  }

  interface AuthUri {
    scope: string[]
    state?: string
  }

  interface TokenResponse {
    token: {
      access_token: string
      refresh_token: string
      expires_in: number
      realmId: string
      token_type: string
    }
  }

  interface MakeApiCallOptions {
    url: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    headers?: Record<string, string>
    body?: any
  }

  interface ApiResponse {
    json: any
    status: number
    headers: Record<string, string>
  }

  class OAuthClient {
    static scopes: {
      Accounting: string
      Payment: string
      Payroll: string
      TimeTracking: string
      Benefits: string
      Profile: string
      Email: string
      Phone: string
      Address: string
      OpenId: string
    }

    constructor(config: OAuthClientConfig)

    authorizeUri(authUri: AuthUri): string
    createToken(authorizationCode: string): Promise<TokenResponse>
    refresh(): Promise<TokenResponse>
    revoke(): Promise<void>
    isAccessTokenValid(): Promise<boolean>
    setToken(token: Partial<TokenResponse['token']>): void
    makeApiCall(options: MakeApiCallOptions): Promise<ApiResponse>
  }

  export = OAuthClient
}
