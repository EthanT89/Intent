// Coffee seed data. Loaded only on first run (before anything is persisted).
// Pull timestamps are generated relative to "now" so the sample log looks alive.

export const COFFEE_RECIPES_SEED = [
  {
    id: 1, name: 'Onyx Monarch espresso', method: 'Espresso',
    ingredients: [
      { name: 'Onyx Monarch beans', amount: '18', unit: 'g' },
      { name: 'Yield', amount: '42', unit: 'g' },
    ],
    params: [
      { label: 'Grind', value: '9.5 / Niche' },
      { label: 'Temp', value: '200 °F' },
      { label: 'Time', value: '28 s' },
    ],
    notes: 'Pulls slow at 9.5. Tastes sour if it comes out under 26s.',
  },
  {
    id: 2, name: 'V60 — Ethiopia Yirgacheffe', method: 'Pour-over',
    ingredients: [
      { name: 'Yirgacheffe beans', amount: '20', unit: 'g' },
      { name: 'Filtered water', amount: '320', unit: 'g' },
    ],
    params: [
      { label: 'Grind', value: 'Medium-fine' },
      { label: 'Bloom', value: '45 s · 60 g' },
      { label: 'Total time', value: '3:15' },
    ],
    notes: 'Three pours: 60g bloom → 180g → 320g. Stir on bloom.',
  },
  {
    id: 3, name: 'Iced oat latte', method: 'Espresso drink',
    ingredients: [
      { name: 'Espresso (Monarch)', amount: '36', unit: 'g' },
      { name: 'Oatly Barista', amount: '200', unit: 'ml' },
      { name: 'Ice', amount: '1', unit: 'cup' },
      { name: 'Vanilla syrup', amount: '10', unit: 'ml' },
    ],
    params: [],
    notes: "Double shot over ice, then milk slowly. Don't stir.",
  },
];

const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();

export function makeCoffeePullsSeed() {
  return [
    { id: 1, recipeName: 'Onyx Monarch espresso', method: 'Espresso', dose: '18 g → 42 g', time: '27s', rating: 4, at: hoursAgo(2), notes: 'Right in the pocket.' },
    { id: 2, recipeName: 'Onyx Monarch espresso', method: 'Espresso', dose: '18 g → 38 g', time: '24s', rating: 3, at: hoursAgo(26), notes: 'Ran fast, slightly sour.' },
    { id: 3, recipeName: 'V60 — Ethiopia Yirgacheffe', method: 'Pour-over', dose: '20 g → 320 g', time: '3:20', rating: 5, at: hoursAgo(30) },
    { id: 4, recipeName: 'Iced oat latte', method: 'Espresso drink', dose: '36 g espresso', time: '—', rating: 4, at: hoursAgo(50) },
    { id: 5, recipeName: 'Onyx Monarch espresso', method: 'Espresso', dose: '18 g → 44 g', time: '30s', rating: 4, at: hoursAgo(74), notes: 'Tiny bit slow but balanced.' },
  ];
}
