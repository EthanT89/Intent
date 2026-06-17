import React from 'react';
import { T, applyTheme } from './theme/tokens.js';
import { TabBar, StubPage, PillarStatStub } from './components/primitives.jsx';
import { PILLAR_MAP } from './pillars/registry.js';
import { useApp } from './store/AppStateContext.jsx';
import { usePersistentState } from './store/usePersistentState.js';
import { activeStreak, highestMilestone } from './lib/momentum.js';
import { StreakCelebration } from './components/StreakCelebration.jsx';
import { refreshPush, prefsFromSettings } from './lib/push.js';
import { UIContext } from './store/uiContext.js';
import { TodayScreen } from './screens/TodayScreen.jsx';
import { StatsScreen } from './screens/StatsScreen.jsx';
import { SettingsScreen, SettingsSheet } from './screens/SettingsScreen.jsx';
import { LogPullModal, RecipeDetailModal, AddRecipeModal } from './pillars/coffee/components.jsx';
import { LibioApp, LibioStatsScreen, LibioLogSessionSheet } from './pillars/reading/LibioApp.jsx';
import { FinishCelebration } from './pillars/reading/FinishCelebration.jsx';
import { LIBIO_STATS_DATA } from './pillars/reading/data.js';

// ── Swipeable full-screen layer (Libio) ───────────────────────────────────────
// Libio lives as a card over Intent. Drag from the left edge to push it away.
// Release past 40% commits the dismiss; otherwise it springs back.
function SwipeableLayer({ children, onDismiss, accentColor }) {
  const [dx, setDx] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const wrapRef = React.useRef(null);
  const startX = React.useRef(0);
  const startDx = React.useRef(0);
  const widthRef = React.useRef(0);
  const lastX = React.useRef(0);
  const lastT = React.useRef(0);
  const vel = React.useRef(0); // px/ms, +ve = moving right

  const EDGE_ZONE = 32; // px from left edge that initiates the gesture

  const onPointerDown = (e) => {
    const rect = wrapRef.current.getBoundingClientRect();
    widthRef.current = rect.width;
    const localX = e.clientX - rect.left;
    if (localX > EDGE_ZONE) return; // ignore — let Libio handle the touch
    setDragging(true);
    startX.current = e.clientX;
    startDx.current = dx;
    lastX.current = e.clientX;
    lastT.current = performance.now();
    vel.current = 0;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not supported */ }
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dt = now - lastT.current;
    if (dt > 0) vel.current = (e.clientX - lastX.current) / dt;
    lastX.current = e.clientX;
    lastT.current = now;
    const next = Math.max(0, startDx.current + (e.clientX - startX.current));
    setDx(next);
  };
  const onPointerEnd = () => {
    if (!dragging) return;
    setDragging(false);
    // Commit on either a long-enough drag (30%) OR a rightward flick.
    const distanceThreshold = widthRef.current * 0.3;
    const flick = vel.current > 0.35 && dx > 48;
    if (dx > distanceThreshold || flick) {
      setDx(widthRef.current);
      setTimeout(() => { onDismiss(); setDx(0); }, 220);
    } else {
      setDx(0);
    }
  };

  const progress = widthRef.current ? Math.min(1, dx / widthRef.current) : 0;
  const scale = 1 - progress * 0.04;
  const radius = progress * 24;

  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0, zIndex: 5, touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <div style={{
        position: 'absolute', inset: 0,
        transform: `translateX(${dx}px) scale(${scale})`,
        transformOrigin: 'right center',
        borderTopLeftRadius: radius, borderBottomLeftRadius: radius,
        overflow: 'hidden',
        transition: dragging
          ? 'none'
          : 'transform 0.28s cubic-bezier(.2,.7,.2,1), border-radius 0.28s',
        boxShadow: dx > 4
          ? '-14px 0 28px rgba(0,0,0,0.16), -2px 0 6px rgba(0,0,0,0.06)'
          : 'none',
        willChange: 'transform',
      }}>
        {children}
      </div>
      {/* Edge affordance — fades out as you drag */}
      <div style={{
        position: 'absolute', top: '46%', left: 0, transform: 'translateY(-50%)',
        zIndex: 35, paddingLeft: 4,
        opacity: dragging ? 0 : (1 - progress) * 0.7,
        pointerEvents: 'none',
        transition: dragging ? 'none' : 'opacity 0.2s',
      }}>
        <div style={{
          width: 3, height: 56, borderRadius: 999, background: accentColor,
        }} />
      </div>
    </div>
  );
}

// ── Navigation state machine ──────────────────────────────────────────────────
// tab: 'today' | 'phases' | 'stats' | 'library'(= Libio full-screen)
// pillarPage: pillar id whose Section is open
// statsDrill: pillar id whose stats drill-down is open

