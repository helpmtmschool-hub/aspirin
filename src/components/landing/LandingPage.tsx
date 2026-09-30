import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  BookOpen, 
  Video, 
  Zap, 
  ShieldCheck, 
  Users, 
  GraduationCap, 
  Clock, 
  Award, 
  ChevronRight,
  HelpCircle,
  Percent,
  PlayCircle,
  FileText,
  BookmarkCheck,
  Flame,
  Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SignInButton as ClerkSignInButton } from '@clerk/react';
import { isClerkConfigured } from '../auth/AuthProvider';
import { PLATFORMS, SUBJECT_VISUALS } from '../../services/api';
import { MBBSProf } from '../../types/lms';

interface LandingPageProps {
  onSignInClick?: () => void;
  onSelectPlan?: (plan: string, cycle: 'monthly' | 'yearly') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignInClick, onSelectPlan }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedProf, setSelectedProf] = useState<MBBSProf>('Final Prof Part 2');
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);

  // Live Countdown to Puja Special: 17th October 2026 23:59:59 IST
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

  const profSubjects: Record<MBBSProf, { name: string; icon: string; count: number; hours: string }[]> = {
    '1st Prof': [
      { name: 'Anatomy', icon: '🦴', count: 182, hours: '110 hrs' },
      { name: 'Physiology', icon: '⚡', count: 145, hours: '88 hrs' },
      { name: 'Biochemistry', icon: '🧬', count: 120, hours: '72 hrs' },
    ],
    '2nd Prof': [
      { name: 'Pathology', icon: '🔬', count: 210, hours: '135 hrs' },
      { name: 'Pharmacology', icon: '💊', count: 195, hours: '124 hrs' },
      { name: 'Microbiology', icon: '🦠', count: 160, hours: '98 hrs' },
    ],
    '3rd Prof Part 1': [
      { name: 'Community Medicine (PSM)', icon: '🏥', count: 140, hours: '84 hrs' },
      { name: 'Forensic Medicine (FMT)', icon: '⚖️', count: 68, hours: '40 hrs' },
    ],
    'Final Prof Part 2': [
      { name: 'Ophthalmology', icon: '👁️', count: 78, hours: '48 hrs' },
      { name: 'ENT (Otorhinolaryngology)', icon: '👂', count: 85, hours: '52 hrs' },
      { name: 'General Medicine', icon: '🩺', count: 320, hours: '210 hrs' },
      { name: 'General Surgery', icon: '🔪', count: 240, hours: '160 hrs' },
      { name: 'Obstetrics & Gynecology', icon: '👶', count: 220, hours: '145 hrs' },
      { name: 'Pediatrics', icon: '🧸', count: 110, hours: '75 hrs' },
      { name: 'Orthopedics', icon: '🦴', count: 58, hours: '38 hrs' },
      { name: 'Dermatology', icon: '🧴', count: 42, hours: '26 hrs' },
      { name: 'Psychiatry', icon: '🧠', count: 36, hours: '22 hrs' },
      { name: 'Radiology', icon: '🩻', count: 65, hours: '44 hrs' },
      { name: 'Anesthesiology', icon: '💉', count: 45, hours: '28 hrs' },
    ],
  };

  const handleEnrollClick = (plan: string) => {
    if (onSelectPlan) {
      onSelectPlan(plan, billingCycle);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffaf0] text-[#0a0a0a] flex flex-col font-sans selection:bg-[#ffb084] selection:text-[#0a0a0a]">
      {/* 1. Festive Urgency Announcement Bar */}
      <div className="bg-[#0a0a0a] text-[#fffaf0] py-2.5 px-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#e8b94a] text-[#0a0a0a] font-bold text-[10px]">
              🪔
            </span>
            <span className="font-medium text-[#faf5e8]">
              <strong className="text-[#e8b94a]">Maha Puja Festive Offer:</strong> Flat 75%–80% OFF on all MBBS & NEET-PG study passes!
            </span>
            <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-[#1a2a2a] text-[#a4d4c5] font-mono text-[10px] border border-[#2a3a3a]">
              Seats: 184 / 250 claimed
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <span className="text-[#a0a0a0] hidden sm:inline">Offer ends Oct 17:</span>
            <div className="flex items-center gap-1 font-bold text-[#ffb084]">
              <span className="px-1.5 py-0.5 rounded bg-[#1f1f1f] border border-[#333]">{String(timeLeft.days).padStart(2, '0')}d</span>
              <span>:</span>
              <span className="px-1.5 py-0.5 rounded bg-[#1f1f1f] border border-[#333]">{String(timeLeft.hours).padStart(2, '0')}h</span>
              <span>:</span>
              <span className="px-1.5 py-0.5 rounded bg-[#1f1f1f] border border-[#333]">{String(timeLeft.minutes).padStart(2, '0')}m</span>
              <span>:</span>
              <span className="px-1.5 py-0.5 rounded bg-[#1f1f1f] border border-[#333]">{String(timeLeft.seconds).padStart(2, '0')}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Header Navigation */}
      <header className="border-b border-[#e5e5e5] bg-[#fffaf0]/80 backdrop-blur-md sticky top-[41px] z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0a0a0a] text-[#fffaf0] flex items-center justify-center font-bold text-lg shadow-sm">
              ℞
            </div>
            <div>
              <span className="font-display font-extrabold text-xl tracking-tight text-[#0a0a0a]">Aspirin LMS</span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full bg-[#f5f0e0] text-[#ff4d8b] text-[10px] font-semibold border border-[#e5e5e5]">
                Medical Edition X
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href="#pricing" 
              className="text-xs font-semibold text-[#0a0a0a] hover:text-[#ff4d8b] transition px-3 py-1.5 hidden md:block"
            >
              Plans & Pricing
            </a>
            <a 
              href="#curriculum" 
              className="text-xs font-semibold text-[#0a0a0a] hover:text-[#ff4d8b] transition px-3 py-1.5 hidden md:block"
            >
              19 Subjects
            </a>
            <a 
              href="#features" 
              className="text-xs font-semibold text-[#0a0a0a] hover:text-[#ff4d8b] transition px-3 py-1.5 hidden md:block"
            >
              Edge Player
            </a>

            {isClerkConfigured ? (
              <ClerkSignInButton mode="modal">
                <button 
                  type="button"
                  className="px-4 py-2 rounded-xl bg-[#0a0a0a] hover:bg-[#222] text-[#fffaf0] text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Student Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </ClerkSignInButton>
            ) : (
              <button
                type="button"
                onClick={onSignInClick}
                className="px-4 py-2 rounded-xl bg-[#0a0a0a] hover:bg-[#222] text-[#fffaf0] text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Student Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. Hero Section */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b border-[#e5e5e5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] text-xs font-semibold text-[#0a0a0a] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></span>
            <span>PrepLadder Edition X + Marrow Edition 6 + Cerebellum Academy</span>
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-[#0a0a0a] tracking-tight leading-[1.08] max-w-4xl mx-auto mb-6">
            Every MBBS Subject. <br className="hidden sm:inline" />
            <span className="text-[#ff4d8b]">All 3 Top Curriculums.</span> <br />
            Zero Buffering.
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-[#6a6a6a] max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
            The edge-accelerated medical streaming platform built for MBBS university exams and NEET-PG / INI-CET. 
            Stream 3,950+ clinical lectures directly from Microsoft Azure CDN with instant seeking and high-yield notes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <a
              href="#pricing"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#0a0a0a] hover:bg-[#1f1f1f] text-[#fffaf0] font-semibold text-sm shadow-xl hover:shadow-2xl transition flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Get Festive Pass (Starts ₹199/mo)</span>
              <ArrowRight className="w-4 h-4 text-[#ffb084] group-hover:translate-x-1 transition-transform" />
            </a>

            <a
              href="#curriculum"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-[#faf5e8] border border-[#e5e5e5] text-[#0a0a0a] font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#6a6a6a]" />
              <span>Explore 19-Subject Syllabus</span>
            </a>
          </div>

          {/* Social Proof & Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-[#e5e5e5]">
            <div className="p-4 rounded-2xl bg-white/70 border border-[#e5e5e5]">
              <div className="font-display font-bold text-2xl md:text-3xl text-[#0a0a0a]">3,950+</div>
              <div className="text-xs text-[#6a6a6a] mt-0.5">High-Yield Video Lectures</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/70 border border-[#e5e5e5]">
              <div className="font-display font-bold text-2xl md:text-3xl text-[#0a0a0a]">19 / 19</div>
              <div className="text-xs text-[#6a6a6a] mt-0.5">All MBBS Subjects Covered</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/70 border border-[#e5e5e5]">
              <div className="font-display font-bold text-2xl md:text-3xl text-[#ff4d8b]">24 Master</div>
              <div className="text-xs text-[#6a6a6a] mt-0.5">PDF Clinical Textbooks</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/70 border border-[#e5e5e5]">
              <div className="font-display font-bold text-2xl md:text-3xl text-[#0a0a0a]">100+ Mbps</div>
              <div className="text-xs text-[#6a6a6a] mt-0.5">Zero-Buffer Azure CDN</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. The 3 Platforms Offering Grid */}
      <section className="py-16 md:py-20 bg-[#faf5e8] border-b border-[#e5e5e5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ff4d8b]">Unrivaled Breadth</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#0a0a0a] mt-1">
              Why Choose One Platform When You Need All Three?
            </h2>
            <p className="text-sm text-[#6a6a6a] mt-2">
              Official apps force you to spend ₹80,000+ to access different faculties. Aspirin LMS aggregates the best of every curriculum.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* PrepLadder */}
            <div className="rounded-3xl bg-white border border-[#e5e5e5] p-6 shadow-sm flex flex-col justify-between hover:border-[#ffb084] transition">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full bg-[#eff6ff] text-blue-700 text-xs font-bold border border-blue-200">
                    EDITION X
                  </span>
                  <span className="text-xs text-[#6a6a6a] font-mono">19 Subjects</span>
                </div>
                <h3 className="font-display font-bold text-xl text-[#0a0a0a] mb-2">PrepLadder Edition X</h3>
                <p className="text-xs text-[#6a6a6a] leading-relaxed mb-4">
                  Full English & Hinglish clinical video lectures across all 19 subjects. Featuring Dr. Deepak Marwah, Dr. Pritesh Singh, Dr. Rajesh Gubba.
                </p>
                <ul className="space-y-2 text-xs text-[#3a3a3a] mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                    <span>English Track (1,214 Lectures)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                    <span>Hinglish Track (1,165 Lectures)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                    <span>Complete Pre, Para & Clinical coverage</span>
                  </li>
                </ul>
              </div>
              <div className="pt-4 border-t border-[#f0f0f0] text-[11px] text-[#6a6a6a]">
                Standard standalone cost: ~₹32,000/yr
              </div>
            </div>

            {/* Marrow */}
            <div className="rounded-3xl bg-white border border-[#e5e5e5] p-6 shadow-sm flex flex-col justify-between hover:border-[#a4d4c5] transition">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full bg-[#ecfdf5] text-emerald-700 text-xs font-bold border border-emerald-200">
                    EDITION 6
                  </span>
                  <span className="text-xs text-[#6a6a6a] font-mono">Clinical Final Year</span>
                </div>
                <h3 className="font-display font-bold text-xl text-[#0a0a0a] mb-2">Marrow Edition 6</h3>
                <p className="text-xs text-[#6a6a6a] leading-relaxed mb-4">
                  The gold standard for Final Year MBBS and NEET-PG clinical subjects. Surgery, OBG, Pediatrics, Orthopedics, Derma, Psychiatry, Radiology & Anesthesia.
                </p>
                <ul className="space-y-2 text-xs text-[#3a3a3a] mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                    <span>504 High-Bitrate Master Lectures</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                    <span>Dr. Rohan Khandelwal (Surgery)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                    <span>Dr. Sakshi Arora (Obstetrics & Gynecology)</span>
                  </li>
                </ul>
              </div>
              <div className="pt-4 border-t border-[#f0f0f0] text-[11px] text-[#6a6a6a]">
                Standard standalone cost: ~₹48,000/yr
              </div>
            </div>

            {/* Cerebellum */}
            <div className="rounded-3xl bg-white border border-[#e5e5e5] p-6 shadow-sm flex flex-col justify-between hover:border-[#b8a4ed] transition">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full bg-[#fdf2f8] text-rose-700 text-xs font-bold border border-rose-200">
                    CEREBELLUM
                  </span>
                  <span className="text-xs text-[#6a6a6a] font-mono">Legendary Faculty</span>
                </div>
                <h3 className="font-display font-bold text-xl text-[#0a0a0a] mb-2">Cerebellum Academy</h3>
                <p className="text-xs text-[#6a6a6a] leading-relaxed mb-4">
                  Beloved individual faculty masterclasses + 24 complete color review PDF textbooks by top Indian medical professors.
                </p>
                <ul className="space-y-2 text-xs text-[#3a3a3a] mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                    <span>Dr. Shrikant Verma (Anatomy)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                    <span>Dr. Gobind Rai Garg (Pharmacology)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                    <span>24 Full-Subject Master Books (PDF)</span>
                  </li>
                </ul>
              </div>
              <div className="pt-4 border-t border-[#f0f0f0] text-[11px] text-[#6a6a6a]">
                Standard standalone cost: ~₹24,000/yr
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Interactive Curriculum Matrix */}
      <section id="curriculum" className="py-16 md:py-20 border-b border-[#e5e5e5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ff4d8b]">Full MBBS Syllabus</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#0a0a0a] mt-1">
              Explore All 19 MBBS Subjects
            </h2>
            <p className="text-sm text-[#6a6a6a] mt-2">
              Select your academic professional year to see syllabus breakdown, module counts, and video lecture hours.
            </p>
          </div>

          {/* Prof Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {(['1st Prof', '2nd Prof', '3rd Prof Part 1', 'Final Prof Part 2'] as MBBSProf[]).map((prof) => (
              <button
                key={prof}
                type="button"
                onClick={() => setSelectedProf(prof)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  selectedProf === prof
                    ? 'bg-[#0a0a0a] text-[#fffaf0] shadow-sm'
                    : 'bg-white text-[#6a6a6a] border border-[#e5e5e5] hover:text-[#0a0a0a]'
                }`}
              >
                {prof}
              </button>
            ))}
          </div>

          {/* Subject Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profSubjects[selectedProf]?.map((subj) => (
              <div 
                key={subj.name}
                className="p-5 rounded-2xl bg-white border border-[#e5e5e5] shadow-xs flex items-center justify-between hover:border-[#0a0a0a] transition group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[#faf5e8] flex items-center justify-center text-2xl border border-[#e5e5e5] group-hover:scale-105 transition-transform">
                    {subj.icon}
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-[#0a0a0a]">{subj.name}</h4>
                    <p className="text-xs text-[#6a6a6a] flex items-center gap-2 mt-0.5">
                      <span>{subj.count} Lectures</span>
                      <span>•</span>
                      <span>{subj.hours}</span>
                    </p>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-[#faf5e8] flex items-center justify-center text-[#0a0a0a] group-hover:bg-[#0a0a0a] group-hover:text-white transition">
                  <PlayCircle className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Edge Player & Anti-Piracy Features */}
      <section id="features" className="py-16 md:py-20 bg-[#faf5e8] border-b border-[#e5e5e5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ff4d8b]">Engineered for Study Groups</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#0a0a0a] mt-1">
              Purpose-Built for High-Yield Retention
            </h2>
            <p className="text-sm text-[#6a6a6a] mt-2">
              Unlike clumsy Telegram drives or sluggish Google Drive folders, Aspirin LMS delivers a true cinematic study app.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-[#e5e5e5]">
              <div className="w-10 h-10 rounded-xl bg-[#eff6ff] text-blue-600 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-base text-[#0a0a0a] mb-1">0-Buffering Seeking</h3>
              <p className="text-xs text-[#6a6a6a] leading-relaxed">
                Direct Byte-Range HTTP 206 streaming straight from Microsoft Azure CDN. Scrub forward 20 minutes with zero lag.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-[#e5e5e5]">
              <div className="w-10 h-10 rounded-xl bg-[#fdf2f8] text-pink-600 flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-base text-[#0a0a0a] mb-1">0.75x to 2.5x Speeds</h3>
              <p className="text-xs text-[#6a6a6a] leading-relaxed">
                High-clarity audio pitch preservation. Power through 3-hour surgery marathons in half the time without vocal distortion.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-[#e5e5e5]">
              <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] text-emerald-600 flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-base text-[#0a0a0a] mb-1">In-App Master Books</h3>
              <p className="text-xs text-[#6a6a6a] leading-relaxed">
                24 complete faculty revision books embedded directly alongside videos. Read Dr. Shrikant Verma while watching anatomy.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-[#e5e5e5]">
              <div className="w-10 h-10 rounded-xl bg-[#fefce8] text-amber-600 flex items-center justify-center mb-4">
                <BookmarkCheck className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-base text-[#0a0a0a] mb-1">Timestamped Notes</h3>
              <p className="text-xs text-[#6a6a6a] leading-relaxed">
                Jot down personal clinical mnemonics linked to the exact second. Saved automatically to your cloud study profile.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Psychologically Anchored Festive Pricing Section */}
      <section id="pricing" className="py-16 md:py-24 border-b border-[#e5e5e5] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fefce8] border border-[#e8b94a] text-xs font-bold text-[#b45309] mb-3">
              <span>🪔</span>
              <span>Durga Puja & Dussehra Special • Valid Till 17th October 2026</span>
            </div>
            <h2 className="font-display font-bold text-3xl sm:text-5xl text-[#0a0a0a] tracking-tight">
              Invest in Your Medical Degree. <br />
              <span className="text-[#ff4d8b]">Less Than the Price of Hospital Chai.</span>
            </h2>
            <p className="text-sm sm:text-base text-[#6a6a6a] mt-3">
              Official medical app subscriptions cost over ₹75,000/year. Claim your subsidized Puja pass today with instant activation.
            </p>

            {/* Monthly / Yearly Toggle */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <span className={`text-xs font-semibold ${billingCycle === 'monthly' ? 'text-[#0a0a0a]' : 'text-[#6a6a6a]'}`}>
                Monthly Pass
              </span>
              <button
                type="button"
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="w-14 h-8 rounded-full bg-[#0a0a0a] p-1 flex items-center transition cursor-pointer"
              >
                <div
                  className={`w-6 h-6 rounded-full bg-[#fffaf0] transition-transform shadow-xs ${
                    billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-semibold ${billingCycle === 'yearly' ? 'text-[#0a0a0a]' : 'text-[#6a6a6a]'}`}>
                  Annual Pass
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#ff4d8b] text-white text-[10px] font-bold uppercase tracking-wider animate-bounce">
                  Save 75%
                </span>
              </div>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            {/* PRO TIER */}
            <div className="rounded-3xl bg-white border border-[#e5e5e5] p-8 shadow-sm flex flex-col justify-between hover:border-[#0a0a0a] transition">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display font-bold text-2xl text-[#0a0a0a]">Pro Pass</h3>
                    <p className="text-xs text-[#6a6a6a] mt-0.5">Year-Specific University Prep</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#f5f0e0] text-[#0a0a0a] text-xs font-bold border border-[#e5e5e5]">
                    1 Prof Year
                  </span>
                </div>

                {/* Price Display */}
                <div className="mb-6 pt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-[#9a9a9a] line-through font-mono">
                      {billingCycle === 'monthly' ? '₹999' : '₹4,999'}
                    </span>
                    <span className="font-display font-extrabold text-4xl text-[#0a0a0a]">
                      {billingCycle === 'monthly' ? '₹199' : '₹1,299'}
                    </span>
                    <span className="text-xs text-[#6a6a6a]">
                      {billingCycle === 'monthly' ? '/ month' : '/ year'}
                    </span>
                  </div>

                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f0fdf4] text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {billingCycle === 'monthly' 
                        ? '₹6.60 / day — Impulse trial entry' 
                        : '₹3.50 / day (Effective ₹108/mo)'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#6a6a6a] mb-6">
                  Perfect for MBBS students focusing strictly on topping their upcoming professional exams (1st, 2nd, 3rd, or Final Prof).
                </p>

                <div className="space-y-3 text-xs text-[#3a3a3a] mb-8">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                    <span>Full access to <strong>1 Selected Prof Year</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                    <span>PrepLadder X (English & Hinglish) for chosen prof</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                    <span>Full 0.75x–2.5x player & timestamped notes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                    <span>0-Buffer Azure CDN Edge streaming</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#9a9a9a]">
                    <span className="w-4 h-4 flex items-center justify-center font-bold text-xs">✕</span>
                    <span>Remaining 3 Prof Years locked</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#9a9a9a]">
                    <span className="w-4 h-4 flex items-center justify-center font-bold text-xs">✕</span>
                    <span>Marrow Edition 6 Clinical Masterclass</span>
                  </div>
                </div>
              </div>

              <div>
                {isClerkConfigured ? (
                  <ClerkSignInButton mode="modal">
                    <button
                      type="button"
                      onClick={() => handleEnrollClick('pro')}
                      className="w-full py-3.5 rounded-xl bg-white hover:bg-[#faf5e8] border border-[#0a0a0a] text-[#0a0a0a] font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <span>Select Pro Plan ({billingCycle === 'monthly' ? '₹199' : '₹1,299'})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </ClerkSignInButton>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleEnrollClick('pro');
                      if (onSignInClick) onSignInClick();
                    }}
                    className="w-full py-3.5 rounded-xl bg-white hover:bg-[#faf5e8] border border-[#0a0a0a] text-[#0a0a0a] font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Select Pro Plan ({billingCycle === 'monthly' ? '₹199' : '₹1,299'})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* PREMIUM TIER (THE HERO) */}
            <div className="rounded-3xl bg-[#0a0a0a] text-[#fffaf0] p-8 shadow-2xl flex flex-col justify-between relative border-2 border-[#e8b94a] transform md:-translate-y-2">
              {/* Badge */}
              <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#e8b94a] to-[#ff4d8b] text-[#0a0a0a] font-extrabold text-[10px] uppercase tracking-wider shadow-md">
                ⭐ Most Popular • 75% OFF
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display font-bold text-2xl text-[#fffaf0]">Premium All-Access</h3>
                    <p className="text-xs text-[#a0a0a0] mt-0.5">The Complete 19-Subject Warchest</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#1a2a2a] text-[#e8b94a] text-xs font-bold border border-[#e8b94a]/30">
                    ALL 19 SUBJECTS
                  </span>
                </div>

                {/* Price Display */}
                <div className="mb-6 pt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-[#666] line-through font-mono">
                      {billingCycle === 'monthly' ? '₹1,999' : '₹9,999'}
                    </span>
                    <span className="font-display font-extrabold text-4xl text-[#fffaf0]">
                      {billingCycle === 'monthly' ? '₹399' : '₹2,499'}
                    </span>
                    <span className="text-xs text-[#a0a0a0]">
                      {billingCycle === 'monthly' ? '/ month' : '/ year'}
                    </span>
                  </div>

                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1f1f1f] text-[#ffb084] text-[11px] font-semibold border border-[#333]">
                    <Flame className="w-3.5 h-3.5 text-[#ff4d8b]" />
                    <span>
                      {billingCycle === 'monthly'
                        ? 'Just ₹13 / day — All 19 Subjects'
                        : '₹6.80 / day (Effective ₹208/mo — Saves ₹7,500!)'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#a0a0a0] mb-6">
                  For just ₹9 more per month than Pro, unlock every single lecture, Marrow clinical surgery, and 24 Master textbooks.
                </p>

                <div className="space-y-3 text-xs text-[#e5e5e5] mb-8">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#e8b94a] shrink-0" />
                    <span><strong>All 19 MBBS Subjects</strong> (Pre, Para & Clinical)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#e8b94a] shrink-0" />
                    <span><strong>PrepLadder Edition X</strong> (English + Hinglish, 2,379 lectures)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#e8b94a] shrink-0" />
                    <span><strong>Marrow Edition 6</strong> Clinical Final Year (504 lectures)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#e8b94a] shrink-0" />
                    <span><strong>Cerebellum Academy</strong> Faculty Tracks (1,636 lectures)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#e8b94a] shrink-0" />
                    <span><strong>24 Master PDF Textbooks</strong> (Dr. Shrikant Verma, Dr. Ankur Jain)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#e8b94a] shrink-0" />
                    <span>Priority High-Speed Edge CDN + Telegram Study Concierge</span>
                  </div>
                </div>
              </div>

              <div>
                {isClerkConfigured ? (
                  <ClerkSignInButton mode="modal">
                    <button
                      type="button"
                      onClick={() => handleEnrollClick('premium')}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-[#e8b94a] to-[#ff4d8b] hover:opacity-95 text-[#0a0a0a] font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                    >
                      <span>Unlock Complete All-Access ({billingCycle === 'monthly' ? '₹399' : '₹2,499'})</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </ClerkSignInButton>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleEnrollClick('premium');
                      if (onSignInClick) onSignInClick();
                    }}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#e8b94a] to-[#ff4d8b] hover:opacity-95 text-[#0a0a0a] font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <span>Unlock Complete All-Access ({billingCycle === 'monthly' ? '₹399' : '₹2,499'})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Guarantee Note */}
          <div className="max-w-xl mx-auto text-center mt-8 text-xs text-[#6a6a6a] flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
            <span>Anonymous UPI Payment via Amazon Gift Card. No recurring auto-debit traps.</span>
          </div>
        </div>
      </section>

      {/* 8. Viral Referral Program Section */}
      <section className="py-14 bg-[#faf5e8] border-b border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white border border-[#e5e5e5] p-6 sm:p-10 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#ff4d8b] text-white flex items-center justify-center shrink-0 shadow-md">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff4d8b]">Batchmate Referral Pass</span>
                <h3 className="font-display font-bold text-xl sm:text-2xl text-[#0a0a0a] mt-0.5">
                  Have a Senior's or Friend's Referral Code?
                </h3>
                <p className="text-xs text-[#6a6a6a] mt-1 leading-relaxed max-w-xl">
                  Enter your friend's code at checkout to receive an <strong>extra 10% instant discount</strong> on your Puja Pass. 
                  Share your own code with your hostel floor to unlock free study months!
                </p>
              </div>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              {isClerkConfigured ? (
                <ClerkSignInButton mode="modal">
                  <button
                    type="button"
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0a0a0a] hover:bg-[#222] text-[#fffaf0] font-semibold text-xs shadow-sm transition cursor-pointer"
                  >
                    Sign In to Apply Code
                  </button>
                </ClerkSignInButton>
              ) : (
                <button
                  type="button"
                  onClick={onSignInClick}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0a0a0a] hover:bg-[#222] text-[#fffaf0] font-semibold text-xs shadow-sm transition cursor-pointer"
                >
                  Sign In to Apply Code
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ Section */}
      <section className="py-16 md:py-20 border-b border-[#e5e5e5]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ff4d8b]">Got Questions?</span>
            <h2 className="font-display font-bold text-3xl text-[#0a0a0a] mt-1">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'How does the Amazon Gift Card payment method work?',
                a: 'To guarantee 100% privacy and zero bank statement disclosures, you simply purchase an Amazon Pay eGift Card for the exact plan amount (e.g. ₹199 or ₹2,499) using your standard UPI (Google Pay, PhonePe, Paytm). Paste the 16-character code into the app. Your pass is verified and unlocked by our concierge within 15–30 minutes.',
              },
              {
                q: 'Can I watch lectures on my smartphone or tablet?',
                a: 'Yes! Aspirin LMS is fully responsive on iOS Safari, Android Chrome, iPads, and Mac/Windows laptops. The edge video player supports native full-screen, picture-in-picture, and multi-speed controls on all mobile devices.',
              },
              {
                q: 'What is the 1-Device Active Session policy?',
                a: 'To protect the platform from unauthorized group sharing, your account is bound to 1 active streaming session at a time. You can switch between your phone and laptop freely, but simultaneous streaming on two screens will pause the previous device.',
              },
              {
                q: 'How does the referral discount work?',
                a: 'When you sign in, you can enter any batchmate’s referral code during voucher submission to claim an extra 10% discount. Once enrolled, your profile displays your own unique code that you can share with hostel batchmates.',
              },
              {
                q: 'Are the 24 Master Books downloadable or viewable in-app?',
                a: 'The 24 Master PDF textbooks are rendered directly within our high-speed secure in-app PDF Reader (NotesReader.tsx), complete with table-of-contents bookmarks and search.',
              },
            ].map((faq, i) => (
              <div 
                key={i}
                className="rounded-2xl bg-white border border-[#e5e5e5] overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setSelectedFaq(selectedFaq === i ? null : i)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-[#0a0a0a] cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronRight className={`w-4 h-4 text-[#6a6a6a] transition-transform ${selectedFaq === i ? 'rotate-90' : ''}`} />
                </button>
                {selectedFaq === i && (
                  <div className="px-5 pb-4 text-xs text-[#6a6a6a] leading-relaxed border-t border-[#f5f0e0] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="py-10 bg-[#fffaf0] text-center text-xs text-[#6a6a6a]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0a0a0a]">Aspirin LMS</span>
            <span>• Edge Medical Education</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Durga Puja Special Offer valid until 17th October 2026</span>
            <span>•</span>
            <a href="https://t.me/" target="_blank" rel="noreferrer" className="text-[#ff4d8b] hover:underline">
              Telegram Concierge Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
