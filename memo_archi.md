# Memo Architecture

## Organisation retenue
- `screens/` : toutes les pages (menu + pages hors menu). Chaque page a son dossier.
- `screens/<page>/features/` : fonctionnalités réglables propres à cet écran (composant + logique + data).
- `components/` : composants existants (conservés en l'état).
- `modules/` : éléments partagés globaux (placeholder pour futurs modules réutilisables).
- `core/feature-flags/` : système global de réglages (dev + client + remote).

## Pages vs Features
- **Pages** = écrans de navigation.
- **Features** = blocs fonctionnels activables/masquables au sein d'un écran.
- Une page peut afficher plusieurs features; une feature appartient à un écran via `screens/<page>/features`.

## Réglages (dev + client)
- Les **flags dev** pilotent la disponibilité et les defaults.
- Les **flags client** pilotent l'affichage final si la feature est autorisée.
- **Pas d'override dev** sur le choix utilisateur, sauf si la feature est rendue indisponible.

## Logique de visibilité (résumé)
1) Si `available = false` (dev) → jamais affiché.
2) Sinon, si `userToggleable = true` → choix utilisateur.
3) Sinon → `defaultEnabled`.

## Flags distants (sans rebuild)
- L'app récupère des flags via `GET /api/app/feature-flags`.
- Exemple de payload attendu :
```
{
  "components": {
    "mancy.main": { "available": false },
    "lunar-calendar.main": {
      "available": true,
      "disabledFromUtc": "2026-02-01T00:00:00Z",
      "disabledUntilUtc": "2026-02-15T00:00:00Z"
    }
  }
}
```
- **À faire côté backend** : exposer cet endpoint.

## Performance (zéro recalcul)
- Registres en constantes (`registry.ts`) et agrégation unique (`core/feature-flags/registries.ts`).
- Rendu filtré via `FeatureSectionList` avec `useMemo`.
