import type { Updater } from "@tanstack/vue-table"
import type { ClassValue } from "clsx"
import type { Ref } from "vue"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function valueUpdater<T extends Updater<any>>(updaterOrValue: T, ref: Ref) {
  ref.value
    = typeof updaterOrValue === "function"
      ? updaterOrValue(ref.value)
      : updaterOrValue
}

/**
 * Checks if two Date objects represent the same calendar day.
 * @param {Date} date1 The first date.
 * @param {Date} date2 The second date.
 * @returns {boolean} True if the dates are the same day, false otherwise.
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * Calculates the number of working days between two dates, excluding weekends and specified holidays.
 * @param {Date} startDate The start date of the range (inclusive).
 * @param {Date} endDate The end date of the range (inclusive).
 * @param {string[]} holidayDates An array of holiday dates in 'YYYY-MM-DD' string format.
 * @returns {number} The total number of working days.
 */
export function calculateWorkingDays(startDate: Date, endDate: Date, holidayDates: string[]): number {
  let workingDays = 0;
  const current = new Date(startDate); // Create a mutable copy

  // Convert holiday date strings to Date objects for easier comparison
  const holidays = holidayDates.map(hd => new Date(hd + 'T00:00:00')); // Ensure UTC for consistency

  while (current <= endDate) {
    const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

    let isHoliday = false;
    for (const holiday of holidays) {
      if (isSameDay(current, holiday)) {
        isHoliday = true;
        break;
      }
    }

    if (!isWeekend && !isHoliday) {
      workingDays++;
    }

    current.setDate(current.getDate() + 1); // Move to the next day
  }

  return workingDays;
}
