import { useAccountContext as useAccountContextBase } from '../contexts/AccountContext';
import type { UserDto } from '../api/users';
import type { SSOUserInfo } from '../api/sso-user';

export function useAccountContext() {
  return useAccountContextBase();
}

export function useMainAccount(): { account: UserDto | null; isLoading: boolean } {
  const { mainAccount, isLoading } = useAccountContextBase();
  return { account: mainAccount, isLoading };
}

export function useSSOAccount(): { account: SSOUserInfo | null; isLoading: boolean } {
  const { ssoAccount, isLoading } = useAccountContextBase();
  return { account: ssoAccount, isLoading };
}

export function useCurrentAccount(): { 
  account: UserDto | null; 
  ssoAccount: SSOUserInfo | null;
  isSSO: boolean;
  isLoading: boolean;
} {
  const { mainAccount, ssoAccount, isLoading } = useAccountContextBase();
  
  return {
    account: mainAccount,
    ssoAccount,
    isSSO: ssoAccount !== null,
    isLoading,
  };
}
