'use client'

import type { Alert } from '@/lib/types';
import { useDashboard } from '@/providers/dashboard-provider';
import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import NewAlertHeader from './new-alert-header';
import NewAlertSidebar from './new-alert-sidebar';
import NewAlertMap from './new-alert-map';
import { useAlertAudio } from '@/hooks/use-alert-audio';

const MAX_NEW_ALERT_TIME = 120 * 1000; // 2 minutes
const ANIMATION_DELAY = 1500; // 1.5 seconds

interface NewAlertPopoverProps {
  sound?: boolean;
}

export default function NewAlertPopover({ sound = true }: NewAlertPopoverProps) {
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [alertTimestamp, setAlertTimestamp] = useState<number | null>(null);

  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoDismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dismissedRef = useRef(false);

  const { setIsNewAlert, units, emitListener } = useDashboard();
  const { playSound, stopSound } = useAlertAudio(sound);

  /** Dismiss the alert */
  const dismissAlert = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;

    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    if (autoDismissTimeoutRef.current) {
      clearTimeout(autoDismissTimeoutRef.current);
      autoDismissTimeoutRef.current = null;
    }

    setIsAnimating(false);
    setIsNewAlert(false);
    stopSound();

    setTimeout(() => {
      setCurrentAlert(null);
      setAlertTimestamp(null);
    }, 1000); // Allow exit animation to finish
  }, [setIsNewAlert, stopSound]);

  /** Get elapsed time since alert arrived in seconds */
  const getElapsedTime = useCallback(() => {
    if (!alertTimestamp) return 0;
    return Math.floor((Date.now() - alertTimestamp) / 1000);
  }, [alertTimestamp]);

  /** Reset alert UI state to prepare for a new alert */
  const resetAlertState = useCallback(() => {
    // Clear any existing timeouts
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    if (autoDismissTimeoutRef.current) {
      clearTimeout(autoDismissTimeoutRef.current);
      autoDismissTimeoutRef.current = null;
    }

    // Reset state
    dismissedRef.current = false;
    stopSound();
  }, [stopSound]);

  /** Handle new alert trigger */
  useEffect(() => {
    function handleNewAlert(newAlert: Alert) {
      // Reset alert state to handle overriding an existing alert
      resetAlertState();

      // Store the alert and timestamp
      setCurrentAlert(newAlert);
      const timestamp = new Date(newAlert.alert.stamp * 1000).getTime();
      setAlertTimestamp(timestamp);
      setIsAnimating(true);

      playSound();

      animationTimeoutRef.current = setTimeout(() => {
        if (!dismissedRef.current) {
          setIsNewAlert(true);
        }
      }, ANIMATION_DELAY);

      autoDismissTimeoutRef.current = setTimeout(() => {
        dismissAlert();
      }, MAX_NEW_ALERT_TIME);
    }

    emitListener('new_alert', handleNewAlert);

    return () => {
      resetAlertState();
    };
  }, [emitListener, setIsNewAlert, playSound, dismissAlert, resetAlertState]);

  if (!currentAlert) return null;

  // Calculate turnout time for use in child components
  const turnoutTimeSeconds = getElapsedTime();

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col justify-end"
        initial={{ y: '100%' }}
        animate={{ y: isAnimating ? 0 : '100%' }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 200 }}
        key={currentAlert.alert.id || Date.now()} // Add a key to ensure re-render when alert changes
      >
        <div className="bg-secondary h-full w-full flex flex-col">
          <NewAlertHeader
            alert={currentAlert}
            onDismiss={dismissAlert}
            autoCloseTime={MAX_NEW_ALERT_TIME / 1000}
            turnoutTimeSeconds={turnoutTimeSeconds > MAX_NEW_ALERT_TIME / 1000 ? 0 : turnoutTimeSeconds}
          />
          <div className="flex-1 flex flex-col h-[calc(100vh-10rem)] md:flex-row">
            <NewAlertSidebar
              alert={currentAlert}
              units={units}
            />
            <div className="md:h-auto md:flex-1 relative h-[60vh]">
              <NewAlertMap alert={currentAlert} />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}