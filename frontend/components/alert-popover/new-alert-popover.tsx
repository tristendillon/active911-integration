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

export default function NewAlertPopover() {
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    setIsNewAlert,
    center,
    units, // Get units from dashboard context
  } = useDashboard();
  // Check if the alert is relevant for the current user's units
  const isRelevantAlert = useCallback(
    (alert: Alert) => {
      if (!alert || !alert.alert || !alert.alert.units) {
        return false;
      }

      // Get alert units as an array
      const alertUnits = alert.alert.units.split(' ').filter((unit) => unit.trim() !== '');

      // Check if any user unit matches any alert unit
      return alertUnits.some((alertUnit) => units.some((userUnit) => userUnit === alertUnit));
    },
    [units]
  );

  const dismissAlert = useCallback(() => {
    if (!currentAlert) return;

    // Start exit animation
    setIsAnimating(false);

    // First update isNewAlert to show dashboard behind the animation
    setIsNewAlert(false);

    // Then schedule clearing the alert after the animation finishes
    setTimeout(() => {
      setCurrentAlert(null);
    }, 1000); // Slightly longer than animation to ensure it completes
  }, [currentAlert, setIsNewAlert]);

  // Listen for new alerts
  useEffect(() => {
    function handleNewAlert(newAlert: Alert) {
      console.log('New alert received:', newAlert);

      // Only process the alert if it's relevant to user's units
      if (isRelevantAlert(newAlert)) {
        console.log('Alert is relevant for units:', units);

        // Show the new alert immediately but don't update isNewAlert yet
        setCurrentAlert(newAlert);
        setIsAnimating(true);

        // Delay setting isNewAlert to allow animation to complete
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
        }

        animationTimeoutRef.current = setTimeout(() => {
          setIsNewAlert(true);
        }, ANIMATION_DELAY);
      } else {
        console.log('Alert ignored - not relevant for units:', units);
      }
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
  }, [setIsNewAlert, isRelevantAlert, units]);

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
            <NewAlertHeader alert={currentAlert} onDismiss={dismissAlert} autoCloseTime={MAX_NEW_ALERT_TIME / 1000} />

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
