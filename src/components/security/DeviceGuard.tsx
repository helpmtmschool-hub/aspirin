import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowRight, RefreshCw } from 'lucide-react';
import { DeviceService } from '../../services/device';
import { useAppUser } from '../auth/AuthProvider';

import { motion, AnimatePresence } from 'motion/react';

export const DeviceGuard: React.FC = () => {
  const { user, isSignedIn, getToken } = useAppUser();
  const [conflictDetected, setConflictDetected] = useState(false);
  const [isReclaiming, setIsReclaiming] = useState(false);

  const userId = user?.id || 'aspirin_guest';

  // 1. Initial Device Registration on mount/login
  useEffect(() => {
    if (getToken) {
      DeviceService.setAuth(getToken);
    }
    if (isSignedIn && userId) {
      DeviceService.registerSession(userId);
    }
  }, [isSignedIn, userId, getToken]);

  // 2. Heartbeat interval check every 75 seconds
  useEffect(() => {
    if (!isSignedIn || !userId) return;

    const interval = setInterval(async () => {
      const res = await DeviceService.checkHeartbeat(userId);
      if (!res.active && res.reason === 'CONCURRENT_DEVICE_DETECTED') {
        setConflictDetected(true);
      }
    }, 75_000);

    return () => clearInterval(interval);
  }, [isSignedIn, userId]);

  const handleReclaimDevice = async () => {
    setIsReclaiming(true);
    try {
      await DeviceService.registerSession(userId);
      setConflictDetected(false);
    } finally {
      setIsReclaiming(false);
    }
  };

  return (
    <AnimatePresence>
      {conflictDetected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/60 backdrop-blur-md"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="w-full max-w-md bg-[#fffaf0] border border-[#e5e5e5] rounded-[24px] p-6 sm:p-8 shadow-2xl space-y-6 text-center text-[#0a0a0a]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Shield Warning Icon */}
            <div className="w-14 h-14 rounded-[18px] bg-[#ff6b5a]/15 border border-[#ff6b5a]/30 flex items-center justify-center text-[#ff4d8b] mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>

            {/* Warning Content */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ff6b5a]/10 text-[#d83a3a] border border-[#ff6b5a]/25 text-xs font-medium font-mono uppercase tracking-wider">
                1-Device Policy Active
              </div>
              <h3 className="font-display font-medium text-xl sm:text-2xl text-[#0a0a0a] tracking-tight">
                Account Active on Another Screen
              </h3>
              <p className="text-xs sm:text-sm text-[#3a3a3a] leading-relaxed">
                Your Aspirin account is currently streaming from another device or browser. To protect study groups and lecture integrity, only one active screen is permitted at a time.
              </p>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleReclaimDevice}
                disabled={isReclaiming}
                className="clay-btn-primary w-full py-3.5 px-5 rounded-[12px] bg-[#0a0a0a] hover:bg-[#1f1f1f] text-[#fffaf0] font-medium text-sm transition flex items-center justify-center gap-2 group"
              >
                {isReclaiming ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Transferring Session...
                  </>
                ) : (
                  <>
                    <span>Use on this device instead</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
