'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const API_URL = process.env.NEXT_PUBLIC_API_URL || `${protocol}//${hostname}:8000`;

        try {
            const res = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Registration failed');
            }

            // Redirect to login on success
            router.push('/login');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <main className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 w-full max-w-md">
                <h1 className="text-2xl font-bold text-white mb-6 text-center">Create Account</h1>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Username</label>
                        <input
                            type="text"
                            className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Email</label>
                        <input
                            type="email"
                            className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded transition-colors"
                    >
                        Sign Up
                    </button>
                </form>

                <div className="mt-4 text-center text-sm text-gray-500">
                    Already have an account? <a href="/login" className="text-emerald-400 hover:underline">Log In</a>
                </div>
            </div>
        </main>
    );
}