export default function App() {
  const app = useApp();
  const { settings, coffee, savePull, saveRecipe, setBooks } = app;
  applyTheme(settings); // keep live tokens in sync before children render

  const [tab, setTab] = React.useState('today');
  const [pillarPage, setPillarPage] = React.useState(null);
  const [pillarArg, setPillarArg] = React.useState(null); // optional focus payload for a Section
  const [statsDrill, setStatsDrill] = React.useState(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const scrollRef = React.useRef(null);

  // Streak milestone celebration — fires once when the active streak crosses a
  // milestone. Seeds silently on first run so existing streaks don't spam.
  const streak = activeStreak(app);
  const [milestoneSeen, setMilestoneSeen] = usePersistentState('intent.streakMilestone', null);
  const [streakCelebration, setStreakCelebration] = React.useState(null);
  React.useEffect(() => {
    const m = highestMilestone(streak);
    if (milestoneSeen == null) { setMilestoneSeen(m); return; }
    if (m > milestoneSeen) { setStreakCelebration(m); setMilestoneSeen(m); }
    else if (m < milestoneSeen) { setMilestoneSeen(m); } // streak broke — re-arm
  }, [streak]); // eslint-disable-line react-hooks/exhaustive-deps

  // Self-heal push on launch: refresh the subscription + current timezone so it
  // survives rotated subscriptions and travel. Silent; no-op unless enabled.
  React.useEffect(() => {
    if (settings.notifEnabled) refreshPush(prefsFromSettings(settings));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Coffee modal state (global — reachable from Today pill, section, detail)
  const [pullModalOpen, setPullModalOpen] = React.useState(false);
  const [recipeModalOpen, setRecipeModalOpen] = React.useState(false);
  const [viewingRecipe, setViewingRecipe] = React.useState(null);
  const [prefillRecipe, setPrefillRecipe] = React.useState(null);

  // Reading session sheet (shared by Today pill + Libio)
  const [readingSessionBook, setReadingSessionBook] = React.useState(null);
  const handleSaveReadingSession = (pagesRead, finish = false) => {
    if (!readingSessionBook) return;
    app.logReadingSession(readingSessionBook, { pages: pagesRead, finish });
    setReadingSessionBook(null);
  };

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [tab, pillarPage, statsDrill]);

  const goTab = (newTab) => {
    setPillarPage(null);
    setStatsDrill(null);
    setTab(newTab);
  };

  const navigateToPillar = (id, arg = null) => {
    const pillar = PILLAR_MAP[id];
    if (pillar && pillar.fullScreen) {
      // Full-screen pillars (Libio) take over via the 'library' pseudo-tab
      setPillarPage(null); setStatsDrill(null); setTab('library');
      return;
    }
    setPillarArg(arg);
    setPillarPage(id);
    setStatsDrill(null);
  };

  const goBack = () => { setPillarPage(null); setStatsDrill(null); };
  const goStatsDrill = (id) => setStatsDrill(id);
  const goBackFromStats = () => setStatsDrill(null);
  const goBackToIntent = () => { setPillarPage(null); setStatsDrill(null); setTab('today'); };

  const ui = React.useMemo(() => ({
    navigateToPillar,
    goToTab: goTab,
    openSettings: () => setSettingsOpen(true),
    openPullModal: (recipe) => { if (recipe) setPrefillRecipe(recipe); setPullModalOpen(true); },
    openRecipeModal: () => setRecipeModalOpen(true),
    viewRecipe: (r) => setViewingRecipe(r),
    logReadingSession: (book) => setReadingSessionBook(book),
  }), []);

  const showingLibio = tab === 'library' && !pillarPage && !statsDrill;
  const showingLibioStats = statsDrill === 'reading';
  const showingSettingsPage = settingsOpen && settings.settingsPresentation !== 'sheet';

  // ── Screen resolver ─────────────────────────────────────────────────────────
  let screen = null;
  let showTitleBar = false;
  let titleBarText = '';

  if (showingSettingsPage) {
    screen = <SettingsScreen onBack={() => setSettingsOpen(false)} />;
  } else if (showingLibioStats) {
    // Libio Stats embedded in Intent's Stats drill-down
    screen = (
      <div style={{ position: 'relative', height: '100%' }}>
        <LibioStatsScreen stats={LIBIO_STATS_DATA} />
        <button onClick={goBackFromStats} style={{
          position: 'absolute', top: 'calc(var(--safe-top) + 6px)', left: 16, zIndex: 60,
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
          fontFamily: T.fontSans, fontSize: 13,
          color: T.pillars.reading, padding: 0,
        }}>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <path d="M7 1L1 7l6 6" stroke={T.pillars.reading} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Stats
        </button>
      </div>
    );
  } else if (pillarPage) {
    const pillar = PILLAR_MAP[pillarPage];
    if (pillar && pillar.Section) {
      const Section = pillar.Section;
      screen = <Section onBack={goBack} arg={pillarArg} />;
    } else {
      screen = <StubPage title={pillar ? pillar.label : pillarPage} accentColor={pillar ? pillar.color : T.amber} onBack={goBack} />;
    }
  } else if (statsDrill) {
    const pillar = PILLAR_MAP[statsDrill];
    if (pillar && pillar.StatsScreen) {
      const Drill = pillar.StatsScreen;
      screen = <Drill onBack={goBackFromStats} />;
    } else {
      screen = <PillarStatStub
        title={`${pillar ? pillar.label : statsDrill} stats`}
        accentColor={pillar ? pillar.color : T.amber}
        onBack={goBackFromStats}
      />;
    }
  } else if (tab === 'today') {
    screen = <TodayScreen />;
  } else if (tab === 'stats') {
    screen = <StatsScreen onDrillDown={goStatsDrill} />;
  }

  const basePad = 'calc(var(--safe-top) + 12px)';
  const titleBarPad = 'calc(var(--safe-top) + 70px)';
  const paddingTop = showTitleBar && !pillarPage && !statsDrill ? titleBarPad : basePad;
  // Libio and the embedded Libio stats manage their own scroll
  const wrapInScroll = !showingLibio && !showingLibioStats;

  return (
    <UIContext.Provider value={ui}>
      <div id="app-frame" className="app-frame" style={{ background: T.bg }}>
        {/* Title bar for Phases tab */}
        {showTitleBar && !pillarPage && !statsDrill && !showingSettingsPage && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
            paddingTop: 'var(--safe-top)',
            background: `${T.bg}F2`,
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          }}>
            <div style={{ padding: '10px 16px 12px', fontFamily: T.fontSerif, fontSize: 26, fontWeight: 600, color: T.ink }}>{titleBarText}</div>
            <div style={{ height: '0.5px', background: T.border }} />
          </div>
        )}

        {/* Libio — swipeable card layer over Intent's Today screen */}
        {showingLibio && (
          <React.Fragment>
            {/* Intent's Today renders underneath, visible as you swipe Libio away */}
            <div className="intent-scroll" style={{
              position: 'absolute', inset: 0, zIndex: 1,
              overflowY: 'auto', overflowX: 'hidden',
              paddingTop: basePad,
            }}>
              <TodayScreen />
            </div>
            {/* Libio sits on top, draggable from the left edge */}
            <SwipeableLayer onDismiss={goBackToIntent} accentColor={T.amber}>
              <LibioApp onLogSessionExternal={(book) => setReadingSessionBook(book)} />
            </SwipeableLayer>
          </React.Fragment>
        )}

        {/* Libio stats drill-down — full height, manages its own scroll */}
        {showingLibioStats && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
            {screen}
          </div>
        )}

        {/* Normal Intent screens */}
        {wrapInScroll && !showingLibio && (
          <div ref={scrollRef} className="intent-scroll"
            style={{
              position: 'absolute', inset: 0,
              overflowY: 'auto', overflowX: 'hidden',
              paddingTop,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {screen}
          </div>
        )}

        {/* Intent tab bar — hidden while inside Libio or full-page Settings */}
        {!showingLibio && !showingSettingsPage && <TabBar active={tab} onChange={goTab} />}

        {/* Global coffee modals — work from Today pill, Coffee section, or recipe detail */}
        <LogPullModal
          open={pullModalOpen}
          onClose={() => { setPullModalOpen(false); setPrefillRecipe(null); }}
          recipes={coffee.recipes}
          onSave={savePull}
          prefillRecipe={prefillRecipe}
        />
        <AddRecipeModal
          open={recipeModalOpen}
          onClose={() => setRecipeModalOpen(false)}
          onSave={saveRecipe}
        />
        <RecipeDetailModal
          recipe={viewingRecipe}
          onClose={() => setViewingRecipe(null)}
          onLogFromHere={(r) => { setPrefillRecipe(r); setPullModalOpen(true); }}
        />

        {/* Reading session sheet — shared across Today pill + Libio */}
        {readingSessionBook && (
          <LibioLogSessionSheet
            book={readingSessionBook}
            onClose={() => setReadingSessionBook(null)}
            onSave={handleSaveReadingSession}
          />
        )}

        {/* Settings sheet — only when presentation setting is 'sheet' */}
        <SettingsSheet
          open={settingsOpen && settings.settingsPresentation === 'sheet'}
          onClose={() => setSettingsOpen(false)}
        />

        {/* Streak milestone celebration */}
        {streakCelebration != null && (
          <StreakCelebration milestone={streakCelebration} onClose={() => setStreakCelebration(null)} />
        )}

        {/* Book-finished celebration — triggered from anywhere a book is finished */}
        {app.celebration && (
          <FinishCelebration
            book={app.celebration.book}
            booksThisYear={app.celebration.booksThisYear}
            onClose={app.dismissCelebration}
            onFindNext={() => { app.dismissCelebration(); setTab('library'); }}
          />
        )}
      </div>
    </UIContext.Provider>
  );
}
