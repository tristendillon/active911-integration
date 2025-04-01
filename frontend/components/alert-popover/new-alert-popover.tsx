import type { Alert } from '@/lib/types';
import { useDashboard } from '@/providers/dashboard-provider';
import { alertEmitter } from '@/hooks/use-alerts';
import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import NewAlertHeader from './new-alert-header';
import NewAlertSidebar from './new-alert-sidebar';
import NewAlertMap from './new-alert-map';
import { useAlertAudio } from '@/hooks/use-alert-audio';
import AlertItem from '../alert-item';
import useAmazonDevice from '@/hooks/use-amazon-device';
import { cn } from '@/lib/utils';

const MAX_NEW_ALERT_TIME = 120 * 1000; // 3 minutes
const ANIMATION_DELAY = 1500; // 1.5 seconds

interface NewAlertPopoverProps {
  sound?: boolean;
}
export default function NewAlertPopover({ sound = true }: NewAlertPopoverProps) {
  const { isFireTV } = useAmazonDevice();
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { playSound, stopSound } = useAlertAudio(sound);

  const { setIsNewAlert, map, units, alerts } = useDashboard();

  /** Dismiss the alert */
  const dismissAlert = useCallback(() => {
    if (!currentAlert) return;

    setIsAnimating(false);
    setIsNewAlert(false);
    stopSound();

    setTimeout(() => {
      setCurrentAlert(null);
    }, 1000); // Allow animation to complete
  }, [currentAlert, setIsNewAlert, stopSound]);

  /** Handle new alert event */
  useEffect(() => {
    function handleNewAlert(newAlert: Alert) {
      console.log('Received new_alert event:', newAlert.alert.description);
      setCurrentAlert(newAlert);
      setIsAnimating(true);

      stopSound(); // Ensure any existing audio stops
      playSound(); // Start new alert sound

      // Delay setting isNewAlert to allow animation to complete
      animationTimeoutRef.current = setTimeout(() => {
        setIsNewAlert(true);
      }, ANIMATION_DELAY);
    }

    // Log that we're setting up the listener
    console.log('Setting up new_alert event listener');
    alertEmitter.on('new_alert', handleNewAlert);

    return () => {
      console.log('Cleaning up new_alert event listener');
      alertEmitter.off('new_alert', handleNewAlert);
      clearTimeout(animationTimeoutRef.current!);
      stopSound();
    };
  }, [setIsNewAlert, playSound, stopSound]);

  /** Auto-dismiss after timeout */
  useEffect(() => {
    if (currentAlert && isAnimating) {
      timeoutIdRef.current = setTimeout(dismissAlert, MAX_NEW_ALERT_TIME);
    }

    return () => clearTimeout(timeoutIdRef.current!);
  }, [currentAlert, isAnimating, dismissAlert]);

  if (!currentAlert) return null;

  return (
    <AnimatePresence>
      {currentAlert && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          initial={{ y: '100%' }}
          animate={{ y: isAnimating ? 0 : '100%' }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 200 }}
        >
          <div className="bg-secondary h-screen w-full flex flex-col">
            <NewAlertHeader alert={currentAlert} onDismiss={dismissAlert} autoCloseTime={MAX_NEW_ALERT_TIME / 1000} isFireTV={isFireTV} />
            <div className="flex-1 flex flex-col h-[calc(100vh-10rem)] md:flex-row">
              <NewAlertSidebar alert={currentAlert} units={units} isFireTV={isFireTV} />
              <div className={cn('md:h-auto md:flex-1 relative', isFireTV ? 'h-[60vh]' : 'h-[50vh]')}>
                <NewAlertMap alert={currentAlert} center={map.center} isFireTV={isFireTV} />
{/*                 <div className={cn('absolute bottom-2 right-2 bg-secondary/70 rounded-md', isFireTV ? 'w-2/5 p-3' : 'w-1/2 p-2')}>
                  {alerts.data
                    .sort((a, b) => b.alert.stamp - a.alert.stamp)
                    .slice(0, 3)
                    .map((alert) => (
                      <AlertItem key={alert.alert.id} alert={alert} units={units} noEmit isFireTV={isFireTV} showDetails={{ lineClamp: 1, maxHeight: 'max-h-5' }} />
                    ))}
                </div> */}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
