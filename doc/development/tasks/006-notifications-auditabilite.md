# Tâche 006 · Notifications & auditabilité

## Prérequis
- Tâches 001–005 fournissant les événements déclencheurs et les données à notifier.
- Choix des canaux de notification (email, in-app) et des templates i18n.
- Vérification des besoins de conformité (RGPD, conservation des logs).

## Implémentation
- Etendre le système de notifications existant ou créer un module dédié pour :
  - Transition de statut (notify initiateurs, contributeurs concernés).
  - Atteinte du seuil non conforme, ouverture procédure, lancement vote révocatoire.
  - Affectation/retrait de mandat, upload livrable, échéance imminente.
- Ajouter des templates email (avec fallback texte) et les traductions associées.
- Implémenter un journal d’audit :
  - Enregistrement des changements critiques (permissions, settings, votes, livrables).
  - Exposition via API sécurisée pour les administrateurs.
- Mettre en place des métriques/alertes (ex. logs structurés, comptage procédures en cours).
- Documenter la purge/archivage des logs et notifications.

## Tests
- Tests unitaires sur le module de notification pour vérifier les payloads générés selon chaque événement.
- Tests d’intégration Japa : simulation de transition → notification envoyée (mock transport), audit log créé.
- Tests e2e (optionnel) pour vérifier la présence des notifications in-app et emails (via sandbox transport).
- Vérification manuelle des templates (preview) dans les deux langues principales.
