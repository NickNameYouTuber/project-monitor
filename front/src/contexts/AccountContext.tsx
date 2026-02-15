import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { UserDto } from '../api/users';
import type { SSOUserInfo } from '../api/sso-user';
import { getCurrentUser, updateCurrentUser } from '../api/users';
import { getCurrentSSOInfo } from '../api/sso-user';
import { useAppContext } from './AppContext';
import { getAccessToken } from '../api/client';

interface AccountContextType {
  mainAccount: UserDto | null;
  ssoAccount: SSOUserInfo | null;
  isLoading: boolean;
  setMainAccount: (account: UserDto | null) => void;
  updateMainAccount: (payload: { username?: string; displayName?: string }) => Promise<void>;
  refreshSSOAccount: () => Promise<void>;
  refreshMainAccount: () => Promise<void>;
  clearAccounts: () => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const STORAGE_KEY = 'mainAccount';

function loadAccountFromStorage(): UserDto | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load account from storage:', error);
  }
  return null;
}

function saveAccountToStorage(account: UserDto | null) {
  try {
    if (account) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error('Failed to save account to storage:', error);
  }
}

interface AccountProviderProps {
  children: ReactNode;
}

export function AccountProvider({ children }: AccountProviderProps) {
  const { currentOrganization, organizationId } = useAppContext();
  const [mainAccount, setMainAccountState] = useState<UserDto | null>(loadAccountFromStorage());
  const [ssoAccount, setSsoAccount] = useState<SSOUserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setMainAccount = useCallback((account: UserDto | null) => {
    setMainAccountState(account);
    saveAccountToStorage(account);
  }, []);

  const refreshMainAccount = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setMainAccount(null);
      saveAccountToStorage(null);
      return;
    }
    
    try {
      const account = await getCurrentUser();
      setMainAccount(account);
    } catch (error: any) {
      console.error('Failed to refresh main account:', error);
      if (error?.response?.status === 401) {
        setMainAccount(null);
        saveAccountToStorage(null);
        setSsoAccount(null);
      } else {
        setMainAccount(null);
      }
    }
  }, [setMainAccount]);

  const refreshSSOAccount = useCallback(async () => {
    if (!organizationId || !getAccessToken() || !currentOrganization?.sso_enabled) {
      setSsoAccount(null);
      return;
    }

    try {
      const ssoInfo = await getCurrentSSOInfo(organizationId);
      setSsoAccount(ssoInfo);
    } catch (error) {
      console.error('Failed to refresh SSO account:', error);
      setSsoAccount(null);
    }
  }, [organizationId, currentOrganization?.sso_enabled]);

  const clearAccounts = useCallback(() => {
    setMainAccountState(null);
    setSsoAccount(null);
    saveAccountToStorage(null);
  }, []);

  const updateMainAccount = useCallback(async (payload: { username?: string; displayName?: string }) => {
    try {
      const updated = await updateCurrentUser(payload);
      setMainAccount(updated);
    } catch (error) {
      console.error('Failed to update main account:', error);
      throw error;
    }
  }, [setMainAccount]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token' && !e.newValue) {
        setMainAccountState(null);
        saveAccountToStorage(null);
        setSsoAccount(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const loadMainAccount = async () => {
      const token = getAccessToken();
      if (!token) {
        setMainAccountState(null);
        saveAccountToStorage(null);
        setSsoAccount(null);
        setIsLoading(false);
        return;
      }

      const cached = loadAccountFromStorage();
      if (cached) {
        setMainAccountState(cached);
        setIsLoading(false);
      }

      try {
        const account = await getCurrentUser();
        setMainAccount(account);
      } catch (error: any) {
        console.error('Failed to load main account:', error);
        if (error?.response?.status === 401) {
          setMainAccount(null);
          saveAccountToStorage(null);
          setSsoAccount(null);
        } else if (!cached) {
          setMainAccount(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadMainAccount();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [setMainAccount]);

  useEffect(() => {
    refreshSSOAccount();
  }, [refreshSSOAccount]);

  const value: AccountContextType = {
    mainAccount,
    ssoAccount,
    isLoading,
    setMainAccount,
    updateMainAccount,
    refreshSSOAccount,
    refreshMainAccount,
    clearAccounts,
  };

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccountContext() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccountContext must be used within AccountProvider');
  }
  return context;
}
