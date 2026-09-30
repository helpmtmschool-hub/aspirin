import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  Lock, 
  Clock, 
  ArrowLeft, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertCircle, 
  Gift, 
  BadgePercent, 
  Zap, 
  BookOpen,
  ChevronRight,
  Shield,
  Layers
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAppUser } from '../auth/AuthProvider';
import { Subject, MBBSProf } from '../../types/lms';

interface SubscriptionPageProps {
  onBack: () => void;
  onUpgrade: () => void;
  subjects?: Subject[];
}

const PROF_ORDER: { prof: MBBSProf; label: string; yearLabel: string }[] = [
  { prof: '1st Prof', label: '1st Prof (Pre-Clinical)', yearLabel: '1st Year' },
  { prof: '2nd Prof', label: '2nd Prof (Para-Clinical)', yearLabel: '2nd Year' },
  { prof: '3rd Prof Part 1', label: '3rd Prof Part 1 (Pre-Final)', yearLabel: '3rd Year' },
  { prof: 'Final Prof Part 2', label: 'Final Prof Part 2 (Major Clinicals)', yearLabel: 'Final Year' },
];

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({
  onBack,
  onUpgrade,
  subjects = [],
}) => {
  const { user, entitlement, isAdmin } = useAppUser();
  const [copiedReferral, setCopiedReferral] = useState(false);

  const isUserAdmin = isAdmin || user?.isAdmin || entitlement.isAdmin;
  const isPremium = isUserAdmin || entitlement.plan === 'premium';
  const isPro = entitlement.plan === 'pro';
  const isGuest = !isPremium && !isPro;

  // Calculate days remaining from expiresAt or Puja target date
  const { daysRemaining, formattedExpiry } = useMemo(() => {
    if (isUserAdmin) {
      return { daysRemaining: 'Lifetime', formattedExpiry: 'Lifetime Administrator License' };
    }
    const expiryStr = entitlement.expiresAt || '2027-10-17T23:59:59.000Z';
    const expiryDate = new Date(expiryStr);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    
    const formatted = expiryDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return {
      daysRemaining: isGuest ? '0 Days' : `${days} Days`,
      formattedExpiry: isGuest ? 'Free Preview Active' : formatted,
    };
  }, [entitlement.expiresAt, isUserAdmin, isGuest]);

  const handleCopyReferral = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2000);
    }
  };

  // Group subjects by professional year
  const groupedSubjects = useMemo(() => {
    const map: Record<string, Subject[]> = {
      '1st Prof': [],
      '2nd Prof': [],
      '3rd Prof Part 1': [],
      'Final Prof Part 2': [],
    };
    subjects.forEach((s) => {
      if (map[s.prof]) {
        map[s.prof].push(s);
      }
    });
    return map;
  }, [subjects]);

  const isSubjectAccessible = (prof: string) => {
    if (isPremium) return true;
    if (isPro) {
      return !entitlement.profYear || entitlement.profYear === 'all' || prof === entitlement.profYear;
    }
    return false;
  };

  const unlockedSubjectCount = useMemo(() => {
    if (isPremium) return subjects.length || 19;
    if (isPro) {
      return subjects.filter((s) => isSubjectAccessible(s.prof)).length;
    }
    return 0;
  }, [isPremium, isPro, subjects, entitlement.profYear]);

  return (
    <div className="min-h-screen bg-[#fffaf0] text-[#0a0a0a] flex flex-col font-sans pt-6 sm:pt-8 lg:pt-24 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-16">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 flex-1">
        
        {/* Top Navigation & Back Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-stone-600 hover:text-stone-900 transition w-fit cursor-pointer group"
          >
            <div className="p-1.5 rounded-full bg-white border border-stone-200 group-hover:border-stone-300 shadow-2xs">
              <ArrowLeft className="w-4 h-4 text-stone-700" />
            </div>
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white border border-stone-200/90 text-xs font-mono font-medium text-stone-600 shadow-2xs">
              Account: <strong className="text-stone-900">{user?.primaryEmailAddress?.emailAddress || 'Guest Student'}</strong>
            </span>
          </div>
        </div>

        {/* Hero Membership Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-stone-900 text-white p-6 sm:p-8 lg:p-10 shadow-xl border border-stone-800">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-20 w-60 h-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {isUserAdmin ? 'Administrator License' : isPremium ? 'Active All-Access' : isPro ? `${entitlement.profYear} Active` : 'Free Preview Mode'}
                </span>

                <span className="px-3 py-1 rounded-full bg-white/10 text-stone-300 border border-white/10 text-xs font-mono">
                  Single-Device Concurrency Protected
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-display">
                {isUserAdmin
                  ? 'Administrator Clinical Master License'
                  : isPremium
                  ? 'Aspirin MBBS Complete Pro All-Access'
                  : isPro
                  ? `Aspirin MBBS ${entitlement.profYear} Focus Pass`
                  : 'Aspirin Clinical Guest Preview'}
              </h1>

              <p className="text-sm text-stone-300 leading-relaxed">
                {isUserAdmin
                  ? 'Full administrative control, student verification dashboard, and uninhibited access across all 19 MBBS subjects.'
                  : isPremium
                  ? 'Unrestricted access to all 19 MBBS subjects across 1st, 2nd, 3rd, and Final Prof, including 24 master books and clinical question banks.'
                  : isPro
                  ? `Full clinical coverage for ${entitlement.profYear}. You have unlocked all lectures, notes, and milestones in this professional year.`
                  : 'You are currently on the free clinical preview tier. Upgrade to unlock all video modules, master review books, and clinical question banks.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <button
                type="button"
                onClick={onUpgrade}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-stone-950 hover:bg-stone-100 text-sm font-bold shadow-md transition cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span>{isPremium ? 'Extend License / Gift Card' : 'Upgrade to All-Access'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyReferral}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-stone-200 border border-white/15 text-xs font-semibold transition cursor-pointer"
              >
                {copiedReferral ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-stone-400" />}
                <span>{copiedReferral ? 'Referral Link Copied' : 'Share 10% Referral Pass'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Quick Stat Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Subscription Tier */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-mono font-medium uppercase tracking-wider">Plan Tier</span>
              <CreditCard className="w-4 h-4 text-stone-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-display text-stone-900">
              {isUserAdmin ? 'Admin Elite' : isPremium ? 'MBBS Complete' : isPro ? 'Prof Track' : 'Free Trial'}
            </div>
            <p className="text-[11px] text-stone-500 font-mono">
              {isPremium ? 'All 19 Subjects Included' : isPro ? `${entitlement.profYear}` : 'Introductory Chapters'}
            </p>
          </div>

          {/* Card 2: Validity Status */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-mono font-medium uppercase tracking-wider">Validity</span>
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-display text-stone-900">
              {daysRemaining}
            </div>
            <p className="text-[11px] text-stone-500 font-mono truncate" title={formattedExpiry}>
              {formattedExpiry}
            </p>
          </div>

          {/* Card 3: Unlocked Subjects */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-mono font-medium uppercase tracking-wider">Access Scope</span>
              <Layers className="w-4 h-4 text-stone-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-display text-stone-900">
              {unlockedSubjectCount} / {subjects.length || 19}
            </div>
            <p className="text-[11px] text-stone-500 font-mono">
              {isPremium ? '100% Curriculum Unlocked' : `${unlockedSubjectCount} Subjects Accessible`}
            </p>
          </div>

          {/* Card 4: Referral Earnings */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-mono font-medium uppercase tracking-wider">Referral Code</span>
              <BadgePercent className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-stone-900 flex items-center justify-between">
              <span>{user?.referralCode || 'ASP-742X'}</span>
              <button
                type="button"
                onClick={handleCopyReferral}
                title="Copy code"
                className="p-1 hover:bg-stone-100 rounded-md transition text-stone-500 hover:text-stone-900"
              >
                {copiedReferral ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-stone-500 font-mono">
              Earn 10% direct commission
            </p>
          </div>
        </div>

        {/* Pending Voucher Alert (if applicable) */}
        {entitlement.pendingSubmission && (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-amber-950 font-display">Amazon Gift Card Submission Under Verification</h4>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-[10px] font-mono font-bold text-amber-900">
                    Pending Admin Review
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Claim Code: <span className="font-mono font-bold">{entitlement.pendingSubmission.giftCardCodeMasked}</span> • Amount: ₹{entitlement.pendingSubmission.amount.toLocaleString()} • Plan: {entitlement.pendingSubmission.plan}
                </p>
                <p className="text-[11px] text-amber-700">
                  Verification usually completes within 2–4 hours. Your access will activate automatically once approved.
                </p>
              </div>
            </div>

            <button
              onClick={onUpgrade}
              className="px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-semibold transition shrink-0 cursor-pointer"
            >
              Submit Another Card
            </button>
          </div>
        )}

        {/* 19 MBBS Subjects Access Matrix */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200/90 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-5">
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-display text-stone-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-stone-800" />
                <span>19 MBBS Subjects Access Breakdown</span>
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                Detailed verification of which professional years and subjects are currently covered by your subscription.
              </p>
            </div>

            <span className="px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-xs font-mono font-medium text-stone-700 self-start sm:self-auto">
              Active Coverage: <strong>{unlockedSubjectCount} / {subjects.length || 19} Subjects</strong>
            </span>
          </div>

          <div className="space-y-6">
            {PROF_ORDER.map(({ prof, label, yearLabel }) => {
              const accessible = isSubjectAccessible(prof);
              const profSubjects = groupedSubjects[prof] || [];

              return (
                <div key={prof} className="p-4 sm:p-5 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-full ${accessible ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                        {accessible ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-stone-500" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold font-display text-stone-900 flex items-center gap-2">
                          <span>{label}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-600">
                            {yearLabel}
                          </span>
                        </h4>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
                      accessible ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-100 text-stone-600 border border-stone-200'
                    }`}>
                      {accessible ? 'Unlocked' : 'Requires Upgrade'}
                    </span>
                  </div>

                  {/* Subject List Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {profSubjects.length > 0 ? (
                      profSubjects.map((sub) => (
                        <span
                          key={sub.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${
                            accessible
                              ? 'bg-white text-stone-800 border-stone-200 shadow-2xs'
                              : 'bg-stone-100/60 text-stone-400 border-stone-200/60'
                          }`}
                        >
                          {accessible ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          ) : (
                            <Lock className="w-3 h-3 text-stone-400" />
                          )}
                          <span>{sub.name}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-stone-400 italic">No subject catalog loaded</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clinical Features Included Table */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200/90 shadow-2xs space-y-4">
          <h3 className="text-lg font-bold font-display text-stone-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Included Clinical Learning Services</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {[
              {
                title: 'Clinical Video Platforms',
                desc: 'PrepLadder Edition X, Cerebellum Academy, and Marrow Edition 6 high-yield tracks.',
                active: isPremium || isPro,
              },
              {
                title: '24 Master Review Books',
                desc: 'Integrated PDF viewer with highlight, bookmark, and instant clinical cross-reference.',
                active: isPremium || isPro,
              },
              {
                title: 'High-Yield PYQ Q-Bank',
                desc: 'Past 10 years NEET-PG, INI-CET, and FMGE question banks with detailed explanations.',
                active: isPremium || isPro,
              },
              {
                title: 'Device Concurrency Protection',
                desc: 'Strict 1-device active session policy for academic security and data protection.',
                active: true,
              },
              {
                title: 'Cloud & Offline Sync',
                desc: 'Watch history and bookmarks cached in IndexedDB and synchronized with Cloudflare D1.',
                active: true,
              },
              {
                title: '10% Referral Cash Out',
                desc: 'Instant 10% cash/gift-card commission on every student who subscribes using your link.',
                active: true,
              },
            ].map((feature, i) => (
              <div key={i} className="p-4 rounded-2xl bg-stone-50/60 border border-stone-200/80 space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-stone-900">{feature.title}</span>
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed pl-6">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

// Embedded Subscription Summary for Clerk UserProfile modal
export const SubscriptionClerkEmbed: React.FC = () => {
  const { user, entitlement, isAdmin } = useAppUser();
  const [copied, setCopied] = useState(false);

  const isUserAdmin = isAdmin || user?.isAdmin || entitlement.isAdmin;
  const isPremium = isUserAdmin || entitlement.plan === 'premium';
  const isPro = entitlement.plan === 'pro';

  const planTitle = isUserAdmin
    ? 'Administrator License'
    : isPremium
    ? 'MBBS Complete All-Access Pro'
    : isPro
    ? `MBBS ${entitlement.profYear} Focus Pass`
    : 'Clinical Guest Preview';

  const expiryText = isUserAdmin
    ? 'Lifetime Access'
    : entitlement.expiresAt
    ? new Date(entitlement.expiresAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'October 17, 2027';

  const handleOpenFull = () => {
    window.location.hash = 'subscription';
    window.dispatchEvent(new CustomEvent('open-subscription-tab'));
    // Close Clerk modal if open by simulating escape or click on close button
    const closeBtn = document.querySelector('.cl-modalCloseButton, .cl-userProfile-closeButton') as HTMLElement;
    if (closeBtn) closeBtn.click();
  };

  const handleCopy = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-5 p-1 text-stone-900 font-sans">
      {/* Plan Header Card */}
      <div className="p-5 rounded-2xl bg-stone-900 text-white space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {isUserAdmin ? 'Active Admin' : isPremium || isPro ? 'Active Membership' : 'Free Preview'}
          </span>
          <span className="text-[11px] font-mono text-stone-400">1 Device Protected</span>
        </div>

        <div>
          <h3 className="text-lg font-bold font-display text-white">{planTitle}</h3>
          <p className="text-xs text-stone-300 mt-0.5">
            {isPremium ? 'All 19 MBBS Subjects Unlocked' : isPro ? `${entitlement.profYear} Full Curriculum` : 'Limited Preview Access'}
          </p>
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono text-stone-300">
          <span>Validity Expiry:</span>
          <strong className="text-white">{expiryText}</strong>
        </div>
      </div>

      {/* Quick Details Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-stone-100/80 border border-stone-200 space-y-1">
          <span className="text-[10px] font-mono text-stone-500 uppercase">Coverage</span>
          <div className="font-bold text-stone-900">
            {isPremium ? '19 / 19 Subjects' : isPro ? 'Single Prof Year' : 'Preview'}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-stone-100/80 border border-stone-200 space-y-1">
          <span className="text-[10px] font-mono text-stone-500 uppercase">Referral Code</span>
          <div className="font-mono font-bold text-stone-900 flex items-center justify-between">
            <span>{user?.referralCode || 'ASP-742X'}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="p-0.5 hover:bg-stone-200 rounded text-stone-500"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <button
        type="button"
        onClick={handleOpenFull}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
      >
        <CreditCard className="w-4 h-4 text-amber-400" />
        <span>Open Full Subscription & Access Portal</span>
        <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
      </button>
    </div>
  );
};

