# Tâche 003 · Paramétrage et matrice de permissions

**Statut actuel : livrée – paramétrage complet (permissions par statut + seuils automatisation) disponible via l’admin.**

## Prérequis
- Alignement produit sur la matrice de permissions par statut (rôles vs actions).
- Connaissance des paramètres existants dans `SettingsService` et du front d’administration.
- Tâches 001 et 002 finalisées pour disposer des actions et statuts.

## Implémentation
- ✅ `SettingsService` stocke désormais `permissions.perStatus` et un bloc `workflowAutomation` (seuil non conforme, décalage auto d’évaluation, délai de révocation, patron de nommage).
- ✅ Validation Vine enrichie (`app/validators/admin/organization_settings.ts`) + contrôleur admin mis à jour pour accepter les nouveaux champs.
- ✅ Sérialisation `SerializedOrganizationSettings` expose `permissions.perStatus` et `workflowAutomation`, réutilisés côté front (`+layout.server.ts`, store organisation, UI admin).
- ✅ Interface admin : nouvel onglet "Propositions" avec
  - champs numériques/texte pour les seuils automatiques,
  - tableau interactif des permissions par statut/action (soumission -> `permissions[perStatus][status][action]`).
- ✅ Workflow API continue d’utiliser `SettingsService.getWorkflowPermissions()` (cache actualisé après chaque mise à jour).
- 🔄 Suivi : `settings_snapshot` dans les propositions reste à versionner (pris en charge par une tâche ultérieure).

## Tests
- ✅ E2E Japa `proposition_workflow_api.spec.ts` valide les changements de permissions (`node ace test --files tests/e2e/proposition_workflow_api.spec.ts`).
- 🔄 À prévoir : tests unitaires dédiés au merge des permissions + validation des seuils, checks front (Vitest/Playwright) lorsque l’UI de permissions sera couplée à l’UX proposition.
