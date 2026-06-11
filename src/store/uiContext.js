import { createContext, useContext } from 'react';

// UI actions provided by <App> (navigation + global modals). Pillar components
// consume these instead of receiving a deep chain of props.
//
// Shape: {
//   navigateToPillar(id), openSettings(),
//   openPullModal(prefillRecipe?), openRecipeModal(), viewRecipe(recipe),
//   logReadingSession(book),
// }
export const UIContext = createContext(null);

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside <UIContext.Provider>');
  return ctx;
}
