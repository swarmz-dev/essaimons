# Tâche 005 · Automatisations livrables & procédures

## Prérequis
- Tâches 001 et 002 complètes pour disposer des tables et services de base.
- Seuils et délais configurés via Tâche 003.
- Confirmation produit sur les intervalles de recalcul (logique exacte décrite dans les cas d’usage 2 & 3).

## Implémentation
- Créer un job Adonis ou un scheduler dédié pour recalculer les échéances (`evaluationDeadline`, `mandateDeadline`) lors des uploads de livrables ou des retards détectés.
- Implémenter la logique :
  - Première échéance calculée depuis validation mandature.
  - Retard → marquage "non respectée" + nouvelle échéance basée sur intervalle précédents.
- Gérer la procédure "Non conforme" :
  - Calcul du seuil (>=10 votes ou ≥10% votes POUR) sur `deliverable_evaluations`.
  - Déclenchement automatique : flag sur le livrable, ouverture des commentaires au mandaté, notifications.
  - Délai d’inaction → repositionnement échéance de vote pour lancer vote révocatoire.
- Créer la demande de révocation automatique/manuelle (liaison `mandate_revocation_requests` + vote phase `revocation`).
- Mettre à jour les serializers pour exposer l’historique des échéances, statut livrable, procédures en cours.

## Tests
- Tests unitaires sur la logique de recalcul (cas première échéance, retard, multiples itérations).
- Tests Japa d’intégration vérifiant :
  - Upload livrable → création record, association mandat, recalcul échéance.
  - Livrable en retard → historique marque non respecté + nouvelle échéance (vérifier dates).
  - Atteinte du seuil non conforme → création automatique d’une demande de procédure.
  - Délai expiré → création vote révocatoire programmé.
- Tests e2e Playwright pour un mandaté : upload dans les temps vs en retard, visualisation UI (statut, prochaine échéance, procédure).
