# Tâche 007 · Rôles personnalisés & actions sur mesure

## Objectif
Permettre à l’organisation de définir des rôles workflow spécifiques à une proposition, d’attribuer ces rôles à des utilisateurs, et d’exposer des actions personnalisées pouvant être déployées sur un ou plusieurs statuts. Ces actions déclenchent ensuite des évènements (internes / webhooks) exploitables par des automatisations.

## Prérequis
- Tâches 001 → 005 livrées (modèle, workflow de base, paramétrage permissions, UI propositions, automatisations).
- Décision produit sur les scénarios d’attribution (qui peut donner quel rôle, limites par proposition, visibilité des actions).
- Alignement avec l’équipe intégrations pour le format des webhooks / événements déclenchés par les actions personnalisées.

## Implémentation backend
- Étendre `PropositionWorkflowService` et le modèle pour gérer des rôles dynamiques :
  - Ajouter une table `proposition_roles` (définition de rôle par proposition) et `proposition_role_assignments` (utilisateur ↔ rôle ↔ proposition).
  - Mettre à jour `resolveActorRole` pour agréger les rôles "classiques" + les rôles personnalisés d’une proposition.
  - Introduire des permissions de gestion (`manage_roles`, `assign_roles`, etc.) dans la matrice.
- Exposer de nouveaux endpoints :
  - CRUD des rôles personnalisés (`POST /api/propositions/:id/roles`, etc.).
  - Attribution / révocation (`POST /api/propositions/:id/roles/:roleId/users`).
- Définir un modèle `PropositionCustomAction` (nom, description, statut associés, payload déclenché) et un endpoint pour les déclarer.
- Enregistrer les déclenchements (`PropositionCustomActionEvent`) + publier un hook/adaptateur (webhook, bus interne) pour consommation ultérieure.

## Implémentation frontend
- Dans l’UI proposition (Tâche 004), ajouter :
  - Une section de gestion des rôles personnalisés (listes, assignations par utilisateur, boutons selon permissions).
  - Des boutons d’action personnalisée visibles selon statut + rôle.
- Dans l’admin settings, enrichir la matrice de permissions pour afficher les nouveaux privilèges (`assign_roles`, etc.).
- Prévoir une vue pour définir les actions (intitulé, statut cible, icône éventuellement) avant de les disponibiliser sur la proposition.

## Permissions & sécurité
- Étendre `permissionCatalog` pour intégrer `manage_roles`, `assign_roles`, `trigger_custom_action`.
- Définir le flux d’autorisation : qui peut créer un rôle ? qui peut l’assigner ? (ex : initiator.manage_roles = true).
- S’assurer que les API de déclenchement respectent la matrice dynamique (rôle, statut, action).

## Évènements & webhooks
- Sur déclenchement d’une action personnalisée, publier un événement métier (ex: `proposition.custom_action.triggered`).
- Permettre la configuration d’URL de webhook (ou réutiliser le système existant) pour notifier les intégrations sans compromettre la latence du front.

## Tests
- Tests unitaires pour `resolveActorRole` avec rôles dynamiques.
- Scénarios Japa couvrant : création rôle, assignation, refus si permissions absentes, déclenchement d’action sur statut autorisé.
- Tests frontend (Vitest/Playwright) validant : affichage conditionnel des boutons, expérience assignation/désassignation, succès/erreurs backend.
- Tests webhook (simuler endpoint externe) ou au minimum vérification des payloads publiés.

## Livraison & migration
- Script de migration pour créer les tables `proposition_roles`, `proposition_role_assignments`, `proposition_custom_actions`, `proposition_custom_action_events`.
- Migration de données pour transformer les rôles/actions déjà définis en settings (si nécessaire) vers catalogue proposition.
- Guide de mise à jour (doc) décrivant comment déclarer et exploiter ces nouveaux rôles/actions.

