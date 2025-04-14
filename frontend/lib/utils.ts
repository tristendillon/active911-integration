import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const fireDescriptors = ['fire', 'burn', 'smoke', 'explosion', 'bomb'];


export function getAlertIcon(input: string) {
  let icon: string;
  const descriptor = input.toLowerCase();
  // Refactor this to have more icons in the future with a different way of handling the descriptor (constants? idk tbh)
  if (fireDescriptors.some(desc => descriptor.includes(desc))) {
    icon = 'fire';
  } else {
    icon = 'medical';
  }

  return `/icons/${icon}.png`;
}

export const getFlowRateColor = (flow_rate: number) => {
  if (flow_rate < 500) {
    return 'red';
  } else if (flow_rate >= 500 && flow_rate < 1000) {
    return 'orange';
  } else if (flow_rate >= 1000 && flow_rate < 1500) {
    return 'green';
  } else {
    return 'blue';
  }
};

export const getLatLngDistances = (latlng1: google.maps.LatLng, latlng2: google.maps.LatLng) => {
  const distance = google.maps.geometry.spherical.computeDistanceBetween(latlng1, latlng2);
  return distance;
}
