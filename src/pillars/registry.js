// The pillar registry — the single place the app discovers pillars.
//
// To ADD a pillar:
//   1. Create src/pillars/<id>/index.jsx exporting a manifest:
//        {
//          id,           // unique string, used in settings + navigation
//          label,        // display name
//          color,        // accent color (also add to PILLAR_COLORS in tokens.js)
//          Pill,         // component for the Today screen card
//          Section,      // drill-down page ({ onBack }) — or null for a stub
//          StatsScreen,  // stats drill-down ({ onBack }) — or null for a stub
//          getStats(app) // -> [{ number, label }] for the Stats overview card
//          fullScreen?,  // true if the pillar takes over the screen (like Libio)
//          FullScreenApp?// the component to mount when fullScreen
//        }
//   2. Import it below and add it to PILLARS.
// It then automatically appears on Today, in Stats, and in Settings
// (toggle + reorder) — order/visibility reconcile with saved preferences.
//
// To REMOVE a pillar: delete its line here. Saved data is untouched.

import deepwork from './deepwork/index.jsx';
import movement from './movement/index.jsx';
import routine from './routine/index.jsx';
import coffee from './coffee/index.jsx';
import nourishment from './nourishment/index.jsx';
import reading from './reading/index.jsx';
import reflection from './reflection/index.jsx';

export const PILLARS = [deepwork, movement, routine, coffee, nourishment, reading, reflection];

export const PILLAR_MAP = Object.fromEntries(PILLARS.map(p => [p.id, p]));
