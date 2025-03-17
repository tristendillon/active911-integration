'use client';

import type { Alert } from '@/lib/types';
import { useDashboard } from '@/providers/dashboard-provider';
import { alertEmitter } from '@/hooks/use-alerts';
import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import NewAlertHeader from './new-alert-header';
import NewAlertSidebar from './new-alert-sidebar';
import NewAlertMap from './new-alert-map';

const MAX_NEW_ALERT_TIME = 180 * 1000; // 5 seconds for alert display
const ANIMATION_DELAY = 1.5 * 1000; // 1.5 seconds delay before setting isNewAlert

interface NewAlertPopoverProps {
  sound?: boolean;
}

export default function NewAlertPopover({ sound = true }: NewAlertPopoverProps) {
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);

  const {
    setIsNewAlert,
    center,
    units, // Get units from dashboard context
  } = useDashboard();
  // Check if the alert is relevant for the current user's units

  const dismissAlert = useCallback(() => {
    if (!currentAlert) return;

    // Start exit animation
    setIsAnimating(false);

    // First update isNewAlert to show dashboard behind the animation
    setIsNewAlert(false);

    // Stop the alert sound
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Then schedule clearing the alert after the animation finishes
    setTimeout(() => {
      setCurrentAlert(null);
    }, 1000); // Slightly longer than animation to ensure it completes
  }, [currentAlert, setIsNewAlert]);

  // Initialize audio element
  useEffect(() => {
    // Create audio element but don't autoplay it
    if (sound) {
      audioRef.current = new Audio('/alerts/new-alert.mp3');
      audioRef.current.loop = true;

      // Pre-load the audio file
      audioRef.current.load();
      setAudioInitialized(true);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setAudioInitialized(false);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [sound]);

  // Listen for new alerts
  useEffect(() => {
    function handleNewAlert(newAlert: Alert) {
      console.log('New alert received:', newAlert);

      // Only process the alert if it's relevant to user's units

      console.log('Alert is relevant for units:', units);

      // Show the new alert immediately but don't update isNewAlert yet
      setCurrentAlert(newAlert);
      setIsAnimating(true);

      // Play alert sound if initialized
      if (audioRef.current && audioInitialized && sound) {
        // Use a user interaction to play sound or show a button for the user to click
        const playPromise = audioRef.current.play();

        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.log('Auto-play was prevented. User interaction is required to play audio.');
            console.error(error);
            // We don't need to show the error as it's expected behavior in browsers
          });
        }
      }

      // Delay setting isNewAlert to allow animation to complete
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }

      animationTimeoutRef.current = setTimeout(() => {
        setIsNewAlert(true);
      }, ANIMATION_DELAY);
    }

    // Add event listener
    alertEmitter.on('new_alert', handleNewAlert);

    // Cleanup function
    return () => {
      alertEmitter.off('new_alert', handleNewAlert);
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [setIsNewAlert, units, audioInitialized, sound]);

  // Handle auto-dismiss timeout
  useEffect(() => {
    // If we have an alert, set up the timeout
    if (currentAlert && isAnimating) {
      // Clear any existing timeout first
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }

      // Set new timeout
      timeoutIdRef.current = setTimeout(() => {
        dismissAlert();
      }, MAX_NEW_ALERT_TIME);

      // Cleanup function
      return () => {
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = null;
        }
      };
    }
  }, [currentAlert, isAnimating, dismissAlert]);

  // Don't render anything if there's no alert
  if (!currentAlert) return null;
  return (
    <AnimatePresence>
      {currentAlert && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          initial={{ y: '100%' }}
          animate={{ y: isAnimating ? 0 : '100%' }}
          exit={{ y: '100%' }}
          transition={{
            type: 'spring',
            damping: 30,
            stiffness: 200,
            duration: 0.8,
          }}
        >
          <div className="bg-secondary h-full w-full flex flex-col">
            {/* Header */}
            <NewAlertHeader
              alert={currentAlert}
              onDismiss={dismissAlert}
              autoCloseTime={MAX_NEW_ALERT_TIME / 1000}
              onPlaySound={() => {
                if (audioRef.current && sound) {
                  audioRef.current.play().catch((err) => console.log('Error playing sound after user interaction:', err));
                }
              }}
            />

            {/* Main content area with sidebar and map */}
            <div className="flex-1 flex">
              <NewAlertSidebar alert={currentAlert} units={units} />
              <div className="flex-1 relative">
                <NewAlertMap alert={currentAlert} center={center} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
