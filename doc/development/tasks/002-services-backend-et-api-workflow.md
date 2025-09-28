# Tâche 002 · Services backend & API workflow

## Prérequis
- Tâche 001 livrée (structures de données et relations disponibles).
- Définition initiale de la matrice de permissions (même provisoire) afin de coder les garde-fous.
- Inventaire des endpoints existants (`PropositionController`, services) pour aligner la nouvelle architecture.

## Implémentation
- Introduire un `PropositionWorkflowService` responsable des transitions de statut, de la validation business et de l’écriture d’historique.
- Adapter `PropositionService` pour supporter la création en statut `A formaliser`, la gestion de visibilité (privé/public) et l’appel au workflow pour les transitions.
- Créer/mettre à jour les endpoints :
  - Publication d’un brouillon → `A clarifier`.
  - Passage entre statuts (clarifier → amender → voter → mandater → évaluer → archiver).
  - Gestion des événements (CRUD sur `proposition_events`).
  - Gestion des votes (configuration, ouverture, clôture) et des bulletins (création sécurisée).
  - Gestion des mandats (candidatures, affectations) et livrables.
  - Gestion des commentaires/réactions par scope.
- Implémenter des policies/middlewares pour vérifier autorisations (rôle + statut + permissions settings).
- Prévoir des méthodes utilitaires pour recalculer les échéances lors des transitions (à connecter à la tâche 005).
- Renvoyer les nouveaux champs dans les serializers (`apiSerialize`, `listSerialize`).

## Tests
- Tests Japa d’API couvrant :
  - Transition valide (ex. `A formaliser` → `A clarifier`) et enregistrement d’historique.
  - Refus d’une transition par un utilisateur non autorisé.
  - Création/édition d’un événement par un initiateur, visibilité contrôle.
  - Configuration d’un vote et blocage des modifications après dépôt d’un bulletin.
  - CRUD commentaires/réactions avec scopes corrects.
- Tests unitaires sur `PropositionWorkflowService` pour valider la logique de transition et les erreurs retournées.
- Tests de sérialisation vérifiant la présence des nouvelles propriétés (`status`, `timeline`, `permissions`).
