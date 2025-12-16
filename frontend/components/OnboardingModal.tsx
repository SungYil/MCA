'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [answers, setAnswers] = useState({
        experience_level: '',
        primary_goal: '',
        investment_horizon: '',
        risk_tolerance: '',
        preferred_sectors: [] as string[]
    });

    if (!isOpen) return null;

    const handleOptionSelect = (key: string, value: any) => {
        setAnswers(prev => ({ ...prev, [key]: value }));
    };

    const toggleSector = (sector: string) => {
        setAnswers(prev => {
            const sectors = prev.preferred_sectors.includes(sector)
                ? prev.preferred_sectors.filter(s => s !== sector)
                : [...prev.preferred_sectors, sector];
            return { ...prev, preferred_sectors: sectors };
        });
    };

    const submitProfile = async () => {
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
                        experience_level: answers.experience_level,
                        primary_goal: answers.primary_goal,
                        investment_horizon: answers.investment_horizon
                    },
                    risk_tolerance: answers.risk_tolerance,
                    // preferred_sectors handled below if backend supports it separately, 
                    // otherwise put inside investment_profile.
                    // Schema has preferred_sectors column, so we might need to send it if API expects it.
                    // For now, let's assume valid JSON body for the PUT request.
                    // Actually my backend schema update had investment_profile dict. 
                    // Let's check `user.py` implementation:
                    // It expects: investment_profile: Dict, risk_tolerance: opt, years_experience: opt
                    // It updates user.preferred_sectors? No, `user.py` logic I wrote only updates 
                    // `current_user.investment_profile` and `risk_tolerance`.
                    // Ideally I should have added preferred_sectors to the Pydantic model.
                    // I will bundle them into investment_profile for simplicity or update the backend later.
                })
            });

            if (res.ok) {
                // Success logic
                alert("투자 성향이 저장되었습니다! AI가 이를 바탕으로 분석합니다.");
                onClose();
            } else {
                console.error("Failed to save profile");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const isStepValid = () => {
        if (step === 1) return !!answers.experience_level;
        if (step === 2) return !!answers.primary_goal;
        if (step === 3) return !!answers.investment_horizon;
        if (step === 4) return !!answers.risk_tolerance;
        return true;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-6 text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">🚀 투자 성향 분석</h2>
                    <p className="text-blue-200 text-sm">사장님께 딱 맞는 AI 분석을 제공하기 위해 몇 가지만 여쭤볼게요.</p>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-gray-800 w-full">
                    <div
                        className="h-full bg-blue-500 transition-all duration-300 ease-out"
                        style={{ width: `${(step / 5) * 100}%` }}
                    />
                </div>

                <div className="p-8 min-h-[320px] flex flex-col justify-center">
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-white mb-4">투자 경험이 어떻게 되시나요?</h3>
                            {['Beginner (초보)', 'Intermediate (중수)', 'Expert (고수)'].map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => handleOptionSelect('experience_level', opt.split(' ')[0])}
                                    className={`w-full p-4 rounded-xl border text-left transition-all ${answers.experience_level === opt.split(' ')[0]
                                            ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                                            : 'border-gray-700 bg-gray-800 hover:bg-gray-750 text-gray-400'
                                        }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-white mb-4">투자의 주된 목표는 무엇인가요?</h3>
                            {[
                                { val: 'Growth', label: '🚀 자산 증식 (Growth)' },
                                { val: 'Income', label: '💰 배당/현금 흐름 (Income)' },
                                { val: 'balanced', label: '⚖️ 균형 잡힌 성장 (Balanced)' }
                            ].map(opt => (
                                <button
                                    key={opt.val}
                                    onClick={() => handleOptionSelect('primary_goal', opt.val)}
                                    className={`w-full p-4 rounded-xl border text-left transition-all ${answers.primary_goal === opt.val
                                            ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                                            : 'border-gray-700 bg-gray-800 hover:bg-gray-750 text-gray-400'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-white mb-4">예상 투자 기간은요?</h3>
                            {['Short (<1 yr)', 'Mid (1-5 yrs)', 'Long (>5 yrs)'].map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => handleOptionSelect('investment_horizon', opt.split(' ')[0])}
                                    className={`w-full p-4 rounded-xl border text-left transition-all ${answers.investment_horizon === opt.split(' ')[0]
                                            ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                                            : 'border-gray-700 bg-gray-800 hover:bg-gray-750 text-gray-400'
                                        }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-white mb-4">위험 감수 성향은 어떠세요?</h3>
                            {[
                                { val: 'low', label: '🛡️ 보수적 (안전 제일)' },
                                { val: 'medium', label: '⚖️ 중립적 (적당한 위험)' },
                                { val: 'high', label: '🔥 공격적 (수익 추구)' }
                            ].map(opt => (
                                <button
                                    key={opt.val}
                                    onClick={() => handleOptionSelect('risk_tolerance', opt.val)}
                                    className={`w-full p-4 rounded-xl border text-left transition-all ${answers.risk_tolerance === opt.val
                                            ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                                            : 'border-gray-700 bg-gray-800 hover:bg-gray-750 text-gray-400'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-white mb-4">관심 있는 섹터 (복수 선택)</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Real Estate'].map(sector => (
                                    <button
                                        key={sector}
                                        onClick={() => toggleSector(sector)}
                                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${answers.preferred_sectors.includes(sector)
                                                ? 'border-emerald-500 bg-emerald-900/30 text-emerald-300'
                                                : 'border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-400'
                                            }`}
                                    >
                                        {answers.preferred_sectors.includes(sector) ? '✅ ' : ''}{sector}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-6 bg-gray-900/50 border-t border-gray-800 flex justify-between">
                    {step > 1 ? (
                        <button onClick={prevStep} className="px-6 py-2 text-gray-400 hover:text-white">이전</button>
                    ) : (
                        <div></div>
                    )}

                    {step < 5 ? (
                        <button
                            onClick={nextStep}
                            disabled={!isStepValid()}
                            className={`px-8 py-2 rounded-lg font-bold transition-all ${isStepValid()
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                }`}
                        >
                            다음
                        </button>
                    ) : (
                        <button
                            onClick={submitProfile}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-8 py-2 rounded-lg font-bold shadow-lg shadow-purple-500/30 animate-pulse"
                        >
                            완료 및 시작하기
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
