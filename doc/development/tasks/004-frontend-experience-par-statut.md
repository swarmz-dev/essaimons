# Tâche 004 · Expérience frontend par statut

**Statut actuel : livrée côté UI – en attente d’exécution e2e (dépendances système Playwright) et du formulaire livrable qui bascule sur la Tâche 005.**

## Prérequis
- ✅ API et serializers finalisés (tâches 001–003) pour récupérer statuts, permissions, données associées.
- ✅ Maquettes/UX validées pour les onglets (Clarifications, Amendements, Vote, Mandats, Suivi/CR) et interactions.
- ✅ Catalogue de messages i18n disponible (et complété).

## Implémentation
- ✅ Route `front/src/routes/propositions/[id]` refondue :
  - navigation par onglets (Overview, Clarifications, Amendements, Vote, Mandats, Suivi) conditionnée aux permissions courantes `perStatus` ;
  - timeline enrichie (statut courant, échéances, livrables/votes associés) ;
  - cards et modales pour événements, votes, mandats, commentaires, transitions de statut.
- ✅ Consommation de `permissions.perStatus` et `workflowAutomation` via `workflowPermissionService` + `propositionDetailStore` pour piloter l’affichage et l’état optimiste.
- ✅ Liste `/propositions` : filtres multi-catégories & multi-statuts, badges de retard et rappel de phase courante.
- ✅ Formulaires/boîtes de dialogue livrés pour transitions, événements, votes, mandats, clarifications/amendements (Zod miroir des validators Vine & contraintes ARIA).
- ➖ Formulaire livrable/upload : design préparé mais reporté sur la Tâche 005 (livrable = dépend des automatismes back).
- ✅ Publication privée/publique inchangée (gérée par Tâche 001) – aucune régression.
- ✅ Accessibilité : tabs clavier, rôles ARIA, badges lisibles.

## Tests
- ✅ Vitest :
  - `workflowPermissionService.test.ts` (rôles/admin/mandaté) ;
  - `Tabs.svelte.test.ts` (navigation et désactivation) ;
  - `page.svelte.test.ts` minimal pour régression.
- ⏳ Playwright :
  - Parcours _demo_ et _login_ passent sur mock backend.
  - Parcours _proposition-create_ reste rouge : la sélection des initiateurs via `MultiSelect` n’est pas encore scriptée (composant accessible mais nécessite ciblage dédié). Correction prévue dans la TODO tests front.
  - Suites “réel backend” en veille (dépendent d’un environnement seedé + credentials).

## Suivi et préparation Tâche 005
- Front prêt pour exploiter `workflowAutomation` (affiché dans l’onglet Suivi) ;
- Stores/services déjà mutualisés pour consommer nouveaux endpoints (livrables/procédures) à venir ;
- Manquent côté UI :
  - boutons/flux upload livrable (à brancher sur API Tâche 005) ;
  - indicateurs de procédure “non conforme” une fois les données exposées.
- Prévoir d’étendre les tests e2e une fois Playwright fonctionnel et les jobs d’automatisation livrés.
