import React, { createContext, useContext, ReactNode } from 'react';
import { 
  ClerkProvider as RealClerkProvider, 
  UserButton as ClerkUserButton, 
  SignInButton as ClerkSignInButton, 
  SignUpButton as ClerkSignUpButton,
  useUser as useClerkUser,
  useAuth as useClerkAuth,
} from '@clerk/react';
import { Shield, User as UserIcon, LogIn, Sparkles } from 'lucide-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
export const isClerkConfigured = !!PUBLISHABLE_KEY && !PUBLISHABLE_KEY.includes('placeholder') && PUBLISHABLE_KEY.startsWith('pk_');

// User profile interface
export interface AppUser {
  id: string;
  fullName: string;
  primaryEmailAddress: { emailAddress: string };
  imageUrl?: string;
  plan: 'pro' | 'inner_circle' | 'guest';
}

export interface AuthState {
  isSignedIn: boolean;
  isLoaded: boolean;
  sessionId: string | null;
  user: AppUser | null;
  getToken: () => Promise<string | null>;
  signOut?: () => Promise<void>;
  isClerkActive: boolean;
}

const MockAuthContext = createContext<AuthState>({
  isSignedIn: true,
  isLoaded: true,
  sessionId: 'dev_mock_session',
  user: {
    id: 'user_aspirant_dev_01',
    fullName: 'Dr. Aspirant (Study Group)',
    primaryEmailAddress: { emailAddress: 'doctor@aspirinlms.org' },
    plan: 'inner_circle',
  },
  getToken: async () => null,
  signOut: async () => {},
  isClerkActive: false,
});

// Clerk Active Wrapper Hook
const ClerkUserBridge: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSignedIn, isLoaded, user } = useClerkUser();
  const { getToken, sessionId, signOut } = useClerkAuth();

  const authState: AuthState = {
    isSignedIn: !!isSignedIn,
    isLoaded: !!isLoaded,
    sessionId: sessionId || null,
    getToken,
    signOut,
    user: user
      ? {
          id: user.id,
          fullName: user.fullName || user.username || user.firstName || 'Dr. Aspirant',
          primaryEmailAddress: { 
            emailAddress: user.primaryEmailAddress?.emailAddress || 'student@aspirinlms.org' 
          },
          imageUrl: user.imageUrl,
          plan: 'inner_circle' as const,
        }
      : null,
    isClerkActive: true,
  };

  return (
    <MockAuthContext.Provider value={authState}>
      {children}
    </MockAuthContext.Provider>
  );
};

// Main Unified Hook
export const useAppUser = (): AuthState => {
  return useContext(MockAuthContext);
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  if (isClerkConfigured && PUBLISHABLE_KEY) {
    return (
      <RealClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        afterSignOutUrl="/"
        appearance={{
          variables: {
            colorPrimary: '#0a0a0a',
            colorBackground: '#fffaf0',
            colorForeground: '#0a0a0a',
            colorInput: '#ffffff',
            colorInputForeground: '#0a0a0a',
            borderRadius: '16px',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
          elements: {
            card: 'border border-[#e5e5e5] shadow-2xl rounded-[24px] bg-[#fffaf0]',
            modalContent: 'rounded-[24px] overflow-hidden',
            formButtonPrimary: 'rounded-[12px] bg-[#0a0a0a] hover:bg-[#222222] text-[#fffaf0] font-medium transition py-2.5',
            headerTitle: 'font-display font-bold text-[#0a0a0a] text-xl',
            headerSubtitle: 'text-[#6a6a6a] text-xs',
            socialButtonsBlockButton: 'rounded-[12px] border border-[#e5e5e5] bg-white hover:bg-[#faf5e8] transition',
          },
        }}
      >
        <ClerkUserBridge>
          {children}
        </ClerkUserBridge>
      </RealClerkProvider>
    );
  }

  // Graceful local dev wrapper when key not provided
  return (
    <MockAuthContext.Provider
      value={{
        isSignedIn: true,
        isLoaded: true,
        sessionId: 'dev_mock_session',
        user: {
          id: 'user_aspirant_dev_01',
          fullName: 'Dr. Aspirant',
          primaryEmailAddress: { emailAddress: 'studygroup@aspirinlms.org' },
          plan: 'inner_circle',
        },
        getToken: async () => null,
        signOut: async () => {},
        isClerkActive: false,
      }}
    >
      {children}
    </MockAuthContext.Provider>
  );
};

// Unified User Avatar & Profile Component
export const UserProfileButton: React.FC = () => {
  const { isSignedIn, isLoaded, user, isClerkActive } = useAppUser();

  if (isClerkActive && !isLoaded) {
    return (
      <div className="w-8 h-8 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] animate-pulse" />
    );
  }

  if (isClerkActive && isSignedIn) {
    return (
      <div className="flex items-center gap-2.5">
        <ClerkUserButton
          appearance={{
            elements: {
              avatarBox: 'w-8 h-8 rounded-full border border-[#e5e5e5] shadow-xs',
            },
          }}
        />
        {user && (
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-[#0a0a0a] leading-tight max-w-[130px] truncate font-display">
              {user.fullName}
            </span>
            <span className="text-[10px] text-[#6a6a6a] font-mono flex items-center gap-1">
              <Shield className="w-2.5 h-2.5 text-[#ff4d8b]" /> Medical Cohort
            </span>
          </div>
        )}
      </div>
    );
  }

  if (isClerkActive && !isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <ClerkSignInButton mode="modal">
          <button 
            type="button"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-[12px] bg-[#0a0a0a] hover:bg-[#1f1f1f] text-[#fffaf0] text-xs font-medium shadow-xs transition cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-[#ffb084]" />
            <span>Sign In</span>
          </button>
        </ClerkSignInButton>
      </div>
    );
  }

  // Mock Profile Badge (when Clerk key is not set)
  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] text-xs text-[#0a0a0a]">
      <div className="w-6 h-6 rounded-full bg-[#0a0a0a] text-[#fffaf0] flex items-center justify-center font-bold text-[10px]">
        DR
      </div>
      <div className="hidden sm:flex flex-col text-left">
        <span className="font-medium text-[#0a0a0a] leading-tight">{user?.fullName}</span>
        <span className="text-[10px] text-[#6a6a6a] flex items-center gap-1 font-mono">
          <Shield className="w-2.5 h-2.5 text-[#ff4d8b]" /> Inner Circle
        </span>
      </div>
    </div>
  );
};
