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
      const silkMatch = /silk/i.test(ua);
      setIsSilk(silkMatch);

      // Check for Fire TV Stick
      const fireTVMatch = /AFTM|AFT[BDIKMNRS]|AFTA|AFTS|AFTB|AFTT|AFTN|FireTV/i.test(ua);
      setIsFireTV(fireTVMatch);

      if (silkMatch || fireTVMatch) {
        // Apply meta viewport scaling for Amazon devices
        const viewport = document.querySelector('meta[name="viewport"]');
        console.log('viewport', viewport);
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=0.5, user-scalable=no');
        } else {
          // If viewport meta tag doesn't exist, create one
          const newViewport = document.createElement('meta');
          newViewport.setAttribute('name', 'viewport');
          newViewport.setAttribute('content', 'width=device-width, initial-scale=0.5, user-scalable=no');

          document.head.appendChild(newViewport);
        }
      }

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
