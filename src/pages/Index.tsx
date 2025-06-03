// src/pages/Index.tsx
import { useEffect, useState } from 'react'; // Import useState
import { useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './Dashboard';

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // State to track authentication status:
  // null = checking, false = not authenticated, true = authenticated
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); 

  useEffect(() => {
    const checkAuth = () => {
      let userString = localStorage.getItem('user');
      let currentIdToken: string | null = null;
      
      try {
        if (userString) {
          const parsedUser = JSON.parse(userString);
          currentIdToken = parsedUser.id_token || null;
        }
      } catch (e) {
        console.error("Failed to parse existing user data from localStorage:", e);
        userString = null; // Treat as if user data is invalid or corrupted
      }

      const params = new URLSearchParams(location.search);
      const idTokenFromUrl = params.get('token');

      if (idTokenFromUrl) {
        // Scenario 1: Token found in URL (e.g., after OAuth callback).
        // Update localStorage with the new token and clean the URL.
        console.log('ID Token found in URL. Updating localStorage...');
        const updatedUser = { ...(userString ? JSON.parse(userString) : {}), id_token: idTokenFromUrl };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setIsAuthenticated(true); // Mark as authenticated
        navigate(location.pathname, { replace: true }); // Clean the URL to remove the token
      } else if (currentIdToken) {
        // Scenario 2: Token already exists in localStorage.
        console.log('ID Token found in localStorage. User is authenticated.');
        setIsAuthenticated(true); // Mark as authenticated
      } else {
        // Scenario 3: No token in URL and no token in localStorage.
        // User is not authenticated, redirect to login.
        console.log('[Index] No user or ID Token found, navigating to /login.');
        setIsAuthenticated(false); // Mark as not authenticated
        navigate('/login');
      }
    };

    // Run the authentication check when the component mounts or dependencies change
    checkAuth();
  }, [navigate, location.search, location.pathname]); // Dependencies: navigate for redirection, location for URL changes

  // Render logic based on authentication status
  if (isAuthenticated === null) {
    // Still checking authentication, show a loading indicator
    return (
      <div className="min-h-screen flex items-center justify-center text-xl text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  if (isAuthenticated) {
    // User is authenticated, render the Dashboard
    return <Dashboard />;
  }

  // If isAuthenticated is false, `navigate('/login')` would have already been called.
  // This `return null` prevents rendering the Dashboard prematurely or incorrectly.
  return null; 
};

export default Index;