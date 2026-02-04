// Selection du theme : force le mode dark par defaut pour l'app.
// Pourquoi : garantir une presentation unifiee tant que le mode light n'est pas active explicitement.
export function useColorScheme() {
  return 'dark' as const;
}
