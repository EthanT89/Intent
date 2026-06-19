// Minimal iCalendar (.ics) parser — enough to read Google / Apple / any public
// calendar feed into our event shape. Read-only: we never write back.
//
// Returns events shaped like native ones so expandEvent() / the adapters can
// treat them identically: { id, title, start, end, allDay, notes, location, recur, until }.

import { pad2 } from './model.js';

// Unfold RFC5545 line folding (continuation lines start with space or tab).
function unfold(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

function unescape(s) {
  return String(s || '').replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

// Parse a DTSTART/DTEND value (+ its params) into { value, allDay }.
//   20260619                  -> all-day  '2026-06-19'
//   20260619T090000           -> local    '2026-06-19T09:00'
//   20260619T090000Z          -> UTC -> local
function parseDate(params, raw) {
  const isDate = /VALUE=DATE(?!-TIME)/i.test(params) || /^\d{8}$/.test(raw);
  const y = +raw.slice(0, 4), mo = +raw.slice(4, 6), d = +raw.slice(6, 8);
  if (isDate) return { value: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`, allDay: true };
  const h = +raw.slice(9, 11), mi = +raw.slice(11, 13), s = +raw.slice(13, 15) || 0;
  let dt;
  if (/Z$/.test(raw)) dt = new Date(Date.UTC(y, mo - 1, d, h, mi, s)); // UTC → local
  else dt = new Date(y, mo - 1, d, h, mi, s);                          // floating / TZID → treat as local
  return { value: `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}T${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`, allDay: false };
}

function mapRRule(rrule) {
  const parts = Object.fromEntries(rrule.split(';').map(p => p.split('=')));
  const freq = (parts.FREQ || '').toUpperCase();
  let recur = 'none';
  if (freq === 'DAILY') recur = 'daily';
  else if (freq === 'MONTHLY') recur = 'monthly';
  else if (freq === 'WEEKLY') {
    const byday = (parts.BYDAY || '').toUpperCase();
    recur = (byday && /MO/.test(byday) && /FR/.test(byday) && !/SA|SU/.test(byday) && byday.split(',').length === 5) ? 'weekday' : 'weekly';
  }
  let until = null;
  if (parts.UNTIL) { const u = parts.UNTIL; until = `${u.slice(0, 4)}-${u.slice(4, 6)}-${u.slice(6, 8)}`; }
  return { recur, until };
}

export function parseICS(text, subId = 'sub') {
  if (!text || typeof text !== 'string') return [];
  const lines = unfold(text).split('\n');
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') {
      if (cur && cur.start && cur.title) {
        events.push({
          id: `${subId}:${cur.uid || cur.title}-${cur.start}`,
          title: cur.title,
          start: cur.start, end: cur.end || cur.start,
          allDay: !!cur.allDay,
          notes: cur.notes || '', location: cur.location || '',
          recur: cur.recur || 'none', until: cur.until || null,
          source: 'sub', subId,
        });
      }
      cur = null; continue;
    }
    if (!cur) continue;
    const ci = line.indexOf(':');
    if (ci < 0) continue; // tolerate odd lines
    const left = line.slice(0, ci);
    const value = line.slice(ci + 1);
    const [name, ...paramParts] = left.split(';');
    const params = paramParts.join(';');
    switch (name.toUpperCase()) {
      case 'SUMMARY': cur.title = unescape(value); break;
      case 'DESCRIPTION': cur.notes = unescape(value); break;
      case 'LOCATION': cur.location = unescape(value); break;
      case 'UID': cur.uid = value.trim(); break;
      case 'DTSTART': { const r = parseDate(params, value.trim()); cur.start = r.value; cur.allDay = r.allDay; break; }
      case 'DTEND': { const r = parseDate(params, value.trim()); cur.end = r.allDay ? cur.start : r.value; break; }
      case 'RRULE': { const r = mapRRule(value.trim()); cur.recur = r.recur; cur.until = r.until; break; }
      default: break;
    }
  }
  return events;
}
