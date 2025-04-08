import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAlertIcon(descriptor: string) {
  let icon: string;

  // Refactor this to have more icons in the future with a different way of handling the descriptor (constants? idk tbh)
  if (descriptor.includes('fire')) {
    icon = 'fire';
  } else {
    icon = 'medical';
  }

  return `/icons/${icon}.png`;
}
