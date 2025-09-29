# Tâche 005 · Automatisations livrables & procédures

## Prérequis
- Tâches 001 et 002 complètes pour disposer des tables et services de base.
- Seuils et délais configurés via Tâche 003.
- Paramètres d'automatisation validés : déclenchement évènementiel des recalculs (cooldown minimal de 10 minutes), offsets et seuils initialisés dans `workflowAutomation` avec des valeurs par défaut adaptées à un petit projet.

## Implémentation
- Étendre `workflowAutomation` côté back/front pour exposer les paramètres suivants (avec valeurs par défaut minimales) :
  - `deliverableRecalcCooldownMinutes` → 10 minutes ;
  - `evaluationAutoShiftDays` → offset fixe pour les itérations suivantes (valeur par défaut conservatrice de 14 jours si aucun override n'est fourni) ;
  - `nonConformityPercentThreshold` → pourcentage de votes "pour" déclenchant la procédure (par défaut 10 %) ;
  - `nonConformityAbsoluteFloor` → nombre minimal de votes "pour" à atteindre (par défaut 5) ;
  - `revocationAutoTriggerDelayDays` → délai d'inaction en jours calendaires avant passage au vote révocatoire (par défaut 7) ;
  - `revocationCheckFrequencyHours` → cadence du job de surveillance (par défaut toutes les 24 h).
- Créer un job Adonis ou un scheduler dédié pour recalculer les échéances (`evaluationDeadline`, `mandateDeadline`) lors des uploads de livrables ou des retards détectés, en respectant le cooldown de 10 minutes entre deux exécutions pour une même proposition/mandat.
- Implémenter la logique :
  - Première échéance calculée depuis validation mandature.
  - Retard → marquage "non respectée" + nouvelle échéance basée sur l'offset `evaluationAutoShiftDays`.
- Gérer la procédure "Non conforme" :
  - Calcul du seuil via `nonConformityPercentThreshold` combiné au plancher `nonConformityAbsoluteFloor` sur `deliverable_evaluations`.
  - Déclenchement automatique : flag sur le livrable, ouverture des commentaires au mandaté, notifications.
  - Délai d’inaction (jours calendaires) → repositionnement échéance de vote pour lancer vote révocatoire, contrôlé selon `revocationCheckFrequencyHours`.
- Créer la demande de révocation automatique/manuelle (liaison `mandate_revocation_requests` + vote phase `revocation`).
- Mettre à jour les serializers pour exposer l’historique des échéances, statut livrable, procédures en cours et les nouveaux paramètres d'automatisation.

## Tests
- Tests unitaires sur la logique de recalcul (cas première échéance, retard, multiples itérations).
- Tests Japa d’intégration vérifiant :
  - Upload livrable → création record, association mandat, recalcul échéance avec respect du cooldown.
  - Livrable en retard → historique marque non respecté + nouvelle échéance (vérifier dates).
  - Atteinte du seuil non conforme → création automatique d’une demande de procédure.
  - Délai expiré → création vote révocatoire programmé (en tenant compte de la cadence configurée).
- Tests e2e Playwright pour un mandaté : upload dans les temps vs en retard, visualisation UI (statut, prochaine échéance, procédure).
