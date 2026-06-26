import React, { createContext, useContext, useMemo } from 'react';
import { usePersistentState, clearAllAppData } from './usePersistentState.js';
import { todayKey, intentTodayKey, isThisYear } from '../lib/dates.js';
import { LIBIO_BOOKS_SEED } from '../pillars/reading/data.js';
import { MOVEMENT_SEED, uid, ruleId } from '../pillars/movement/model.js';
import { CAL_SEED, uid as calUid } from '../pillars/calendar/model.js';
import { uid as billUid } from '../pillars/calendar/bills.js';
import { PILLARS } from '../pillars/registry.js';
import { useCloudSync } from '../lib/cloudSync.js';

// All app data lives here, split into independently-persisted slices.
// Adding a pillar with its own data = add a slice here (or persist inside the
// pillar with usePersistentState directly if nothing else needs it).

const AppStateContext = createContext(null);

export const DEFAULT_SETTINGS = {
  userName: 'Ethan',
  theme: 'parchment',
  bgColor: '#E8E0D4',
  accentColor: '#C4956A',
  showGreeting: true,
  showDate: true,
  // Order + visibility as last set in the design session:
  // routine / coffee / reading on, the still-stubbed pillars hidden.
  pillarOrder: ['deepwork', 'reading', 'coffee', 'routine', 'movement', 'nourishment', 'reflection'],
  pillarVis: {
    deepwork: false,
    movement: true,
    routine: true,
    coffee: true,
    nourishment: false,
    reading: true,
    reflection: false,
  },
  notifEnabled: false,
  notifMorning: true,
  notifMorningHour: 7,
  notifMorningMinute: 0,
  notifEvening: true,
  notifEveningHour: 21,
  notifEveningMinute: 0,
  notifNudges: false,
  notifNudgeHour: 20,
  notifNudgeMinute: 0,
  settingsPresentation: 'page',
  readingGoal: 20,
};

