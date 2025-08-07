'use client';

import { useEffect, useState } from 'react';

export function useDevLogin() {
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleDevLogin = async () => {
      const sessionToken = localStorage.getItem('dev_login_session_token');
      const originalAdminId = localStorage.getItem('dev_login_original_admin_id');
      
      if (sessionToken && originalAdminId) {
        setIsProcessing(true);
        try {
          // For now, just clear the URL if we're on the dev-login-switch page
          if (typeof window !== 'undefined' && window.location.pathname === '/dev-login-switch') {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('token');
            newUrl.searchParams.delete('userId');
            window.history.replaceState({}, '', newUrl.toString());
          }
        } catch (error) {
          console.error('Failed to handle dev login:', error);
          // Clear invalid session data
          localStorage.removeItem('dev_login_session_token');
          localStorage.removeItem('dev_login_original_admin_id');
          localStorage.removeItem('dev_login_target_user');
        } finally {
          setIsProcessing(false);
        }
      }
    };

    handleDevLogin();
  }, []);

  const clearDevLogin = async () => {
    // Clear localStorage
    localStorage.removeItem('dev_login_session_token');
    localStorage.removeItem('dev_login_original_admin_id');
    localStorage.removeItem('dev_login_target_user');
    
    // Clear metadata flags from current user
    try {
      const currentUserId = localStorage.getItem('dev_login_current_user_id');
      if (currentUserId) {
        await fetch('/api/dev-login-clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId }),
        });
        localStorage.removeItem('dev_login_current_user_id');
      }
    } catch (error) {
      console.error('Failed to clear dev login metadata:', error);
    }
  };

  return { isProcessing, clearDevLogin };
} 