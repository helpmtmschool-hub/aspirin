import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  DollarSign, 
  Users, 
  Clock, 
  AlertCircle,
  Search,
  ArrowLeft,
  Gift,
  BadgePercent,
  CheckCircle,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MBBSProf } from '../../types/lms';

export interface Submission {
  id: number;
  user_id: string;
  user_email: string;
  user_name: string;
  plan: string;
  prof_year: string;
  amount: number;
  gift_card_code: string;
  referral_code?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  approved_at?: string;
}

export interface Referral {
  id: number;
  referrer_user_id: string;
  referrer_code: string;
  referred_user_id: string;
  referred_email?: string;
  plan: string;
  amount: number;
  commission_due: number;
  commission_paid: number;
  submission_id?: number;
  created_at: string;
}

interface AdminConsolePageProps {
  onBack?: () => void;
}

export const AdminConsolePage: React.FC<AdminConsolePageProps> = ({ onBack }) => {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('aspirin_admin_key') || (import.meta.env.VITE_ADMIN_KEY as string) || 'aspirin_admin_2026');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'referrals' | 'settings'>('pending');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Load submissions and referrals from API
  const fetchData = async (keyToUse?: string) => {
    const effectiveKey = keyToUse || adminKey || localStorage.getItem('aspirin_admin_key') || 'aspirin_admin_2026';
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/pending-vouchers?key=${encodeURIComponent(effectiveKey)}`, {
        headers: { 'x-admin-key': effectiveKey },
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
        setReferrals(data.referrals || []);
        setIsAuthenticated(true);
        localStorage.setItem('aspirin_admin_key', effectiveKey);
        setAdminKey(effectiveKey);
      } else {
        setIsAuthenticated(false);
        setActionMessage({ type: 'error', text: 'Invalid Admin Key. Please check credentials in Security Token tab.' });
      }
    } catch (e) {
      setIsAuthenticated(false);
      setActionMessage({ type: 'error', text: 'Failed to communicate with admin service. Verify dev server is running.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (submissionId: number) => {
    const effectiveKey = adminKey || localStorage.getItem('aspirin_admin_key') || 'aspirin_admin_2026';
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/approve-voucher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': effectiveKey,
        },
        body: JSON.stringify({ submissionId }),
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: `Submission #${submissionId} successfully approved! Student account is now active.` });
        await fetchData(effectiveKey);
      } else {
        setActionMessage({ type: 'error', text: 'Approval failed. Please check server logs.' });
      }
    } catch (e) {
      setActionMessage({ type: 'error', text: 'Network error approving submission.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (submissionId: number) => {
    const reason = window.prompt(
      'Enter reason for rejection (this will be displayed to the student in their dashboard):',
      'Amazon Gift Card claim code invalid or already redeemed on another account'
    );
    if (!reason) return;

    const effectiveKey = adminKey || localStorage.getItem('aspirin_admin_key') || 'aspirin_admin_2026';
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/reject-voucher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': effectiveKey,
        },
        body: JSON.stringify({ submissionId, adminNotes: reason }),
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: `Submission #${submissionId} rejected with reason recorded.` });
        await fetchData(effectiveKey);
      } else {
        setActionMessage({ type: 'error', text: 'Rejection failed. Please check server logs.' });
      }
    } catch (e) {
      setActionMessage({ type: 'error', text: 'Network error rejecting submission.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayoutReferral = async (referralId: number) => {
    const effectiveKey = adminKey || localStorage.getItem('aspirin_admin_key') || 'aspirin_admin_2026';
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/payout-referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': effectiveKey,
        },
        body: JSON.stringify({ referralId }),
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: `Referral #${referralId} marked as paid!` });
        await fetchData(effectiveKey);
      } else {
        setActionMessage({ type: 'error', text: 'Failed to update referral status.' });
      }
    } catch (e) {
      setActionMessage({ type: 'error', text: 'Network error updating referral status.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDemoSubmission = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/paywall/submit-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `student_${Math.floor(1000 + Math.random() * 9000)}`,
          userEmail: `medical.student_${Math.floor(100 + Math.random() * 900)}@college.edu.in`,
          userName: 'Dr. Rohan Sharma (Intern)',
          plan: 'premium_yearly',
          profYear: 'all',
          amount: 2499,
          giftCardCode: `AMZ-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          referralCode: 'DR-MEDICO10',
        }),
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Demo student voucher submission generated! You can now verify or approve it.' });
        await fetchData();
      }
    } catch (e) {
      setActionMessage({ type: 'error', text: 'Failed to create demo submission.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Metrics computation
  const pendingList = useMemo(() => submissions.filter((s) => s.status === 'pending'), [submissions]);
  const approvedList = useMemo(() => submissions.filter((s) => s.status === 'approved'), [submissions]);
  const totalRevenue = useMemo(() => approvedList.reduce((sum, s) => sum + s.amount, 0), [approvedList]);
  const totalCommissionDue = useMemo(() => 
    referrals.filter((r) => !r.commission_paid).reduce((sum, r) => sum + r.commission_due, 0),
    [referrals]
  );
  const totalCommissionPaid = useMemo(() => 
    referrals.filter((r) => r.commission_paid).reduce((sum, r) => sum + r.commission_due, 0),
    [referrals]
  );

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        sub.gift_card_code.toLowerCase().includes(q) ||
        (sub.user_email && sub.user_email.toLowerCase().includes(q)) ||
        (sub.user_name && sub.user_name.toLowerCase().includes(q)) ||
        sub.user_id.toLowerCase().includes(q) ||
        (sub.referral_code && sub.referral_code.toLowerCase().includes(q)) ||
        sub.plan.toLowerCase().includes(q)
      );
    });
  }, [submissions, statusFilter, searchQuery]);

  // Filtered Referrals
  const filteredReferrals = useMemo(() => {
    if (!searchQuery.trim()) return referrals;
    const q = searchQuery.toLowerCase().trim();
    return referrals.filter((ref) => 
      ref.referrer_code.toLowerCase().includes(q) ||
      ref.referred_user_id.toLowerCase().includes(q) ||
      (ref.referred_email && ref.referred_email.toLowerCase().includes(q))
    );
  }, [referrals, searchQuery]);

  return (
    <div className="min-h-screen bg-[#fffaf0] text-[#0a0a0a] flex flex-col font-sans pt-6 sm:pt-8 lg:pt-24 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-16">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-6 flex-1">
        {/* Top Header Card */}
        <div className="rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white/90 backdrop-blur-md p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-900 transition cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to LMS</span>
              </button>
            )}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Shield className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold tracking-tight font-display text-stone-900 flex items-center gap-2 flex-wrap">
                  <span>Admin Verification & Referral Console</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-900 text-white font-mono font-normal">
                    v2.4 Live
                  </span>
                </h1>
                <p className="text-xs text-stone-500 truncate sm:whitespace-normal">
                  Verify student Amazon Gift Cards, activate paid subscriptions, and track 10% referral payouts.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <a
              href="https://www.amazon.in/gc/redeem"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold text-amber-900 transition"
              title="Open Amazon Gift Card redemption in new tab to verify claim codes"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Verify on Amazon</span>
            </a>

            <button
              type="button"
              onClick={() => fetchData()}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-900 transition cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
        {/* Status Toast Banner */}
        <AnimatePresence>
          {actionMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium flex items-center justify-between gap-3 ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {actionMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{actionMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionMessage(null)}
                className="text-xs underline hover:no-underline opacity-70"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. Metric Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[#e5e5e5] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6a6a6a]">
              <span>Pending Reviews</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-[#0a0a0a]">
              {pendingList.length}
            </div>
            <p className="text-[11px] text-amber-700 font-medium">
              {pendingList.length > 0 ? 'Action required: gift cards waiting' : 'All clear — no backlogged vouchers'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#e5e5e5] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6a6a6a]">
              <span>Active Subscriptions</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-[#0a0a0a]">
              {approvedList.length}
            </div>
            <p className="text-[11px] text-[#6a6a6a]">
              Students unlocked & studying
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#e5e5e5] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6a6a6a]">
              <span>Gross Voucher Value</span>
              <TrendingUp className="w-4 h-4 text-stone-700" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-[#0a0a0a]">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-[#6a6a6a]">
              Processed via Amazon Gift Cards
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#e5e5e5] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6a6a6a]">
              <span>10% Referral Payouts Due</span>
              <BadgePercent className="w-4 h-4 text-[#ff4d8b]" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-[#ff4d8b]">
              ₹{totalCommissionDue.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-[#6a6a6a]">
              Across {referrals.length} student recommendations
            </p>
          </div>
        </div>

        {/* 2. Interactive Navigation Tabs & Filter Bar */}
        <div className="bg-white rounded-2xl border border-[#e5e5e5] p-3 sm:p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => { setActiveTab('pending'); setStatusFilter('pending'); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'pending'
                    ? 'bg-[#0a0a0a] text-white shadow-xs'
                    : 'text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Approvals</span>
                {pendingList.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                    {pendingList.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('all'); setStatusFilter('all'); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'bg-[#0a0a0a] text-white shadow-xs'
                    : 'text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a]'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>All Submissions ({submissions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('referrals')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'referrals'
                    ? 'bg-[#0a0a0a] text-white shadow-xs'
                    : 'text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a]'
                }`}
              >
                <BadgePercent className="w-3.5 h-3.5" />
                <span>Referral Payouts (10% Cash)</span>
                {referrals.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#faf5e8] text-[#0a0a0a] border border-[#e5e5e5] text-[10px] font-bold">
                    {referrals.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'bg-[#0a0a0a] text-white shadow-xs'
                    : 'text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a]'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Security Token</span>
              </button>
            </div>

            {/* Search Input */}
            {activeTab !== 'settings' && (
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]" />
                <input
                  type="text"
                  placeholder="Search code, email, user ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#e5e5e5] bg-[#fffaf0] focus:bg-white focus:outline-none focus:border-[#0a0a0a] transition"
                />
              </div>
            )}
          </div>
        </div>

        {/* 3. Main Tab Contents */}
        {activeTab === 'pending' || activeTab === 'all' ? (
          <div className="bg-white rounded-2xl border border-[#e5e5e5] shadow-xs overflow-hidden">
            {filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#faf5e8] text-[#a0a0a0] flex items-center justify-center mx-auto">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-sm text-[#0a0a0a]">No Submissions Found</h3>
                <p className="text-xs text-[#6a6a6a] max-w-sm mx-auto">
                  {searchQuery ? 'No vouchers match your search criteria.' : 'No student vouchers in this category yet.'}
                </p>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={handleCreateDemoSubmission}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition mt-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>Create Sample Voucher Submission</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e5e5e5] bg-[#faf5e8]/60 text-[#6a6a6a] font-medium font-mono text-[11px]">
                      <th className="py-3 px-4">Claim Code</th>
                      <th className="py-3 px-4">Student & Account</th>
                      <th className="py-3 px-4">Plan & Prof</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Referral</th>
                      <th className="py-3 px-4">Submitted</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ebd8]">
                    {filteredSubmissions.map((sub) => {
                      const isPending = sub.status === 'pending';
                      const isApproved = sub.status === 'approved';
                      const isRejected = sub.status === 'rejected';

                      return (
                        <tr key={sub.id} className="hover:bg-[#fffaf0]/80 transition">
                          {/* Code with One-Click Copy */}
                          <td className="py-3.5 px-4 font-mono font-bold text-[#0a0a0a]">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-[#faf5e8] px-2 py-1 rounded-lg border border-[#e5e5e5] select-all">
                                {sub.gift_card_code}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(sub.id, sub.gift_card_code)}
                                className="p-1 rounded hover:bg-[#e5e5e5] text-[#6a6a6a] transition"
                                title="Copy Claim Code"
                              >
                                {copiedId === sub.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Student Info */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#0a0a0a]">{sub.user_name || 'Dr. Aspirant'}</div>
                            <div className="text-[11px] text-[#6a6a6a] truncate max-w-[180px]">
                              {sub.user_email || sub.user_id}
                            </div>
                          </td>

                          {/* Plan */}
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-[#0a0a0a] capitalize">
                              {sub.plan.replace('_', ' ')}
                            </span>
                            <div className="text-[10px] text-[#854d0e]">
                              {sub.prof_year}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 font-mono font-bold text-[#0a0a0a]">
                            ₹{sub.amount}
                          </td>

                          {/* Referral Code */}
                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            {sub.referral_code ? (
                              <span className="px-2 py-0.5 rounded-full bg-[#fce7f3] text-[#be185d] font-semibold border border-[#fbcfe8]">
                                {sub.referral_code}
                              </span>
                            ) : (
                              <span className="text-[#a0a0a0]">Direct</span>
                            )}
                          </td>

                          {/* Time */}
                          <td className="py-3.5 px-4 text-[11px] text-[#6a6a6a] whitespace-nowrap">
                            {new Date(sub.created_at).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                isPending
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : isApproved
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-red-100 text-red-800 border border-red-200'
                              }`}
                            >
                              {isPending && <Clock className="w-2.5 h-2.5" />}
                              {isApproved && <Check className="w-2.5 h-2.5" />}
                              {isRejected && <XCircle className="w-2.5 h-2.5" />}
                              {sub.status}
                            </span>
                            {sub.admin_notes && (
                              <p className="text-[10px] text-[#6a6a6a] mt-0.5 max-w-[150px] truncate" title={sub.admin_notes}>
                                {sub.admin_notes}
                              </p>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleApprove(sub.id)}
                                  disabled={isLoading}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] transition shadow-xs cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReject(sub.id)}
                                  disabled={isLoading}
                                  className="px-2.5 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-700 font-semibold text-[11px] transition cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#a0a0a0]">
                                {isApproved ? 'Unlocked' : 'Dismissed'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'referrals' ? (
          <div className="bg-white rounded-2xl border border-[#e5e5e5] shadow-xs overflow-hidden">
            {/* Header info */}
            <div className="p-4 border-b border-[#e5e5e5] bg-[#faf5e8]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <h3 className="font-display font-bold text-sm text-[#0a0a0a]">Student Referral Commission Ledger</h3>
                <p className="text-[#6a6a6a]">
                  You pay 10% commission on subscriptions directly to referrers via UPI / Gift Card.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-[#6a6a6a] uppercase tracking-wider font-mono">Total Outstanding</div>
                  <div className="font-bold text-[#ff4d8b] font-mono text-base">₹{totalCommissionDue}</div>
                </div>
              </div>
            </div>

            {filteredReferrals.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#faf5e8] text-[#a0a0a0] flex items-center justify-center mx-auto">
                  <BadgePercent className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-sm text-[#0a0a0a]">No Referrals Recorded Yet</h3>
                <p className="text-xs text-[#6a6a6a] max-w-sm mx-auto">
                  When students refer peers using their referral codes (e.g. DR-XXXX), 10% commission records appear here for your payout.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e5e5e5] bg-[#faf5e8]/60 text-[#6a6a6a] font-medium font-mono text-[11px]">
                      <th className="py-3 px-4">Referrer Code</th>
                      <th className="py-3 px-4">Referred Student</th>
                      <th className="py-3 px-4">Plan Purchased</th>
                      <th className="py-3 px-4">Sale Amount</th>
                      <th className="py-3 px-4">10% Commission</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Payout Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ebd8]">
                    {filteredReferrals.map((ref) => (
                      <tr key={ref.id} className="hover:bg-[#fffaf0]/80 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#0a0a0a]">
                          <span className="px-2 py-0.5 rounded-lg bg-[#fce7f3] text-[#be185d] font-semibold border border-[#fbcfe8]">
                            {ref.referrer_code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#0a0a0a]">
                          {ref.referred_email || ref.referred_user_id}
                        </td>
                        <td className="py-3.5 px-4 capitalize text-[#6a6a6a]">
                          {ref.plan.replace('_', ' ')}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          ₹{ref.amount}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                          ₹{ref.commission_due}
                        </td>
                        <td className="py-3.5 px-4 text-[#6a6a6a]">
                          {new Date(ref.created_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          {ref.commission_paid ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                              Paid
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePayoutReferral(ref.id)}
                              disabled={isLoading}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[10px] transition shadow-2xs cursor-pointer disabled:opacity-50"
                              title="Click to mark commission paid to referrer"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Settings / Token Tab */
          <div className="max-w-xl mx-auto bg-white rounded-2xl border border-[#e5e5e5] p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0a0a0a] text-white flex items-center justify-center font-bold">
                <Lock className="w-5 h-5 text-[#ffb084]" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-[#0a0a0a]">Admin Authentication Key</h3>
                <p className="text-xs text-[#6a6a6a]">Set your security token to authorize approval and rejection requests.</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-[#0a0a0a]">Current Admin Secret Key</label>
              <input
                type="text"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] bg-[#fffaf0] font-mono text-xs focus:outline-none focus:border-[#0a0a0a]"
                placeholder="Admin Secret Key"
              />
              <button
                type="button"
                onClick={() => fetchData(adminKey)}
                className="w-full py-2.5 rounded-xl bg-[#0a0a0a] hover:bg-[#222] text-[#fffaf0] font-semibold text-xs transition cursor-pointer shadow-xs"
              >
                Save & Test Connection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
