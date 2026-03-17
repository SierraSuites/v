/**
 * QuickBooks OAuth Service
 *
 * Handles OAuth 2.0 authentication flow for QuickBooks API integration
 *
 * Setup Instructions:
 * 1. Register your app at https://developer.intuit.com/
 * 2. Create a new app and get Client ID & Client Secret
 * 3. Add redirect URI: https://yourdomain.com/api/integrations/quickbooks/callback
 * 4. Add environment variables to .env.local:
 *    - QUICKBOOKS_CLIENT_ID=your_client_id
 *    - QUICKBOOKS_CLIENT_SECRET=your_client_secret
 *    - QUICKBOOKS_REDIRECT_URI=https://yourdomain.com/api/integrations/quickbooks/callback
 *    - QUICKBOOKS_ENVIRONMENT=sandbox or production
 */

import OAuthClient from 'intuit-oauth'

let oauthClientInstance: OAuthClient | null = null

/**
 * Get or create QuickBooks OAuth client instance
 */
export function getQuickBooksOAuthClient(): OAuthClient {
  if (!oauthClientInstance) {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI
    const environment = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox'

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        'Missing required QuickBooks OAuth credentials. Please set QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET, and QUICKBOOKS_REDIRECT_URI environment variables.'
      )
    }

    oauthClientInstance = new OAuthClient({
      clientId,
      clientSecret,
      environment: environment as 'sandbox' | 'production',
      redirectUri,
      logging: process.env.NODE_ENV === 'development',
    })
  }

  return oauthClientInstance
}

/**
 * Generate authorization URL for QuickBooks OAuth flow
 *
 * @param state - Random state value for CSRF protection
 * @returns Authorization URL to redirect user to
 */
export function getAuthorizationUrl(state?: string): string {
  const oauthClient = getQuickBooksOAuthClient()

  const authUri = oauthClient.authorizeUri({
    scope: [
      OAuthClient.scopes.Accounting, // Access to accounting data
      OAuthClient.scopes.OpenId,     // Get user info
    ],
    state: state || generateRandomState(),
  })

  return authUri
}

/**
 * Exchange authorization code for access token
 *
 * @param authorizationCode - Code from OAuth callback
 * @returns OAuth token response
 */
export async function getAccessToken(authorizationCode: string) {
  const oauthClient = getQuickBooksOAuthClient()

  try {
    const authResponse = await oauthClient.createToken(authorizationCode)

    return {
      success: true,
      accessToken: authResponse.token.access_token,
      refreshToken: authResponse.token.refresh_token,
      expiresIn: authResponse.token.expires_in,
      realmId: authResponse.token.realmId, // Company ID in QuickBooks
      tokenType: authResponse.token.token_type,
    }
  } catch (error: any) {
    console.error('[QuickBooks OAuth] Token exchange error:', error)
    return {
      success: false,
      error: error.message || 'Failed to exchange authorization code for token',
    }
  }
}

/**
 * Refresh access token using refresh token
 *
 * @param refreshToken - Refresh token from previous auth
 * @returns New access token
 */
export async function refreshAccessToken(refreshToken: string) {
  const oauthClient = getQuickBooksOAuthClient()

  // Set the refresh token
  oauthClient.setToken({
    refresh_token: refreshToken,
  } as any)

  try {
    const authResponse = await oauthClient.refresh()

    return {
      success: true,
      accessToken: authResponse.token.access_token,
      refreshToken: authResponse.token.refresh_token,
      expiresIn: authResponse.token.expires_in,
    }
  } catch (error: any) {
    console.error('[QuickBooks OAuth] Token refresh error:', error)
    return {
      success: false,
      error: error.message || 'Failed to refresh access token',
    }
  }
}

/**
 * Revoke access token (disconnect QuickBooks)
 *
 * @param accessToken - Access token to revoke
 */
export async function revokeToken(accessToken: string) {
  const oauthClient = getQuickBooksOAuthClient()

  oauthClient.setToken({
    access_token: accessToken,
  } as any)

  try {
    await oauthClient.revoke()
    return { success: true }
  } catch (error: any) {
    console.error('[QuickBooks OAuth] Token revoke error:', error)
    return {
      success: false,
      error: error.message || 'Failed to revoke access token',
    }
  }
}

/**
 * Validate if token is still valid
 *
 * @param accessToken - Token to validate
 */
export async function validateToken(accessToken: string): Promise<boolean> {
  const oauthClient = getQuickBooksOAuthClient()

  oauthClient.setToken({
    access_token: accessToken,
  } as any)

  try {
    const isValid = await oauthClient.isAccessTokenValid()
    return isValid
  } catch (error) {
    console.error('[QuickBooks OAuth] Token validation error:', error)
    return false
  }
}

/**
 * Generate a random state value for CSRF protection
 */
function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
}

/**
 * Get company info from QuickBooks
 *
 * @param accessToken - Valid access token
 * @param realmId - QuickBooks company ID
 */
export async function getCompanyInfo(accessToken: string, realmId: string) {
  const oauthClient = getQuickBooksOAuthClient()

  oauthClient.setToken({
    access_token: accessToken,
    realmId,
  } as any)

  try {
    const companyInfo = await oauthClient.makeApiCall({
      url: `https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`,
    })

    return {
      success: true,
      data: companyInfo.json.CompanyInfo,
    }
  } catch (error: any) {
    console.error('[QuickBooks API] Company info error:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch company info',
    }
  }
}