export function AppStateProvider({ children }) {
  const [settings, setSettings] = usePersistentState('intent.settings', DEFAULT_SETTINGS);
  const [coffee, setCoffee] = usePersistentState('intent.coffee', { pulls: [], recipes: [] });
  const [books, setBooks] = usePersistentState('intent.books', LIBIO_BOOKS_SEED);
  const [routines, setRoutines] = usePersistentState('intent.routines', { list: [], history: {} });
  const [movement, setMovement] = usePersistentState('intent.movement', MOVEMENT_SEED);
  const [reflection, setReflection] = usePersistentState('intent.reflection', { days: {} });
  const [calendar, setCalendar] = usePersistentState('intent.calendar', CAL_SEED);
  // Fetched external-calendar events (read-only). Per-device, NOT synced — each
  // device re-fetches from the source; only the subscription list itself syncs.
  const [calCache, setCalCache] = usePersistentState('intent.calCache', {});
  const [bills, setBills] = usePersistentState('intent.bills', []);
  // Native device-calendar mirror (read-only, per-device, NOT synced — it's the
  // OS's own calendar data, re-read on each device).
  const [deviceCal, setDeviceCal] = usePersistentState('intent.deviceCal', { enabled: false, calendarIds: [], events: [], fetchedAt: null, error: null });
  const [deepwork, setDeepwork] = usePersistentState('intent.deepwork', {
    state: 'idle', startedAt: null, day: todayKey(), lastSession: null, sessions: [],
  });
  const [firstUse, setFirstUse] = usePersistentState('intent.firstUse', () => new Date().toISOString());

  // Transient celebration trigger (book-finished overlay). Not persisted.
  const [celebration, setCelebration] = React.useState(null);

  // ── Cloud sync (optional) ───────────────────────────────────────────────────
  // The full app state as one document. Last-write-wins across devices.
  const snapshot = { settings, coffee, books, routines, movement, reflection, calendar, bills, deepwork, firstUse };
  const hydrate = React.useCallback((data) => {
    if (!data || typeof data !== 'object') return;
    if (data.settings) setSettings(data.settings);
    if (data.coffee) setCoffee(data.coffee);
    if (data.books) setBooks(data.books);
    if (data.routines) setRoutines(data.routines);
    if (data.movement) setMovement(data.movement);
    if (data.reflection) setReflection(data.reflection);
    if (data.calendar) setCalendar(data.calendar);
    if (data.bills) setBills(data.bills);
    if (data.deepwork) setDeepwork(data.deepwork);
    if (data.firstUse) setFirstUse(data.firstUse);
  }, [setSettings, setCoffee, setBooks, setRoutines, setMovement, setReflection, setCalendar, setBills, setDeepwork, setFirstUse]);
  const sync = useCloudSync(snapshot, hydrate);

  const value = useMemo(() => {
    // Settings helpers ------------------------------------------------------
    const setSetting = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));
    const patchSettings = (patch) => setSettings(prev => ({ ...prev, ...patch }));

    // Reconcile pillar order/visibility with the registry, so newly added
    // pillars show up without nuking saved preferences.
    const registryIds = PILLARS.map(p => p.id);
    const savedOrder = settings.pillarOrder || [];
    const pillarOrder = [
      ...savedOrder.filter(id => registryIds.includes(id)),
      ...registryIds.filter(id => !savedOrder.includes(id)),
    ];
    const pillarVis = { ...Object.fromEntries(registryIds.map(id => [id, true])), ...(settings.pillarVis || {}) };

    // Coffee ----------------------------------------------------------------
    const savePull = (pull) => setCoffee(prev => ({
      ...prev,
      pulls: [{ id: Date.now(), ...pull, at: new Date().toISOString() }, ...prev.pulls],
    }));
    const saveRecipe = (recipe) => setCoffee(prev => ({
      ...prev,
      recipes: [...prev.recipes, { id: Date.now(), ...recipe }],
    }));

    // The day all logging writes to. Uses the 6am "intent day" cutoff, so late-
    // night logs (a routine checked at 12:30am, a forgotten workout) count for
    // the day that's wrapping up, not the one just begun. Deep-work's daily
    // timer reset rides this too.
    const today = intentTodayKey();
    const dw = deepwork.day === today
      ? deepwork
      : { state: 'idle', startedAt: null, day: today, lastSession: null, sessions: deepwork.sessions || [] };
    const startSession = () => setDeepwork(prev => ({
      ...prev, state: 'active', startedAt: new Date().toISOString(), day: today, lastSession: null,
    }));
    const endSession = ({ minutes, notes, quality }) => {
      const session = { minutes, notes, quality, at: new Date().toISOString() };
      setDeepwork(prev => ({
        state: 'done', startedAt: null, day: today,
        lastSession: session,
        sessions: [session, ...(prev.sessions || [])],
      }));
    };

    // Routines ---------------------------------------------------------------
    const setRoutineList = (updater) => setRoutines(prev => ({
      ...prev,
      list: typeof updater === 'function' ? updater(prev.list) : updater,
    }));
    const setRoutineHistory = (updater) => setRoutines(prev => ({
      ...prev,
      history: typeof updater === 'function' ? updater(prev.history) : updater,
    }));
    const toggleRoutineItem = (routineId, itemId, dayKey = today) => setRoutines(prev => {
      const routineHist = { ...(prev.history[routineId] || {}) };
      const dayMap = { ...(routineHist[dayKey] || {}) };
      dayMap[itemId] = !dayMap[itemId];
      routineHist[dayKey] = dayMap;
      return { ...prev, history: { ...prev.history, [routineId]: routineHist } };
    });

    // Reading sessions + finishing ------------------------------------------
    const finishedLabel = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const booksReadThisYear = (books.read || []).filter(b => isThisYear(b.finishedDate ? new Date(b.finishedDate) : null)).length;

    // Log a reading session and/or finish a book — the single source of truth.
    // pages = pages read this session (delta); finish = mark the book done now.
    const logReadingSession = (book, { pages = 0, finish = false } = {}) => {
      let finishedBook = null;
      let yearCount = booksReadThisYear;
      setBooks(prev => {
        // Find the book wherever it currently lives.
        const current = ['reading', 'wantToRead', 'paused', 'read']
          .map(s => (prev[s] || []).find(b => b.id === book.id)).find(Boolean) || book;
        const total = current.totalPages || 0;
        const prevPage = current.currentPage || 0;
        const newPage = finish ? (total || prevPage + pages) : Math.min(total || Infinity, prevPage + pages);
        const addedPages = Math.max(0, newPage - prevPage);
        const sessionRec = addedPages > 0
          ? [{ id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`, bookId: book.id, bookTitle: current.title, date: today, pages: addedPages, at: new Date().toISOString() }]
          : [];
        const sessions = [...sessionRec, ...(prev.sessions || [])];
        if (finish) {
          const finishedDate = finishedLabel();
          finishedBook = { ...current, pausedDate: undefined, currentPage: newPage || total, progress: 100, finishedDate };
          yearCount = (prev.read || []).filter(b => isThisYear(b.finishedDate ? new Date(b.finishedDate) : null)).length + 1;
          return {
            ...prev,
            sessions,
            reading: (prev.reading || []).filter(b => b.id !== book.id),
            wantToRead: (prev.wantToRead || []).filter(b => b.id !== book.id),
            paused: (prev.paused || []).filter(b => b.id !== book.id),
            read: [finishedBook, ...(prev.read || []).filter(b => b.id !== book.id)],
          };
        }
        const progress = total ? Math.round((newPage / total) * 100) : (current.progress || 0);
        return {
          ...prev,
          sessions,
          reading: (prev.reading || []).map(b => b.id === book.id ? { ...b, currentPage: newPage, progress } : b),
        };
      });
      if (finish) setCelebration({ book: finishedBook || book, booksThisYear: yearCount });
    };

    const finishBook = (book) => logReadingSession(book, { finish: true });

    // Edit a finished book's date (e.g. backfilling books read earlier this year).
    const setBookFinishedDate = (bookId, dateStr) => setBooks(prev => ({
      ...prev,
      read: (prev.read || []).map(b => b.id === bookId ? { ...b, finishedDate: dateStr } : b),
    }));

    const dismissCelebration = () => setCelebration(null);

    // Movement (workouts) ----------------------------------------------------
    const mv = {
      exercises: movement.exercises || [],
      workouts: movement.workouts || [],
      schedule: movement.schedule || { recurring: {}, oneOff: {}, skips: {}, until: {} },
      sessions: movement.sessions || [],
      weights: movement.weights || {},
    };
    const patchMovement = (patch) => setMovement(prev => ({ ...mv, ...prev, ...patch }));

    const saveExercise = (ex) => setMovement(prev => {
      const list = prev.exercises || [];
      if (ex.id && list.some(e => e.id === ex.id)) {
        return { ...prev, exercises: list.map(e => e.id === ex.id ? { ...e, ...ex } : e) };
      }
      return { ...prev, exercises: [...list, { ...ex, id: ex.id || uid('ex') }] };
    });
    const deleteExercise = (id) => setMovement(prev => ({
      ...prev,
      exercises: (prev.exercises || []).filter(e => e.id !== id),
      // also strip it from any workout templates
      workouts: (prev.workouts || []).map(w => ({ ...w, items: (w.items || []).filter(it => it.exerciseId !== id) })),
    }));

    const saveWorkout = (w) => setMovement(prev => {
      const list = prev.workouts || [];
      if (w.id && list.some(x => x.id === w.id)) {
        return { ...prev, workouts: list.map(x => x.id === w.id ? { ...x, ...w } : x) };
      }
      return { ...prev, workouts: [...list, { ...w, id: w.id || uid('wk') }] };
    });
    const deleteWorkout = (id) => setMovement(prev => {
      const sched = cloneSched(prev.schedule);
      sched.recurring = Object.fromEntries(Object.entries(sched.recurring).map(([k, v]) => [k, (v || []).filter(r => ruleId(r) !== id)]));
      sched.oneOff = Object.fromEntries(Object.entries(sched.oneOff).map(([k, v]) => [k, (v || []).filter(x => x !== id)]));
      return { ...prev, workouts: (prev.workouts || []).filter(w => w.id !== id), schedule: sched };
    });

    // Scheduling: bucket = 'recurring' (keyed by weekday 0-6) or 'oneOff' (date)
    const scheduleWorkout = (bucket, key, workoutId) => setMovement(prev => {
      const sched = cloneSched(prev.schedule);
      const cur = sched[bucket][key] || [];
      if (!cur.includes(workoutId)) sched[bucket][key] = [...cur, workoutId];
      return { ...prev, schedule: sched };
    });
    const unscheduleWorkout = (bucket, key, workoutId) => setMovement(prev => {
      const sched = cloneSched(prev.schedule);
      sched[bucket][key] = (sched[bucket][key] || []).filter(id => id !== workoutId);
      return { ...prev, schedule: sched };
    });

    // ── Per-occurrence scheduling (Google-Calendar-style) ───────────────────
    // Full clone of the schedule, guaranteeing all four sub-maps exist.
    const cloneSched = (s) => ({
      recurring: { ...((s && s.recurring) || {}) },
      oneOff: { ...((s && s.oneOff) || {}) },
      skips: { ...((s && s.skips) || {}) },
      until: { ...((s && s.until) || {}) },
    });

    // Remove just one occurrence of a recurring workout (this day only).
    const skipOccurrence = (dateK, workoutId) => setMovement(prev => {
      const sched = cloneSched(prev.schedule);
      const cur = sched.skips[dateK] || [];
      if (!cur.includes(workoutId)) sched.skips[dateK] = [...cur, workoutId];
      return { ...prev, schedule: sched };
    });

    // End a recurring series from a date onward (this & all future weeks).
    const endRecurrence = (dow, workoutId, untilK) => setMovement(prev => {
      const sched = cloneSched(prev.schedule);
      sched.until[`${dow}:${workoutId}`] = untilK;
      return { ...prev, schedule: sched };
    });

    // Delete a recurring series entirely, clearing its end-date and any skips
    // for that workout on the same weekday so a future re-add starts clean.
    const removeRecurrence = (dow, workoutId) => setMovement(prev => {
      const sched = cloneSched(prev.schedule);
      sched.recurring[dow] = (sched.recurring[dow] || []).filter(r => ruleId(r) !== workoutId);
      delete sched.until[`${dow}:${workoutId}`];
      for (const dk of Object.keys(sched.skips)) {
        if (new Date(dk + 'T12:00:00').getDay() !== Number(dow)) continue;
        const left = (sched.skips[dk] || []).filter(id => id !== workoutId);
        if (left.length) sched.skips[dk] = left; else delete sched.skips[dk];
      }
      return { ...prev, schedule: sched };
    });

    // Move a single occurrence to another date without touching the series:
    // a recurring instance becomes a skip on its origin + a one-off on the
    // target; a one-off just relocates. item = { bucket, key, dk, id }.
    const moveOccurrence = (item, destDateK) => setMovement(prev => {
      const sched = cloneSched(prev.schedule);
      if (item.bucket === 'recurring') {
        const cur = sched.skips[item.dk] || [];
        if (!cur.includes(item.id)) sched.skips[item.dk] = [...cur, item.id];
      } else {
        const left = (sched.oneOff[item.key] || []).filter(id => id !== item.id);
        if (left.length) sched.oneOff[item.key] = left; else delete sched.oneOff[item.key];
      }
      const dcur = sched.oneOff[destDateK] || [];
      if (!dcur.includes(item.id)) sched.oneOff[destDateK] = [...dcur, item.id];
      return { ...prev, schedule: sched };
    });

    // Add a recurring workout to a weekday with a cadence. freq=1 weekly (stored
    // as a bare id), freq=2 every-other-week anchored to `anchor`'s ISO week.
    // Replaces any existing rule for the same workout on that weekday.
    const addRecurringWorkout = (dow, workoutId, freq = 1, anchor = null) => setMovement(prev => {
      const sched = cloneSched(prev.schedule);
      const k = String(dow);
      const list = (sched.recurring[k] || []).filter(r => ruleId(r) !== workoutId);
      list.push(freq > 1 ? { id: workoutId, freq, anchor } : workoutId);
      sched.recurring[k] = list;
      delete sched.until[`${k}:${workoutId}`]; // fresh series
      return { ...prev, schedule: sched };
    });

    // Move a whole recurring series to a different weekday (preserves cadence).
    const moveRecurringDay = (fromDow, workoutId, toDow) => setMovement(prev => {
      const sched = cloneSched(prev.schedule);
      const from = String(fromDow), to = String(toDow);
      if (from === to) return prev;
      const rule = (sched.recurring[from] || []).find(r => ruleId(r) === workoutId);
      sched.recurring[from] = (sched.recurring[from] || []).filter(r => ruleId(r) !== workoutId);
      sched.recurring[to] = [...(sched.recurring[to] || []).filter(r => ruleId(r) !== workoutId), rule === undefined ? workoutId : rule];
      const u = sched.until[`${from}:${workoutId}`];
      if (u) { delete sched.until[`${from}:${workoutId}`]; sched.until[`${to}:${workoutId}`] = u; }
      return { ...prev, schedule: sched };
    });

    const logWorkoutSession = (session) => setMovement(prev => ({
      ...prev,
      sessions: [{ id: uid('ses'), date: today, at: new Date().toISOString(), ...session }, ...(prev.sessions || [])],
    }));
    const deleteSession = (id) => setMovement(prev => ({
      ...prev, sessions: (prev.sessions || []).filter(s => s.id !== id),
    }));

    // Bodyweight: one entry per day. A falsy/zero value clears that day's entry.
    const logWeight = (value, dayKey = today) => setMovement(prev => {
      const weights = { ...(prev.weights || {}) };
      const v = Number(value);
      if (!v || v <= 0) delete weights[dayKey];
      else weights[dayKey] = v;
      return { ...prev, weights };
    });

    // Reflection (daily intent + evening) ------------------------------------
    const refl = { days: reflection.days || {} };
    const setDayField = (field, value, dayKey = today) => setReflection(prev => {
      const days = { ...(prev.days || {}) };
      days[dayKey] = { ...(days[dayKey] || {}), [field]: value, at: new Date().toISOString() };
      return { ...prev, days };
    });
    const setDayIntent = (text, dayKey = today) => setDayField('intent', text, dayKey);
    const setDayEvening = (text, dayKey = today) => setDayField('evening', text, dayKey);

    // Calendar (events + tasks + layer/view settings) ------------------------
    const cal = {
      events: calendar.events || [],
      tasks: calendar.tasks || [],
      settings: { defaultView: 'day', layers: {}, ...(calendar.settings || {}) },
    };
    const saveEvent = (ev) => setCalendar(prev => {
      const list = prev.events || [];
      if (ev.id && list.some(e => e.id === ev.id)) {
        return { ...prev, events: list.map(e => e.id === ev.id ? { ...e, ...ev } : e) };
      }
      return { ...prev, events: [...list, { ...ev, id: ev.id || calUid('ev'), source: ev.source || 'native' }] };
    });
    const deleteEvent = (id) => setCalendar(prev => ({ ...prev, events: (prev.events || []).filter(e => e.id !== id) }));

    const saveTask = (t) => setCalendar(prev => {
      const list = prev.tasks || [];
      if (t.id && list.some(x => x.id === t.id)) {
        return { ...prev, tasks: list.map(x => x.id === t.id ? { ...x, ...t } : x) };
      }
      return { ...prev, tasks: [...list, { ...t, id: t.id || calUid('tk'), done: !!t.done }] };
    });
    const toggleTask = (id) => setCalendar(prev => ({
      ...prev, tasks: (prev.tasks || []).map(t => t.id === id ? { ...t, done: !t.done } : t),
    }));
    const deleteTask = (id) => setCalendar(prev => ({ ...prev, tasks: (prev.tasks || []).filter(t => t.id !== id) }));

    const setCalendarLayer = (sourceId, visible) => setCalendar(prev => ({
      ...prev,
      settings: { ...(prev.settings || {}), layers: { ...((prev.settings || {}).layers || {}), [sourceId]: visible } },
    }));
    const setCalendarView = (view) => setCalendar(prev => ({
      ...prev, settings: { ...(prev.settings || {}), defaultView: view },
    }));

    // Subscribed (read-only) external calendars — the list syncs; the fetched
    // events live in calCache (per-device).
    const addSubscription = (sub) => setCalendar(prev => {
      const s = prev.settings || {};
      return { ...prev, settings: { ...s, subscriptions: [...(s.subscriptions || []), { id: calUid('sub'), enabled: true, ...sub }] } };
    });
    const updateSubscription = (id, patch) => setCalendar(prev => {
      const s = prev.settings || {};
      return { ...prev, settings: { ...s, subscriptions: (s.subscriptions || []).map(x => x.id === id ? { ...x, ...patch } : x) } };
    });
    const removeSubscription = (id) => {
      setCalendar(prev => {
        const s = prev.settings || {};
        return { ...prev, settings: { ...s, subscriptions: (s.subscriptions || []).filter(x => x.id !== id) } };
      });
      setCalCache(prev => { const next = { ...prev }; delete next[id]; return next; });
    };
    const setSubCache = (id, data) => setCalCache(prev => ({ ...prev, [id]: data }));

    // Bills & payments ------------------------------------------------------
    const saveBill = (b) => setBills(prev => {
      const list = prev || [];
      if (b.id && list.some(x => x.id === b.id)) return list.map(x => x.id === b.id ? { ...x, ...b } : x);
      return [...list, { ...b, id: b.id || billUid('bill'), paid: b.paid || {} }];
    });
    const deleteBill = (id) => setBills(prev => (prev || []).filter(b => b.id !== id));
    const toggleBillPaid = (id, dk) => setBills(prev => (prev || []).map(b => {
      if (b.id !== id) return b;
      const paid = { ...(b.paid || {}) };
      if (paid[dk]) delete paid[dk]; else paid[dk] = true;
      return { ...b, paid };
    }));
    // Record a payment: value = true (paid, amount unknown), a number (actual
    // amount), or null (unmark).
    const setBillPaidAmount = (id, dk, value) => setBills(prev => (prev || []).map(b => {
      if (b.id !== id) return b;
      const paid = { ...(b.paid || {}) };
      if (value == null) delete paid[dk]; else paid[dk] = value === true ? true : (Number(value) || true);
      return { ...b, paid };
    }));
    // Mark many occurrences paid at once (the "pay all due" sweep). entries: [{id, dk}].
    const markPaidBatch = (entries) => setBills(prev => (prev || []).map(b => {
      const mine = (entries || []).filter(e => e.id === b.id);
      if (!mine.length) return b;
      const paid = { ...(b.paid || {}) };
      mine.forEach(e => { paid[e.dk] = true; });
      return { ...b, paid };
    }));

    // Data -------------------------------------------------------------------
    const exportData = () => {
      const payload = {
        exportedAt: new Date().toISOString(),
        settings, coffee, books, routines, movement, reflection, calendar, bills, deepwork, firstUse,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `intent-export-${today}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };
    // Restore from an exported file. Replaces each slice that's present; unknown
    // keys are ignored. Returns { ok, restored:[...] } or { ok:false, error }.
    const importData = (payload) => {
      if (!payload || typeof payload !== 'object') return { ok: false, error: 'Not a valid Intent file.' };
      const restored = [];
      if (payload.settings && typeof payload.settings === 'object') { setSettings({ ...DEFAULT_SETTINGS, ...payload.settings }); restored.push('settings'); }
      if (payload.coffee) { setCoffee(payload.coffee); restored.push('coffee'); }
      if (payload.books) { setBooks(payload.books); restored.push('reading'); }
      if (payload.routines) { setRoutines(payload.routines); restored.push('routines'); }
      if (payload.movement) { setMovement(payload.movement); restored.push('movement'); }
      if (payload.reflection) { setReflection(payload.reflection); restored.push('reflection'); }
      if (payload.calendar) { setCalendar(payload.calendar); restored.push('calendar'); }
      if (payload.bills) { setBills(payload.bills); restored.push('bills'); }
      if (payload.deepwork) { setDeepwork(payload.deepwork); restored.push('deep work'); }
      if (payload.firstUse) setFirstUse(payload.firstUse); // preserve "member since" (not user-facing as a slice)
      if (!restored.length) return { ok: false, error: 'No Intent data found in that file.' };
      return { ok: true, restored };
    };

    const resetSettings = () => setSettings(DEFAULT_SETTINGS);
    const eraseAllData = () => { clearAllAppData(); window.location.reload(); };

    return {
      settings: { ...settings, pillarOrder, pillarVis },
      setSetting, patchSettings, resetSettings,
      coffee, savePull, saveRecipe,
      books, setBooks,
      readingSessions: books.sessions || [],
      logReadingSession, finishBook, setBookFinishedDate,
      celebration, dismissCelebration,
      routines, setRoutineList, setRoutineHistory, toggleRoutineItem,
      movement: mv,
      saveExercise, deleteExercise, saveWorkout, deleteWorkout,
      scheduleWorkout, unscheduleWorkout, logWorkoutSession, deleteSession, logWeight,
      skipOccurrence, endRecurrence, removeRecurrence, moveOccurrence, addRecurringWorkout, moveRecurringDay,
      reflection: refl, setDayIntent, setDayEvening,
      calendar: cal, calCache, saveEvent, deleteEvent, saveTask, toggleTask, deleteTask, setCalendarLayer, setCalendarView,
      addSubscription, updateSubscription, removeSubscription, setSubCache,
      bills, saveBill, deleteBill, toggleBillPaid, setBillPaidAmount, markPaidBatch,
      deviceCal, setDeviceCal,
      deepwork: dw, startSession, endSession,
      firstUse,
      exportData, importData, eraseAllData,
      sync,
    };
  }, [settings, coffee, books, routines, movement, reflection, calendar, calCache, bills, deviceCal, deepwork, firstUse, sync, celebration]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useApp must be used inside <AppStateProvider>');
  return ctx;
}
