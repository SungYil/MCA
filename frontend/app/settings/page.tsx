'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

    // Profile Form State
    const [profileForm, setProfileForm] = useState({
        experience_level: '',
        primary_goal: '',
        investment_horizon: '',
        risk_tolerance: '',
        preferred_sectors: [] as string[]
    });

    // Password Form State
    const [passwordForm, setPasswordForm] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [passMessage, setPassMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/api/user/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setUser(data);

                // Init profile form
                if (data.investment_profile) {
                    setProfileForm({
                        experience_level: data.investment_profile.experience_level || '',
                        primary_goal: data.investment_profile.primary_goal || '',
                        investment_horizon: data.investment_profile.investment_horizon || '',
                        risk_tolerance: data.risk_tolerance || '',
                        preferred_sectors: data.investment_profile.preferred_sectors || []
                    });
                }
            } else {
                localStorage.removeItem('token');
                router.push('/login');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        try {
            const res = await fetch(`${API_URL}/api/user/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    investment_profile: {
                        experience_level: profileForm.experience_level,
                        primary_goal: profileForm.primary_goal,
                        investment_horizon: profileForm.investment_horizon,
                        preferred_sectors: profileForm.preferred_sectors
                    },
                    risk_tolerance: profileForm.risk_tolerance
                })
            });

            if (res.ok) {
                alert("Profile updated successfully!");
                fetchUserProfile(); // Refresh data
            } else {
                alert("Failed to update profile");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassMessage({ text: '', type: '' });

        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setPassMessage({ text: "New passwords do not match", type: 'error' });
            return;
        }

        const token = localStorage.getItem('token');
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        try {
            const res = await fetch(`${API_URL}/api/user/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    old_password: passwordForm.old_password,
                    new_password: passwordForm.new_password
                })
            });

            const data = await res.json();

            if (res.ok) {
                setPassMessage({ text: "Password changed successfully", type: 'success' });
                setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
            } else {
                setPassMessage({ text: data.detail || "Failed to change password", type: 'error' });
            }
        } catch (error) {
            setPassMessage({ text: "Network error", type: 'error' });
        }
    };

    const toggleSector = (sector: string) => {
        setProfileForm(prev => {
            const sectors = prev.preferred_sectors.includes(sector)
                ? prev.preferred_sectors.filter(s => s !== sector)
                : [...prev.preferred_sectors, sector];
            return { ...prev, preferred_sectors: sectors };
        });
    };

    if (loading) return <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-[#050505] text-gray-200 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-white">⚙️ Settings</h1>
                    <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white">
                        ← Back to Dashboard
                    </button>
                </div>

                <div className="flex items-center gap-6 border-b border-gray-800 mb-8">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`pb-4 px-2 font-medium transition-colors ${activeTab === 'profile' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Investment Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`pb-4 px-2 font-medium transition-colors ${activeTab === 'security' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Security
                    </button>
                </div>

                {activeTab === 'profile' && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl animate-fade-in">
                        <h2 className="text-xl font-bold text-white mb-6">Edit Investment Profile</h2>
                        <form onSubmit={handleProfileUpdate} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Experience Level</label>
                                    <select
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={profileForm.experience_level}
                                        onChange={(e) => setProfileForm({ ...profileForm, experience_level: e.target.value })}
                                    >
                                        <option value="">Select Level</option>
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Expert">Expert</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Primary Goal</label>
                                    <select
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={profileForm.primary_goal}
                                        onChange={(e) => setProfileForm({ ...profileForm, primary_goal: e.target.value })}
                                    >
                                        <option value="">Select Goal</option>
                                        <option value="Growth">Growth</option>
                                        <option value="Income">Income</option>
                                        <option value="balanced">Balanced</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Time Horizon</label>
                                    <select
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={profileForm.investment_horizon}
                                        onChange={(e) => setProfileForm({ ...profileForm, investment_horizon: e.target.value })}
                                    >
                                        <option value="">Select Horizon</option>
                                        <option value="Short">Short (&lt;1 yr)</option>
                                        <option value="Mid">Mid (1-5 yrs)</option>
                                        <option value="Long">Long (&gt;5 yrs)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Risk Tolerance</label>
                                    <select
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={profileForm.risk_tolerance}
                                        onChange={(e) => setProfileForm({ ...profileForm, risk_tolerance: e.target.value })}
                                    >
                                        <option value="">Select Risk</option>
                                        <option value="low">Low (Conservative)</option>
                                        <option value="medium">Medium (Balanced)</option>
                                        <option value="high">High (Aggressive)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-3">Preferred Sectors</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Real Estate'].map(sector => (
                                        <button
                                            type="button"
                                            key={sector}
                                            onClick={() => toggleSector(sector)}
                                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${profileForm.preferred_sectors.includes(sector)
                                                ? 'border-emerald-500 bg-emerald-900/30 text-emerald-300'
                                                : 'border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-400'
                                                }`}
                                        >
                                            {profileForm.preferred_sectors.includes(sector) ? '✅ ' : ''}{sector}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-800 flex justify-end">
                                <button
                                    type="submit"
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl animate-fade-in">
                        <h2 className="text-xl font-bold text-white mb-6">Security Settings</h2>

                        {user.is_social_login ? (
                            <div className="bg-blue-500/10 border border-blue-500/30 text-blue-200 p-6 rounded-xl flex items-center gap-4">
                                <div className="text-2xl">🔒</div>
                                <div>
                                    <p className="font-bold mb-1">Authenticated via Google</p>
                                    <p className="text-sm opacity-80">Your account is linked to Google. Please manage your password and security through your Google Account settings.</p>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
                                {passMessage.text && (
                                    <div className={`p-4 rounded-lg text-sm border ${passMessage.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-red-500/10 border-red-500 text-red-400'}`}>
                                        {passMessage.text}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Current Password</label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={passwordForm.old_password}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">New Password</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={passwordForm.new_password}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Confirm New Password</label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={passwordForm.confirm_password}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-8 py-3 rounded-xl font-bold transition-all"
                                >
                                    Update Password
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
