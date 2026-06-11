import React, { createContext, useContext, useMemo } from 'react';
import { usePersistentState, clearAllAppData } from './usePersistentState.js';
import { todayKey } from '../lib/dates.js';
import { COFFEE_RECIPES_SEED, makeCoffeePullsSeed } from '../pillars/coffee/data.js';
import { LIBIO_BOOKS_SEED } from '../pillars/reading/data.js';
import { ROUTINES_SEED, buildRoutineHistory } from '../pillars/routine/model.js';
import { PILLARS } from '../pillars/registry.js';

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

function seedRoutineState() {
  const history = {};
  ROUTINES_SEED.forEach(r => { history[r.id] = buildRoutineHistory(r); });
  return { list: ROUTINES_SEED, history };
}

export function AppStateProvider({ children }) {
  const [settings, setSettings] = usePersistentState('intent.settings', DEFAULT_SETTINGS);
  const [coffee, setCoffee] = usePersistentState('intent.coffee', () => ({
    pulls: makeCoffeePullsSeed(),
    recipes: COFFEE_RECIPES_SEED,
  }));
  const [books, setBooks] = usePersistentState('intent.books', LIBIO_BOOKS_SEED);
  const [routines, setRoutines] = usePersistentState('intent.routines', seedRoutineState);
  const [deepwork, setDeepwork] = usePersistentState('intent.deepwork', {
    state: 'idle', startedAt: null, day: todayKey(), lastSession: null,
  });
  const [firstUse] = usePersistentState('intent.firstUse', () => new Date().toISOString());

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

    // Deep work — auto-reset to idle each new day ----------------------------
    const today = todayKey();
    const dw = deepwork.day === today ? deepwork : { state: 'idle', startedAt: null, day: today, lastSession: null };
    const startSession = () => setDeepwork({ state: 'active', startedAt: new Date().toISOString(), day: today, lastSession: null });
    const endSession = ({ minutes, notes, quality }) => setDeepwork({
      state: 'done', startedAt: null, day: today,
      lastSession: { minutes, notes, quality, at: new Date().toISOString() },
    });

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
      routines, setRoutineList, setRoutineHistory, toggleRoutineItem,
      deepwork: dw, startSession, endSession,
      firstUse,
      exportData, eraseAllData,
    };
  }, [settings, coffee, books, routines, deepwork, firstUse]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useApp must be used inside <AppStateProvider>');
  return ctx;
}
