// src/pages/Index.tsx
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Import useLocation
import Dashboard from './Dashboard';

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Hook to access URL details

  // Check if user is logged in, otherwise redirect to login
  useEffect(() => {
    let user = localStorage.getItem('user');
    const params = new URLSearchParams(location.search);
    const idToken = params.get('token'); // Get the token from URL query params

    if (idToken) {
      // If token found in URL, update localStorage
      let parsedUser = {};
      if (user) {
        try {
          parsedUser = JSON.parse(user);
        } catch (e) {
          console.error("Failed to parse existing user data from localStorage:", e);
        }
      }
      
      // Add or update the id_token in the user object
      const updatedUser = { ...parsedUser, id_token: idToken };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      user = JSON.stringify(updatedUser); // Update local 'user' variable for immediate use

      // Clean the URL to remove the token
      // This prevents the token from lingering in the address bar or browser history
      navigate(location.pathname, { replace: true });

      console.log('ID Token found in URL and stored in localStorage.');
    }

    if (!user) {
      console.log('[Index] No user or ID Token found, navigating to /login.');
      navigate('/login');
    } else {
      console.log('[Index] User found. Loading Dashboard.');
    }
  }, [navigate, location.search, location.pathname]); // Depend on search and pathname to re-run if URL changes

  return <Dashboard />;
};

export default Index;