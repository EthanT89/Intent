import React, { createContext, useContext, useMemo } from 'react';
import { usePersistentState, clearAllAppData } from './usePersistentState.js';
import { todayKey, isThisYear } from '../lib/dates.js';
import { LIBIO_BOOKS_SEED } from '../pillars/reading/data.js';
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
    movement: false,
    routine: true,
    coffee: true,
    nourishment: false,
    reading: true,
    reflection: false,
  },
  notifMorning: true,
  notifEvening: true,
  notifNudges: false,
  settingsPresentation: 'page',
};

export function AppStateProvider({ children }) {
  const [settings, setSettings] = usePersistentState('intent.settings', DEFAULT_SETTINGS);
  const [coffee, setCoffee] = usePersistentState('intent.coffee', { pulls: [], recipes: [] });
  const [books, setBooks] = usePersistentState('intent.books', LIBIO_BOOKS_SEED);
  const [routines, setRoutines] = usePersistentState('intent.routines', { list: [], history: {} });
  const [deepwork, setDeepwork] = usePersistentState('intent.deepwork', {
    state: 'idle', startedAt: null, day: todayKey(), lastSession: null, sessions: [],
  });
  const [firstUse, setFirstUse] = usePersistentState('intent.firstUse', () => new Date().toISOString());

  // Transient celebration trigger (book-finished overlay). Not persisted.
  const [celebration, setCelebration] = React.useState(null);

  // ── Cloud sync (optional) ───────────────────────────────────────────────────
  // The full app state as one document. Last-write-wins across devices.
  const snapshot = { settings, coffee, books, routines, deepwork, firstUse };
  const hydrate = React.useCallback((data) => {
    if (!data || typeof data !== 'object') return;
    if (data.settings) setSettings(data.settings);
    if (data.coffee) setCoffee(data.coffee);
    if (data.books) setBooks(data.books);
    if (data.routines) setRoutines(data.routines);
    if (data.deepwork) setDeepwork(data.deepwork);
    if (data.firstUse) setFirstUse(data.firstUse);
  }, [setSettings, setCoffee, setBooks, setRoutines, setDeepwork, setFirstUse]);
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

    // Deep work — auto-reset to idle each new day (logged sessions persist) --
    const today = todayKey();
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

    // Data -------------------------------------------------------------------
    const exportData = () => {
      const payload = {
        exportedAt: new Date().toISOString(),
        settings, coffee, books, routines, deepwork,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `intent-export-${today}.json`;
      a.click();
      URL.revokeObjectURL(url);
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
      deepwork: dw, startSession, endSession,
      firstUse,
      exportData, eraseAllData,
      sync,
    };
  }, [settings, coffee, books, routines, deepwork, firstUse, sync, celebration]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useApp must be used inside <AppStateProvider>');
  return ctx;
}
