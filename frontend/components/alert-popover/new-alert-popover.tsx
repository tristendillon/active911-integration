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

  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoDismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dismissedRef = useRef(false);

  const { setIsNewAlert, map, units, emitListener } = useDashboard();
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
    }, 1000); // Allow exit animation to finish
  }, [setIsNewAlert, stopSound]);

  /** Handle new alert trigger */
  useEffect(() => {
    function handleNewAlert(newAlert: Alert) {
      dismissedRef.current = false;

      // Clear any existing timeouts
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (autoDismissTimeoutRef.current) clearTimeout(autoDismissTimeoutRef.current);

      setCurrentAlert(newAlert);
      setIsAnimating(true);

      stopSound();
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
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (autoDismissTimeoutRef.current) clearTimeout(autoDismissTimeoutRef.current);
      stopSound();
    };
  }, [emitListener, setIsNewAlert, playSound, stopSound, dismissAlert]);

  if (!currentAlert) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col justify-end"
        initial={{ y: '100%' }}
        animate={{ y: isAnimating ? 0 : '100%' }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 200 }}
      >
        <div className="bg-secondary h-full w-full flex flex-col">
          <NewAlertHeader
            alert={currentAlert}
            onDismiss={dismissAlert}
            autoCloseTime={MAX_NEW_ALERT_TIME / 1000}
          />
          <div className="flex-1 flex flex-col h-[calc(100vh-10rem)] md:flex-row">
            <NewAlertSidebar alert={currentAlert} units={units} />
            <div className="md:h-auto md:flex-1 relative h-[60vh]">
              <NewAlertMap alert={currentAlert} center={map.center} />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
