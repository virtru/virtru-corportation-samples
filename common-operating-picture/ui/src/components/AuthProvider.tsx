import { ReactNode, useEffect, useReducer } from 'react';
import { Login } from '@/pages/Login';
import { crpcClient } from '@/api/connectRpcClient';
import { Context, AuthUser, LoginCredentials, AuthContext } from '@/contexts/AuthContext';

// replace this import to switch between any auth context implementation
import { OidcAuthContext } from '@/contexts/OidcAuthContext';
import { KeycloakAuthContext } from '@/contexts/KeycloakAuthContext';

type AuthState = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  error: string | null;
};

type AuthStateAction = {
  type: 'SIGNIN' | 'SIGNOUT' | 'SET_ENTITLEMENTS';
  payload: {
    user: AuthUser | null;
    error: string | null;
  };
};

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  error: null,
};

const userStorageKey = 'dsp:cop:user';

const authReducer = (state: AuthState = initialState, action: AuthStateAction) => {
  const { user, error } = action.payload;

  switch (action.type) {
    case 'SIGNIN':
      sessionStorage.setItem(userStorageKey, JSON.stringify(user));
      return {
        ...state,
        isAuthenticated: true,
        user,
        error: null,
      };
    case 'SIGNOUT':
      sessionStorage.removeItem(userStorageKey);
      // TODO: invalidate token.
      return {
        isAuthenticated: false,
        user: null,
        error,
      };
    // todo: Temporary action for allowing entitlements to be loaded in the background after sign in.
    case 'SET_ENTITLEMENTS':
      sessionStorage.setItem(userStorageKey, JSON.stringify(user));
      return {
        ...state,
        user,
        error,
      };
    default:
      return state;
  }
};

let AuthContextImpl: AuthContext;

export function AuthProvider({ children }: { children: ReactNode }) {
  const currentUser = sessionStorage.getItem(userStorageKey);
  const [state, dispatch] = useReducer(authReducer, { 
    ...initialState,
    isAuthenticated: !!currentUser,
    user: currentUser ? JSON.parse(currentUser) : null,
  });

  const signIn = async (creds: LoginCredentials) => {
    // TODO: this is a hack for AuthContext implementation
    if (Object.keys(creds).length === 0) {
      AuthContextImpl = KeycloakAuthContext;
    } else {
      AuthContextImpl = OidcAuthContext;
    }
    const user = await AuthContextImpl.signIn(creds);
    dispatch({ type: 'SIGNIN', payload: { user, error: null } });
    /** 
     * todo: Temporarily loads entitlements in the background immediately after sign in without 
     * blocking the UI. This is an attempt to mask the slow request time from the user. 
     * 
     * In the future, there should be initialization steps that happen before the app is fully 
     * loaded and the user is redirected to the dashboard. Additionally, more thought needs to 
     * be given into how the entitlements should be kept in sync on the client/server.
     */
    loadEntitlements(user);
    return user;
  };

  const signOut = async () => {
    await AuthContextImpl.signOut();
    dispatch({ type: 'SIGNOUT', payload: { user: null, error: null } });
  };

  const loadEntitlements = async (user: AuthUser) => {
    try {
      const { entitlements } = await crpcClient.getEntitlements({}, { headers: { 'Authorization': user.accessToken } });
      dispatch({ type: 'SET_ENTITLEMENTS', payload: { user: { ...user, entitlements: Object.keys(entitlements) }, error: null } });
    } catch (err) {
      console.error('error fetching entitlements:', err);
      dispatch({ type: 'SET_ENTITLEMENTS', payload: { user: { ...user, entitlements: [] }, error: 'entitlements fetch error' } });
    }
  };

  /**
   * COP Browser Fetch API interceptor
   * 
   * This interceptor patches existing Fetch API functionality to catch errors thrown by Keycloak
   * when attempting TDF encrypt/decrypt operations with an expired refresh token.
   */
  const fetchInterceptor = () => {
    const { fetch: originalFetch } = window;

    const interceptor = async (...args: Parameters<typeof window.fetch>) => {
      const [url, config] = args;
      const response = await originalFetch(url, config);
      if (response.status === 400 && response.url.endsWith('token')) {
        // Keycloak error response: { error: 'invalid_grant', error_description: 'Token is not active' }
        const body = await response.json();
        if (body.error === 'invalid_grant') {
          dispatch({ type: 'SIGNOUT', payload: { user: null, error: 'Your session has expired. Please sign in again.' } });
        }
      }
      return response;
    };

    return { interceptor, originalFetch };
  };

  useEffect(() => {
    const { interceptor, originalFetch } = fetchInterceptor();
    window.fetch = interceptor;

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <Context.Provider value={{ ...state, signIn, signOut }}>
      {!state.isAuthenticated && <Login />}
      {state.isAuthenticated && children}
    </Context.Provider>
  );
}
