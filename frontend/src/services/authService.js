import { loginRequest } from '../authConfig';

/**
 * Get an access token for the API
 * @param {Object} instance - MSAL instance
 * @param {Object} account - User account
 * @returns {Promise<string>} Access token
 */
export const getAccessToken = async (instance, account) => {
  if (!account) {
    throw new Error('No active account! Verify a user has been signed in.');
  }
  
  try {
    // Get access token silently
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account: account
    });
    
    return response.accessToken;
  } catch (error) {
    // If silent token acquisition fails, try interactive method
    if (error.name === 'InteractionRequiredAuthError') {
      try {
        const response = await instance.acquireTokenRedirect(loginRequest);
        return response.accessToken;
      } catch (err) {
        console.error('Error during interactive token acquisition:', err);
        throw err;
      }
    } else {
      console.error('Error during silent token acquisition:', error);
      throw error;
    }
  }
};
