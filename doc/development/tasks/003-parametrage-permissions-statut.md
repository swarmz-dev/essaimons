# Tâche 003 · Paramétrage et matrice de permissions

**Statut actuel : livrée – paramétrage complet (permissions par statut + seuils automatisation) disponible via l’admin.**

> ℹ️ Les permissions sont désormais stockées et éditées sous la forme `statut → rôle → action`. Les besoins d’extension (rôles/action personnalisés, attribution par proposition) sont couverts dans la Tâche 007.

## Prérequis
- Alignement produit sur la matrice de permissions par statut (rôles vs actions).
- Connaissance des paramètres existants dans `SettingsService` et du front d’administration.
- Tâches 001 et 002 finalisées pour disposer des actions et statuts.

## Implémentation
- ✅ `SettingsService` stocke désormais `permissions.perStatus` et un bloc `workflowAutomation` (seuil non conforme, décalage auto d’évaluation, délai de révocation, patron de nommage).
- ✅ `permissions.perStatus` et `permissionCatalog` suivent la structure `{ statut → rôle → action }` avec support des rôles/action personnalisés (cf. Tâche 007 pour l’assignation utilisateur).
- ✅ Validation Vine enrichie (`app/validators/admin/organization_settings.ts`) + contrôleur admin mis à jour pour accepter les nouveaux champs.
- ✅ Sérialisation `SerializedOrganizationSettings` expose `permissions.perStatus` et `workflowAutomation`, réutilisés côté front (`+layout.server.ts`, store organisation, UI admin).
- ✅ Interface admin : onglet "Propositions" complet (décalages, automatisations, permissions à 3 dimensions + création de rôles/actions personnalisés).
- ✅ Workflow API continue d’utiliser `SettingsService.getWorkflowPermissions()` (cache actualisé après chaque mise à jour).
- 🔄 `settings_snapshot` (Tâche 005/007) et export des catalogues seront finalisés avec l’UX propositions.

## Tests
- ✅ E2E Japa `proposition_workflow_api.spec.ts` valide les changements de permissions (`node ace test --files tests/e2e/proposition_workflow_api.spec.ts`).
- 🔄 Tests unitaires front/back à étendre (Tâche 004 pour l’intégration UI, Tâche 007 pour l’assignation dynamique).
