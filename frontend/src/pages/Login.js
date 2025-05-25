import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { toast } from 'react-hot-toast';

const Login = () => {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginError, setLoginError] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  useEffect(() => {
    console.log('Login - Authentication status:', isAuthenticated);
    console.log('Login - Accounts:', accounts);
    console.log('Login - Current location:', location);
    
    // Check if we're coming back from a redirect
    if (location.hash && location.hash.includes('access_token')) {
      console.log('Login - Detected authentication response in URL hash');
      setProcessing(true);
      
      instance.handleRedirectPromise()
        .then(response => {
          console.log('Login - Redirect response processed:', response);
          if (response) {
            toast.success('Successfully logged in!');
            navigate('/');
          }
        })
        .catch(error => {
          console.error('Login - Error processing redirect:', error);
          setLoginError(`Authentication error: ${error.message}`);
        })
        .finally(() => {
          setProcessing(false);
        });
    }
    
    // If already authenticated, navigate to home
    if (isAuthenticated && accounts.length > 0) {
      console.log('Login - User is authenticated, navigating to home');
      navigate('/');
    }
  }, [isAuthenticated, navigate, accounts, instance, location]);
  
  const handleLogin = () => {
    console.log('Login - Login button clicked');
    console.log('Login - MSAL config:', instance.config);
    setProcessing(true);
    
    try {
      // Use redirect flow
      instance.loginRedirect(loginRequest)
        .catch(error => {
          console.error('Login - Login redirect failed:', error);
          setLoginError(error.message);
          setProcessing(false);
        });
    } catch (error) {
      console.error('Login - Exception during login attempt:', error);
      setLoginError(error.message);
      setProcessing(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Data Entry Application
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in with your Azure AD account to access the application
          </p>
        </div>
        
        {processing ? (
          <div className="flex flex-col items-center justify-center mt-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-gray-600">Processing authentication...</p>
          </div>
        ) : (
          <>
            {loginError && (
              <div className="rounded-md bg-red-50 p-4 mt-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Login Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{loginError}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-8 space-y-6">
              <button
                onClick={handleLogin}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                disabled={processing}
              >
                Sign in with Microsoft
              </button>
              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  After clicking sign in, you'll be redirected to the Microsoft login page.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
