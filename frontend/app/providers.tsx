'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

export function Providers({ children }: { children: React.ReactNode }) {
    // Client ID provided by user
    const clientId = "44087973232-o4g52su90ev53uju0siaflruafh34bng.apps.googleusercontent.com";

    return (
        <GoogleOAuthProvider clientId={clientId}>
            {children}
        </GoogleOAuthProvider>
    );
}
