# Tâche 003 · Paramétrage et matrice de permissions

## Prérequis
- Alignement produit sur la matrice de permissions par statut (rôles vs actions).
- Connaissance des paramètres existants dans `SettingsService` et du front d’administration.
- Tâches 001 et 002 finalisées pour disposer des actions et statuts.

## Implémentation
- Étendre `SettingsService` et le modèle `organization` pour inclure `permissions.per_status` et les seuils métiers (`non_conformity_threshold`, `evaluation_auto_shift`, `revocation_auto_trigger_delay`, `deliverable_naming_pattern`).
- Ajouter la validation Vine correspondante côté backend (`app/validators/admin/organization_settings.ts`).
- Mettre à jour l’API d’admin pour exposer/mettre à jour ces réglages et versionner `settings_snapshot` sur chaque proposition.
- Côté front admin :
  - Étendre le formulaire des réglages avec UI dédiée pour matrix permissions (tableau statuts × actions).
  - Ajouter validations Zod alignées sur Vine.
- Propager les permissions au runtime :
  - Charger les settings dans `PropositionWorkflowService`/policies.
  - Exposer les permissions effectives dans la sérialisation (`permissions` ou `allowedActions`).

## Tests
- Tests Japa :
  - Mise à jour des settings réussit avec payload valide et échoue avec valeurs hors bornes.
  - Snapshot des settings sur une proposition nouvellement publiée.
- Tests unitaires sur la normalisation/merge des permissions (cas défaut + override).
- Tests front (Vitest) pour la logique Zod et la transformation matrix → payload API.
- Test e2e (Playwright) pour modifier une permission et vérifier l’impact sur l’UI proposition (action masquée/affichée).
