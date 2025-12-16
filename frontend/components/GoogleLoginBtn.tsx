'use client';

import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useRouter } from 'next/navigation';

export default function GoogleLoginBtn() {
    const router = useRouter();

    const handleSuccess = async (credentialResponse: CredentialResponse) => {
        if (!credentialResponse.credential) {
            console.error("Google Login Failed: No credential");
            return;
        }

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: credentialResponse.credential })
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.access_token);
                // Redirect to home/dashboard
                router.push('/');
            } else {
                const err = await res.json();
                alert(`Login Failed: ${err.detail}`);
            }
        } catch (error) {
            console.error("Google Auth Error:", error);
            alert("Login failed due to network error.");
        }
    };

    const handleError = () => {
        console.error('Google Login Failed');
        alert('Google Login Failed');
    };

    return (
        <div className="w-full flex justify-center">
            <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleError}
                theme="filled_black"
                shape="pill"
                size="large"
                width="100%"
                text="continue_with"
            />
        </div>
    );
}
