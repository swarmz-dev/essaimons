# Tâche 003 · Paramétrage et matrice de permissions

**Statut actuel : livrée – paramétrage complet (permissions par statut + seuils automatisation) disponible via l’admin.**

> ℹ️ Décision produit : la matrice de permissions doit désormais être structurée en trois niveaux (`statut → rôle → action`). Les clés « rôle.action » utilisées lors de la première itération doivent être démantelées pour exposer des objets imbriqués. Les évolutions à prévoir sont listées ci-dessous pour les tâches connexes.

## Prérequis
- Alignement produit sur la matrice de permissions par statut (rôles vs actions).
- Connaissance des paramètres existants dans `SettingsService` et du front d’administration.
- Tâches 001 et 002 finalisées pour disposer des actions et statuts.

## Implémentation
- ✅ `SettingsService` stocke désormais `permissions.perStatus` et un bloc `workflowAutomation` (seuil non conforme, décalage auto d’évaluation, délai de révocation, patron de nommage).
- 🔄 Restructurer `permissions.perStatus` en `{ [status]: { [role]: { [action]: boolean } } }` ; adapter valeurs par défaut, merge/caching et serializers en conséquence.
- ✅ Validation Vine enrichie (`app/validators/admin/organization_settings.ts`) + contrôleur admin mis à jour pour accepter les nouveaux champs.
- ✅ Sérialisation `SerializedOrganizationSettings` expose `permissions.perStatus` et `workflowAutomation`, réutilisés côté front (`+layout.server.ts`, store organisation, UI admin).
- ✅ Interface admin : nouvel onglet "Propositions" avec
  - champs numériques/texte pour les seuils automatiques,
  - tableau interactif des permissions (à migrer vers une grille `statut × rôle × action` en phase avec la nouvelle structure backend ; payload attendu : `permissions[perStatus][status][role][action]`).
- ✅ Workflow API continue d’utiliser `SettingsService.getWorkflowPermissions()` (cache actualisé après chaque mise à jour).
- 🔄 Suivi : `settings_snapshot` dans les propositions reste à versionner (pris en charge par une tâche ultérieure).

## Tests
- ✅ E2E Japa `proposition_workflow_api.spec.ts` valide les changements de permissions (`node ace test --files tests/e2e/proposition_workflow_api.spec.ts`).
- 🔄 À prévoir : tests unitaires dédiés au merge des permissions + validation des seuils, checks front (Vitest/Playwright) lorsque l’UI de permissions sera couplée à l’UX proposition.
