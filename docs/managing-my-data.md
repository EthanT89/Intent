# Managing my (Ethan's) live data

Intent is just for me, and I want Claude to be able to **read and change my real
data** — add workouts/exercises/routines, log weigh-ins, add books with notes,
edit my schedule, add events/reminders, manage bills. This is the how.

## The store

The whole app state is one JSON document in Upstash Redis, served by the
portfolio backend:

```
GET  https://ethanthornberg.dev/api/store?app=intent&key=state
PUT  https://ethanthornberg.dev/api/store?app=intent&key=state   body: { data, updatedAt }
Authorization: Bearer <token>
```

The token is the `VITE_SYNC_TOKEN` default baked into `src/lib/cloudSync.js`
(single-user app — exposure is fine by me). The GET returns
`{ app, key, data, updatedAt }`; `data` is the entire app snapshot.

## The golden rules

1. **Read-modify-write the whole `data` object.** Preserve every slice; only touch
   what you're changing. PUT `{ data, updatedAt: new Date().toISOString() }`.
2. **Write while the app is CLOSED.** Sync is last-write-wins and the open app
   re-uploads its snapshot periodically, which will clobber an API write made while
   it's open. So: I fully close Intent → you write → I reopen (it pulls the newer
   remote and hydrates). 
3. **Verify.** Re-GET and confirm `updatedAt` equals the timestamp you just wrote
   (and spot-check the change). If `updatedAt` is newer than yours, the app clobbered
   you — have me close it and retry.
4. **Don't drop slices.** A PUT replaces the document. Always start from the latest GET.

## Read-modify-write skeleton (Node, run from the Intent project)

```js
const TOKEN = '<token from src/lib/cloudSync.js>';
const URL = 'https://ethanthornberg.dev/api/store?app=intent&key=state';
const rec = await (await fetch(URL, { headers: { Authorization: `Bearer ${TOKEN}` } })).json();
const data = rec.data;
// ...mutate data (see shapes below)...
const put = await fetch(URL, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ data, updatedAt: new Date().toISOString() }),
});
```

Generate ids the way the app does: `` `${prefix}-${Date.now()}-${rand}` `` (e.g.
`ex-…`, `wk-…`, `ev-…`, `bill-…`, `tk-…`). Dates are **local** `YYYY-MM-DD` (or
`YYYY-MM-DDTHH:mm` for timed) — never rely on UTC `toISOString().slice(0,10)`.

## Data shapes (the slices you'll touch most)

### movement
```
exercises: [{ id, name, kind, description }]          // kind: strength|bodyweight|cardio|mobility
workouts:  [{ id, name, description, items: [item] }] // item fields by kind:
           //   strength {exerciseId,sets,reps,weight}  bodyweight {exerciseId,sets,reps}
           //   cardio {exerciseId,duration,distance}    mobility {exerciseId,duration}
schedule:  { recurring: { '0'..'6': [rule] },          // rule = workoutId string (weekly)
           //                                               or { id, freq, anchor } (freq 2 = every other week)
             oneOff: { 'YYYY-MM-DD': [workoutId] },
             skips:  { 'YYYY-MM-DD': [workoutId] },     // suppress one recurring occurrence
             until:  { '<dow>:<workoutId>': 'YYYY-MM-DD' } } // series ends after this date
sessions:  [{ id, date, at, workoutId, name, durationMin, notes, entries:[…] }]
weights:   { 'YYYY-MM-DD': number }                    // bodyweight log
```

### books (the reading app, "Libio")
```
reading | read | wantToRead | paused : [ book ]
book = { id, title, author, cover, color, totalPages, currentPage, progress,
         rating, genre, quotes: [{ text, page }], finishedDate }
sessions: [{ bookId, date, pages }]
```
To add a book to want-to-read: push a book onto `books.wantToRead`. To add a note/
quote: push `{ text, page }` onto that book's `quotes`.

### routines
```
list: [{ id, name, daysOn:[0..6], window:{start,end}|null, items:[{id,label}], disabled }]
history: { [routineId]: { 'YYYY-MM-DD': { [itemId]: true } } }
```

### reflection
```
days: { 'YYYY-MM-DD': { intent, evening, at } }
```

### calendar
```
events: [{ id, title, start, end, allDay, color, recur, until, notes, location, remind }]
        // recur: none|daily|weekday|weekly|monthly ; remind: minutes-before (null off)
tasks:  [{ id, title, due, done, notes, remind }]      // due: date / datetime / null (inbox)
settings: { defaultView, layers, subscriptions:[{ id, name, url, color, enabled }] }
```

### bills
```
[{ id, name, amount, variable, color, autopay, account, notes,
   recur: { unit:'month'|'week'|'year'|'once', interval, day, weekday, month, anchor },
   remind,                       // days before due (null off)
   paid: { 'YYYY-MM-DD': true | <actualAmount> } }]   // number = recorded actual (variable bills)
```

## Examples

- **Add a book to read next:**
  `data.books.wantToRead.push({ id:'bk-'+Date.now(), title:'Atomic Habits', author:'James Clear', genre:'Self-help', totalPages:320, currentPage:0, progress:0, rating:0, quotes:[] })`
- **Save a quote on a book:** find it in `data.books.read`, then
  `book.quotes.push({ text:'…', page:42 })`
- **Schedule an event w/ reminder:**
  `data.calendar.events.push({ id:'ev-'+Date.now(), title:'Dentist', allDay:false, start:'2026-07-02T14:00', end:'2026-07-02T15:00', color:'#7C6F8E', recur:'none', remind:60 })`
- **Add a bill (4th of the month, autopay):**
  `data.bills.push({ id:'bill-'+Date.now(), name:'Chase card', amount:0, variable:true, autopay:true, color:'#5C6B6B', remind:3, recur:{unit:'month',interval:1,day:4}, paid:{} })`

## Optional robustness upgrade (would remove the close-the-app step)

Add a compare-before-push guard to `src/lib/cloudSync.js`: before uploading, GET the
remote `updatedAt`; if it's newer than what the client last synced, **hydrate from
remote instead of pushing.** Then external writes that carry a newer `updatedAt`
always win and I wouldn't have to close the app first. Intent's GitHub Pages
auto-deploys, so this would actually ship.
