'use client';

import { useState, useEffect } from 'react';

/**
 * React hook to detect if the current browser is Amazon Silk or Fire TV Stick
 * @returns {Object} Object containing detection results
 */
export default function useAmazonDevice() {
  const [isAmazonDevice, setIsAmazonDevice] = useState(false);
  const [isSilk, setIsSilk] = useState(false);
  const [isFireTV, setIsFireTV] = useState(false);
  const [userAgent, setUserAgent] = useState('');

  useEffect(() => {
    // Only run on the client side
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent;
      setUserAgent(ua);

      // Check for Amazon Silk browser
      const silkMatch = /Silk/i.test(ua);
      setIsSilk(silkMatch);

      // Check for Fire TV Stick
      const fireTVMatch = /AFTM|AFT[BDIKMNRS]|AFTA|AFTS|AFTB|AFTT|AFTN|AFTSS|FireTV/i.test(ua);
      setIsFireTV(fireTVMatch);
      // Set overall Amazon device flag
      setIsAmazonDevice(silkMatch || fireTVMatch);
    }
  }, []);

  return {
    isAmazonDevice,
    isSilk,
    isFireTV,
    userAgent,
  };
}
