import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { toast } from 'react-hot-toast';

// Components
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TableView from './pages/TableView';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    console.log('ProtectedRoute - Authentication status:', isAuthenticated);
    console.log('ProtectedRoute - Accounts:', accounts);
    console.log('ProtectedRoute - Current location:', location.pathname);
    
    // Set a timeout to ensure we don't get stuck in a loading state
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, accounts, location]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    console.log('ProtectedRoute - Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('ProtectedRoute - Authenticated, rendering children');
  return children;
};

function App() {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    console.log('App - Authentication status:', isAuthenticated);
    console.log('App - Accounts:', accounts);
    console.log('App - Current location:', location.pathname);
    
    // Handle redirect response if we're coming back from a redirect flow
    if (location.hash && location.hash.includes('access_token')) {
      console.log('App - Detected authentication response in URL hash');
      instance.handleRedirectPromise()
        .then(response => {
          console.log('App - Redirect response processed successfully:', response);
          if (response) {
            toast.success('Successfully logged in!');
            navigate('/');
          }
        })
        .catch(error => {
          console.error('App - Error processing redirect:', error);
          toast.error(`Authentication error: ${error.message}`);
        });
    }
  }, [isAuthenticated, accounts, location, instance, navigate]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/table/:tableName" element={
          <ProtectedRoute>
            <Layout>
              <TableView />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
