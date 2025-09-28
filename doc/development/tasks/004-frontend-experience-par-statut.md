# Tâche 004 · Expérience frontend par statut

## Prérequis
- API et serializers finalisés (tâches 001–003) pour récupérer statuts, permissions, données associées.
- Maquettes/UX validées pour les onglets (Clarifications, Amendements, Vote, Mandats, Suivi/CR) et interactions.
- Catalogue de messages i18n disponible ou plan de création.

## Implémentation
- Adapter la route `front/src/routes/propositions/[id]` :
  - Introduire la navigation par onglets conditionnée au statut et aux permissions.
  - Afficher la timeline enrichie (échéances + statut + livrables associés).
  - Ajouter composants pour événements, votes, mandats, livrables.
- Mettre à jour la liste `/propositions` pour intégrer filtres/statuts, badges retards et indicateurs procédures.
- Créer/mettre à jour les formulaires :
  - Publication (choix privé/public), transitions, gestion des événements, votes, mandats, livrables.
  - Formulaires de commentaires (clarification, amendement) et réactions.
- Mettre en place les stores/front services pour consommer les nouveaux endpoints et gérer état optimiste.
- Ajouter validations Zod miroir des Vine pour chaque formulaire.
- Garantir l’accessibilité (navigation clavier, ARIA) des onglets et listes.

## Tests
- Tests Vitest unitaires sur composants critiques (tabs, timeline, formulaires) avec scénarios par statut.
- Tests d’intégration SvelteKit (ex. via `@testing-library/svelte`) pour vérifier l’affichage conditionnel des actions selon permissions.
- Tests e2e Playwright :
  - Parcours initiateur (publication, passage en amender, vote, mandater, livrables).
  - Parcours contributeur (questions, amendements, vote, candidature mandataire).
  - Parcours mandaté (upload livrable, visualisation statut livrable tardif).
