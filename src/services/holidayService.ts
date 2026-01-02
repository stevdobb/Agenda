
// src/services/holidayService.ts

import { format, addDays } from 'date-fns';

/**
 * Calculates Easter in the Gregorian/Western (Catholic and Protestant) calendar.
 * based on the algorithm by Oudin (1940) from http://www.tondering.dk/claus/cal/easter.php.
 * @param {number} year The year for which to calculate Easter.
 * @returns {Date} A Date object representing Easter Sunday for the given year.
 */
function getEaster(year: number): Date {
  const f = Math.floor;

  // Golden Number - 1
  const G = year % 19;
  const C = f(year / 100);

  // related to Epact
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;

  // number of days from 21 March to the Paschal full moon
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));

  // weekday for the Paschal full moon
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;

  // number of days from 21 March to the Sunday on or before the Paschal full moon
  const L = I - J;

  const month = 3 + f((L + 40) / 44); // 3 for March, 4 for April
  const day = L + 28 - 31 * f(month / 4);

  return new Date(year, month - 1, day);
}

function formatDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
}

export function getBelgianHolidays(year: number) {
  const easter = getEaster(year);
  const holidays = [
    { name: 'Nieuwjaar', date: formatDate(new Date(year, 0, 1)) },
    { name: 'Pasen', date: formatDate(easter) },
    { name: 'Paasmaandag', date: formatDate(addDays(easter, 1)) },
    { name: 'Dag van de Arbeid', date: formatDate(new Date(year, 4, 1)) },
    { name: 'O.L.H. Hemelvaart', date: formatDate(addDays(easter, 39)) },
    { name: 'Pinksteren', date: formatDate(addDays(easter, 49)) },
    { name: 'Pinkstermaandag', date: formatDate(addDays(easter, 50)) },
    { name: 'Nationale feestdag', date: formatDate(new Date(year, 6, 21)) },
    { name: 'O.L.V. Hemelvaart', date: formatDate(new Date(year, 7, 15)) },
    { name: 'Allerheiligen', date: formatDate(new Date(year, 10, 1)) },
    { name: 'Wapenstilstand', date: formatDate(new Date(year, 10, 11)) },
    { name: 'Kerstmis', date: formatDate(new Date(year, 11, 25)) },
  ];
  return holidays;
}

function getMonday(date: Date): Date {
  const monday = new Date(date);
  const day = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getIsoWeekStart(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const weekOneMonday = getMonday(jan4);
  const start = new Date(weekOneMonday);
  start.setDate(weekOneMonday.getDate() + (week - 1) * 7);
  return start;
}

function getFirstMondayOfApril(year: number): Date {
  const aprilFirst = new Date(year, 3, 1);
  const day = (aprilFirst.getDay() + 6) % 7;
  const monday = new Date(aprilFirst);
  if (day !== 0) {
    monday.setDate(aprilFirst.getDate() + (7 - day));
  }
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getBelgianSchoolHolidays(year: number) {
  const krokusStart = getIsoWeekStart(year, 9);
  const herfstStart = getIsoWeekStart(year, 44);

  const easter = getEaster(year);
  const aprilFifteenth = new Date(year, 3, 15);
  const paasStart = easter > aprilFifteenth ? addDays(easter, 1) : getFirstMondayOfApril(year);

  const christmas = new Date(year, 11, 25);
  const kerstStart = getMonday(christmas);

  return [
    { name: 'Krokusvakantie', startDate: formatDate(krokusStart), endDate: formatDate(addDays(krokusStart, 6)) },
    { name: 'Paasvakantie', startDate: formatDate(paasStart), endDate: formatDate(addDays(paasStart, 13)) },
    { name: 'Zomervakantie', startDate: formatDate(new Date(year, 6, 1)), endDate: formatDate(new Date(year, 7, 31)) },
    { name: 'Herfstvakantie', startDate: formatDate(herfstStart), endDate: formatDate(addDays(herfstStart, 6)) },
    { name: 'Kerstvakantie', startDate: formatDate(kerstStart), endDate: formatDate(addDays(kerstStart, 13)) },
  ];
}
