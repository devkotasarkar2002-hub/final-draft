
import NepaliDate from 'https://esm.sh/nepali-date-converter';
import { DateSystem } from '../types';

export const formatFarmDate = (timestamp: number, system: DateSystem = 'BS'): string => {
  const date = new Date(timestamp);
  if (system === 'BS') {
    try {
      const bsDate = new NepaliDate(date);
      return bsDate.format('YYYY-MM-DD') + ' BS';
    } catch (e) {
      return date.toLocaleDateString();
    }
  }
  return date.toLocaleDateString();
};

/**
 * Returns a dual-formatted string: "YYYY-MM-DD AD / YYYY-MM-DD BS"
 */
export const formatDualDate = (timestamp: number): string => {
  if (!timestamp) return '---';
  const date = new Date(timestamp);
  const adStr = date.toISOString().split('T')[0];
  try {
    const bsDate = new NepaliDate(date);
    const bsStr = bsDate.format('YYYY-MM-DD');
    return `${adStr} AD / ${bsStr} BS`;
  } catch (e) {
    return `${adStr} AD`;
  }
};

export const getBSDisplay = (adDateStr: string): string => {
  if (!adDateStr) return '';
  try {
    const date = new Date(adDateStr);
    const bsDate = new NepaliDate(date);
    return bsDate.format('YYYY-MM-DD') + ' BS';
  } catch (e) {
    return '';
  }
};

export const bsToAdString = (bsDateStr: string): string => {
  try {
    const bsDate = new NepaliDate(bsDateStr);
    const adDate = bsDate.toJsDate();
    return adDate.toISOString().split('T')[0];
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
};

export const formatBSFullDateTime = (date: Date): string => {
  try {
    const bsDate = new NepaliDate(date);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${bsDate.format('YYYY-MM-DD')} BS • ${timeStr}`;
  } catch (e) {
    return date.toLocaleString();
  }
};
