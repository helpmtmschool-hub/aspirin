import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink, 
  Copy, 
  Check, 
  Clock, 
  AlertCircle, 
  Flame, 
  Gift, 
  HelpCircle,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppUser } from '../auth/AuthProvider';
import { LMSApiService } from '../../services/api';
import { MBBSProf } from '../../types/lms';

interface PaywallOnboardingProps {
  onActivated?: () => void;
  onClose?: () => void;
}

export const PaywallOnboarding: React.FC<PaywallOnboardingProps> = ({ onActivated, onClose }) => {
  const { user, entitlement, refreshEntitlement, signOut, isAdmin } = useAppUser();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'premium'>('premium');
  const [selectedProf, setSelectedProf] = useState<MBBSProf>('Final Prof Part 2');

  // If user is recognized as admin, unlock immediately
  useEffect(() => {
    if (isAdmin || user?.isAdmin) {
      refreshEntitlement();
      if (onActivated) {
        onActivated();
      }
    }
  }, [isAdmin, user?.isAdmin, onActivated, refreshEntitlement]);
  
  // Voucher Submission Form State
  const [giftCardCode, setGiftCardCode] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

  // Live Countdown to Puja Special: 17th October 2026
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 21,
    hours: 14,
    minutes: 32,
    seconds: 45,
  });

  useEffect(() => {
    const targetDate = new Date('2026-10-17T23:59:59+05:30').getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;
      if (distance <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute Prices
  const basePrice = selectedPlan === 'pro' 
    ? (billingCycle === 'monthly' ? 199 : 1299)
    : (billingCycle === 'monthly' ? 399 : 2499);

  // 10% Referral Discount if referral code has at least 3 characters
  const hasReferralDiscount = referralCode.trim().length >= 3;
  const discountAmount = hasReferralDiscount ? Math.round(basePrice * 0.10) : 0;
  const finalPrice = basePrice - discountAmount;

  const handleCopyReferral = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2000);
    }
  };

  const handleSubmitVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftCardCode.trim() || giftCardCode.trim().length < 8) {
      setSubmitError('Please enter a valid 16-character Amazon Gift Card claim code.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const fullPlanId = `${selectedPlan}_${billingCycle}`;
    const result = await LMSApiService.submitVoucher({
      plan: fullPlanId,
      profYear: selectedPlan === 'pro' ? selectedProf : 'all',
      amount: finalPrice,
      giftCardCode: giftCardCode.trim(),
      referralCode: referralCode.trim() || undefined,
      userEmail: user?.primaryEmailAddress.emailAddress,
      userName: user?.fullName,
    });

    setIsSubmitting(false);
    if (result.success) {
      setSubmitSuccess(true);
      refreshEntitlement();
    } else {
      setSubmitError(result.error || 'Failed to submit gift card code. Please try again.');
    }
  };

  const isPending = entitlement.status === 'pending' || submitSuccess;

  return (
    <div className="min-h-screen bg-[#fffaf0] text-[#0a0a0a] flex flex-col font-sans selection:bg-[#ffb084] selection:text-[#0a0a0a]">
      {/* 1. Festive Urgency Announcement Bar */}
      <div className="bg-[#0a0a0a] text-[#fffaf0] py-2 px-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span>🪔</span>
            <span className="font-medium text-[#faf5e8]">
              <strong className="text-[#e8b94a]">Maha Puja Festive Offer:</strong> Special rate valid till 17th October 2026.
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-[#a0a0a0]">Ends in:</span>
            <span className="px-1.5 py-0.5 rounded bg-[#1f1f1f] text-[#ffb084] font-bold border border-[#333]">
              {String(timeLeft.days).padStart(2, '0')}d : {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Header with User Info & Sign Out */}
      <header className="border-b border-[#e5e5e5] bg-[#fffaf0]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#0a0a0a] text-[#fffaf0] flex items-center justify-center font-bold text-base shadow-sm">
              ℞
            </div>
            <div>
              <span className="font-display font-extrabold text-lg text-[#0a0a0a]">Aspirin LMS</span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full bg-[#f5f0e0] text-[#ff4d8b] text-[10px] font-semibold border border-[#e5e5e5]">
                Account Onboarding
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-[#0a0a0a]">{user.fullName}</span>
                <span className="text-[11px] text-[#6a6a6a] truncate max-w-[180px]">{user.primaryEmailAddress.emailAddress}</span>
              </div>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#0a0a0a] hover:bg-[#faf5e8] border border-[#e5e5e5] transition cursor-pointer"
              >
                Back to Classroom
              </button>
            )}

            {signOut && (
              <button
                type="button"
                onClick={() => signOut()}
                className="p-2 rounded-xl text-[#6a6a6a] hover:text-[#0a0a0a] hover:bg-[#faf5e8] border border-[#e5e5e5] transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. Main Onboarding & Paywall Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Welcome Banner Card */}
        <div className="rounded-3xl bg-white border border-[#e5e5e5] p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] text-xs font-semibold text-[#0a0a0a] mb-2">
                <Shield className="w-3.5 h-3.5 text-[#ff4d8b]" />
                <span>Account Verified</span>
              </div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0a0a0a]">
                Welcome, {user?.fullName || 'Dr. Aspirant'}
              </h1>
              <p className="text-xs sm:text-sm text-[#6a6a6a] mt-1 max-w-xl">
                Your medical student profile is created. To unlock instant 0-buffering video streaming across 19 subjects and 24 Master Books, activate your subsidized Puja Festive Pass below.
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-end">
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                isPending 
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : entitlement.status === 'rejected'
                  ? 'bg-red-50 text-red-800 border-red-300'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {isPending ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                    <span>Verification In Progress</span>
                  </>
                ) : entitlement.status === 'rejected' ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    <span>Voucher Rejected</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Membership Inactive</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* If Voucher was Rejected */}
        {entitlement.status === 'rejected' && !isPending && (
          <div className="rounded-3xl bg-red-50 border-2 border-red-300 p-6 sm:p-7 shadow-xs max-w-3xl mx-auto space-y-3">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-bold text-base text-red-900">
                  Voucher Verification Unsuccessful
                </h3>
                <p className="text-xs text-red-800 leading-relaxed">
                  Reason: <strong>{entitlement.rejectionReason || 'Voucher code was invalid or already claimed on Amazon.'}</strong>
                </p>
                <p className="text-[11px] text-red-700">
                  Please verify your 16-character code from your Amazon order receipt email or purchase a replacement gift card below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* If Voucher is Currently Pending Verification */}
        {isPending ? (
          <div className="rounded-3xl bg-[#faf5e8] border-2 border-[#e8b94a] p-6 sm:p-8 shadow-sm text-center max-w-2xl mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#e8b94a]/20 text-[#b45309] flex items-center justify-center mx-auto text-2xl shadow-inner">
              ⏳
            </div>
            <div>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[#0a0a0a]">
                Amazon Gift Card Voucher Submitted!
              </h2>
              <p className="text-xs sm:text-sm text-[#6a6a6a] mt-2 leading-relaxed">
                Your Amazon Gift Card claim code has been safely recorded. Submissions are personally checked by the admin team within <strong>15 to 30 minutes</strong>. Once the gift card balance is confirmed, your account is immediately unlocked.
              </p>
            </div>

            {entitlement.pendingSubmission && (
              <div className="p-4 rounded-2xl bg-white border border-[#e5e5e5] text-left text-xs max-w-md mx-auto space-y-2">
                <div className="flex justify-between text-[#6a6a6a]">
                  <span>Voucher Code:</span>
                  <span className="font-mono font-bold text-[#0a0a0a]">{entitlement.pendingSubmission.giftCardCodeMasked}</span>
                </div>
                <div className="flex justify-between text-[#6a6a6a]">
                  <span>Requested Plan:</span>
                  <span className="font-semibold text-[#0a0a0a] uppercase">{entitlement.pendingSubmission.plan.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between text-[#6a6a6a]">
                  <span>Amount:</span>
                  <span className="font-bold text-[#22c55e]">₹{entitlement.pendingSubmission.amount}</span>
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="https://t.me/"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0a0a0a] hover:bg-[#222] text-[#fffaf0] font-semibold text-xs transition flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Express Activation via Telegram</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#ffb084]" />
              </a>

              <button
                type="button"
                onClick={() => {
                  setSubmitSuccess(false);
                  localStorage.removeItem('aspirin_user_entitlement');
                  refreshEntitlement();
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-[#f5f0e0] border border-[#e5e5e5] text-[#0a0a0a] font-semibold text-xs transition cursor-pointer"
              >
                Submit Different Code
              </button>
            </div>
          </div>
        ) : (
          /* Normal Activation Flow: Plan Selection + Amazon Gift Card Steps */
          <div className="space-y-8">
            {/* Step 1: Choose Your Plan */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff4d8b]">Step 1 of 2</span>
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-[#0a0a0a]">
                    Select Your Study Tier
                  </h2>
                </div>

                {/* Monthly / Yearly Switcher */}
                <div className="flex items-center gap-2 bg-white border border-[#e5e5e5] p-1 rounded-2xl shadow-xs">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      billingCycle === 'monthly' ? 'bg-[#0a0a0a] text-[#fffaf0]' : 'text-[#6a6a6a] hover:text-[#0a0a0a]'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                      billingCycle === 'yearly' ? 'bg-[#0a0a0a] text-[#fffaf0]' : 'text-[#6a6a6a] hover:text-[#0a0a0a]'
                    }`}
                  >
                    <span>Annual</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-[#ff4d8b] text-white text-[9px] font-bold">75% OFF</span>
                  </button>
                </div>
              </div>

              {/* Tier Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PRO PLAN */}
                <div 
                  onClick={() => setSelectedPlan('pro')}
                  className={`p-6 rounded-3xl border-2 transition cursor-pointer flex flex-col justify-between ${
                    selectedPlan === 'pro'
                      ? 'bg-white border-[#0a0a0a] shadow-md'
                      : 'bg-white/60 border-[#e5e5e5] hover:border-[#ccc]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-display font-bold text-lg text-[#0a0a0a]">Pro Pass</h3>
                        <p className="text-xs text-[#6a6a6a]">1 Specific Prof Year</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-[#9a9a9a] line-through font-mono block">
                          {billingCycle === 'monthly' ? '₹999' : '₹4,999'}
                        </span>
                        <span className="font-display font-extrabold text-2xl text-[#0a0a0a]">
                          {billingCycle === 'monthly' ? '₹199' : '₹1,299'}
                        </span>
                        <span className="text-[11px] text-[#6a6a6a]">
                          {billingCycle === 'monthly' ? ' / mo' : ' / yr'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#6a6a6a] mb-4">
                      Tailored for medicos who only need their current college academic prof year.
                    </p>

                    {/* Academic Prof Year Dropdown (if Pro is selected) */}
                    {selectedPlan === 'pro' && (
                      <div className="mb-4 p-3 rounded-xl bg-[#faf5e8] border border-[#e5e5e5]">
                        <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase tracking-wider mb-1.5">
                          Select Your College Year:
                        </label>
                        <select
                          value={selectedProf}
                          onChange={(e) => setSelectedProf(e.target.value as MBBSProf)}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e5e5] text-xs font-semibold text-[#0a0a0a] focus:outline-none focus:border-[#0a0a0a]"
                        >
                          <option value="1st Prof">1st Prof (Anatomy, Physio, Biochem)</option>
                          <option value="2nd Prof">2nd Prof (Patho, Pharm, Micro)</option>
                          <option value="3rd Prof Part 1">3rd Prof Part 1 (PSM & FMT)</option>
                          <option value="Final Prof Part 2">Final Prof Part 2 (Medicine, Surgery, OBG, Peds, ENT, Ophtha, etc.)</option>
                        </select>
                      </div>
                    )}

                    <ul className="space-y-1.5 text-xs text-[#3a3a3a]">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                        <span>All lectures & notes for 1 Prof Year</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                        <span>PrepLadder X (English + Hinglish)</span>
                      </li>
                      <li className="flex items-center gap-2 text-[#9a9a9a]">
                        <span>✕</span>
                        <span>Marrow Edition 6 Clinical (Locked)</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#f0f0f0]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#0a0a0a]">
                        {selectedPlan === 'pro' ? 'Selected ✓' : 'Click to select'}
                      </span>
                      <span className="text-[11px] text-[#22c55e] font-mono">
                        {billingCycle === 'monthly' ? '₹6.60 / day' : '₹3.50 / day'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PREMIUM PLAN */}
                <div 
                  onClick={() => setSelectedPlan('premium')}
                  className={`p-6 rounded-3xl border-2 transition cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                    selectedPlan === 'premium'
                      ? 'bg-[#0a0a0a] text-[#fffaf0] border-[#e8b94a] shadow-xl'
                      : 'bg-white/60 border-[#e5e5e5] hover:border-[#ccc]'
                  }`}
                >
                  <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-l from-[#e8b94a] to-[#ff4d8b] text-[#0a0a0a] font-extrabold text-[9px] uppercase tracking-wider rounded-bl-xl shadow-xs">
                    ⭐ Best Value
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className={`font-display font-bold text-lg ${selectedPlan === 'premium' ? 'text-white' : 'text-[#0a0a0a]'}`}>
                          Premium All-Access
                        </h3>
                        <p className={`text-xs ${selectedPlan === 'premium' ? 'text-[#a0a0a0]' : 'text-[#6a6a6a]'}`}>
                          All 19 MBBS Subjects + NEET-PG
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-[#777] line-through font-mono block">
                          {billingCycle === 'monthly' ? '₹1,999' : '₹9,999'}
                        </span>
                        <span className={`font-display font-extrabold text-2xl ${selectedPlan === 'premium' ? 'text-white' : 'text-[#0a0a0a]'}`}>
                          {billingCycle === 'monthly' ? '₹399' : '₹2,499'}
                        </span>
                        <span className={`text-[11px] ${selectedPlan === 'premium' ? 'text-[#a0a0a0]' : 'text-[#6a6a6a]'}`}>
                          {billingCycle === 'monthly' ? ' / mo' : ' / yr'}
                        </span>
                      </div>
                    </div>

                    <p className={`text-xs mb-4 ${selectedPlan === 'premium' ? 'text-[#c0c0c0]' : 'text-[#6a6a6a]'}`}>
                      Everything unlocked. PrepLadder X, Marrow Edition 6 Clinical, Cerebellum & 24 Master Books.
                    </p>

                    <ul className={`space-y-1.5 text-xs ${selectedPlan === 'premium' ? 'text-[#e0e0e0]' : 'text-[#3a3a3a]'}`}>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#e8b94a] shrink-0" />
                        <span><strong>All 19 MBBS Subjects</strong> (Zero Prof Restrictions)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#e8b94a] shrink-0" />
                        <span><strong>PrepLadder X</strong> (English + Hinglish, 2,379 vids)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#e8b94a] shrink-0" />
                        <span><strong>Marrow Edition 6</strong> Clinical (504 vids)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#e8b94a] shrink-0" />
                        <span><strong>24 Master PDF Textbooks</strong> (Cerebellum)</span>
                      </li>
                    </ul>
                  </div>

                  <div className={`pt-4 mt-4 border-t ${selectedPlan === 'premium' ? 'border-[#222]' : 'border-[#f0f0f0]'}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${selectedPlan === 'premium' ? 'text-[#e8b94a]' : 'text-[#0a0a0a]'}`}>
                        {selectedPlan === 'premium' ? 'Selected ✓' : 'Click to select'}
                      </span>
                      <span className="text-[11px] text-[#ffb084] font-mono">
                        {billingCycle === 'monthly' ? '₹13 / day' : '₹6.80 / day (Effective ₹208/mo)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Amazon Gift Card Payment Walkthrough & Code Input */}
            <div className="rounded-3xl bg-white border border-[#e5e5e5] p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff4d8b]">Step 2 of 2</span>
                <h2 className="font-display font-bold text-xl sm:text-2xl text-[#0a0a0a] mt-0.5">
                  Activate via Anonymous Amazon Gift Card (UPI)
                </h2>
                <p className="text-xs sm:text-sm text-[#6a6a6a] mt-1">
                  Pay securely using any UPI app (GPay, PhonePe, Paytm) via an Amazon eGift Card. Your identity remains 100% private.
                </p>
              </div>

              {/* Summary Bar */}
              <div className="p-4 rounded-2xl bg-[#faf5e8] border border-[#e5e5e5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[#6a6a6a]">Plan Selected: </span>
                  <strong className="text-[#0a0a0a] uppercase font-display">{selectedPlan} ({billingCycle})</strong>
                  {selectedPlan === 'pro' && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-white text-[#ff4d8b] font-semibold border border-[#e5e5e5]">
                      {selectedProf}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-[#6a6a6a]">Payable Voucher Amount:</span>
                  <span className="font-display font-extrabold text-xl text-[#22c55e]">₹{finalPrice}</span>
                  {hasReferralDiscount && (
                    <span className="text-[10px] text-[#ff4d8b] font-semibold">(-10% referral discount applied)</span>
                  )}
                </div>
              </div>

              {/* 5-Step Instructions Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-[#fffaf0] border border-[#e5e5e5] text-xs">
                  <div className="w-6 h-6 rounded-full bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-[10px] mb-2">1</div>
                  <strong className="block text-[#0a0a0a] mb-0.5">Open Amazon</strong>
                  <p className="text-[11px] text-[#6a6a6a]">Tap link to open Amazon Pay eGift Cards page.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#fffaf0] border border-[#e5e5e5] text-xs">
                  <div className="w-6 h-6 rounded-full bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-[10px] mb-2">2</div>
                  <strong className="block text-[#0a0a0a] mb-0.5">Set Amount</strong>
                  <p className="text-[11px] text-[#6a6a6a]">Enter exact amount: <strong>₹{finalPrice}</strong>.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#fffaf0] border border-[#e5e5e5] text-xs">
                  <div className="w-6 h-6 rounded-full bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-[10px] mb-2">3</div>
                  <strong className="block text-[#0a0a0a] mb-0.5">Enter Email</strong>
                  <p className="text-[11px] text-[#6a6a6a]">Enter your own email to receive claim code.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#fffaf0] border border-[#e5e5e5] text-xs">
                  <div className="w-6 h-6 rounded-full bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-[10px] mb-2">4</div>
                  <strong className="block text-[#0a0a0a] mb-0.5">Pay with UPI</strong>
                  <p className="text-[11px] text-[#6a6a6a]">Pay with GPay, PhonePe, Paytm or card.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#fffaf0] border border-[#e5e5e5] text-xs">
                  <div className="w-6 h-6 rounded-full bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-[10px] mb-2">5</div>
                  <strong className="block text-[#0a0a0a] mb-0.5">Paste Code</strong>
                  <p className="text-[11px] text-[#6a6a6a]">Copy 16-char code & submit below.</p>
                </div>
              </div>

              {/* Quick Amazon Link Button */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <a
                  href={`https://www.amazon.in/gp/product/B00KGE279A`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#faf5e8] hover:bg-[#f5f0e0] border border-[#e5e5e5] text-[#0a0a0a] font-semibold text-xs transition flex items-center justify-center gap-2"
                >
                  <span>Buy ₹{finalPrice} Amazon eGift Card on Amazon.in</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#ff4d8b]" />
                </a>
                <span className="text-[11px] text-[#6a6a6a]">Delivery is instant to your email.</span>
              </div>

              {/* Form to Submit Code */}
              <form onSubmit={handleSubmitVoucher} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Gift card code input */}
                  <div>
                    <label className="block text-xs font-bold text-[#0a0a0a] mb-1.5">
                      Amazon Gift Card Claim Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ABCD-123456-EFGH"
                      value={giftCardCode}
                      onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-[#e5e5e5] text-sm font-mono tracking-wider text-[#0a0a0a] focus:outline-none focus:border-[#0a0a0a] shadow-xs uppercase"
                    />
                    <span className="text-[10px] text-[#6a6a6a] mt-1 block">
                      Found in your Amazon Order Confirmation email or Orders section.
                    </span>
                  </div>

                  {/* Optional Referral code input */}
                  <div>
                    <label className="block text-xs font-bold text-[#0a0a0a] mb-1.5 flex items-center justify-between">
                      <span>Batch Referral Code (Optional)</span>
                      <span className="text-[10px] text-[#ff4d8b] font-normal">Saves 10%</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DR-BATCH2026"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-[#e5e5e5] text-sm font-mono tracking-wider text-[#0a0a0a] focus:outline-none focus:border-[#0a0a0a] shadow-xs uppercase"
                    />
                    <span className="text-[10px] text-[#6a6a6a] mt-1 block">
                      Enter a classmate's code for an instant 10% discount.
                    </span>
                  </div>
                </div>

                {submitError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{submitError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !giftCardCode.trim()}
                  className="w-full py-3.5 rounded-xl bg-[#0a0a0a] hover:bg-[#1f1f1f] disabled:bg-[#ccc] text-[#fffaf0] font-semibold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Submitting Voucher for Verification...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit ₹{finalPrice} Gift Card for Activation</span>
                      <ArrowRight className="w-4 h-4 text-[#ffb084]" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Step 3: Referral Share Banner */}
            <div className="rounded-3xl bg-[#faf5e8] border border-[#e5e5e5] p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#ff4d8b] text-white flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-[#0a0a0a]">Your Personal Batchmate Code</h4>
                  <p className="text-xs text-[#6a6a6a] mt-0.5">
                    Share your code with hostel friends: they save 10%, and your membership is extended by 1 free month per friend!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="px-3.5 py-2 rounded-xl bg-white border border-[#e5e5e5] font-mono font-bold text-xs text-[#0a0a0a]">
                  {user?.referralCode || 'DR-ASPIRIN'}
                </div>
                <button
                  type="button"
                  onClick={handleCopyReferral}
                  className="px-3 py-2 rounded-xl bg-[#0a0a0a] hover:bg-[#222] text-[#fffaf0] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedReferral ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedReferral ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
