# Plan de tâches – cycle de vie des propositions

| ID | Titre | Description synthétique |
| -- | ----- | ----------------------- |
| 001 | Modèle & migrations du workflow | Créer le schéma de données complet du cycle (statuts, votes, mandats, livrables, commentaires, réactions). |
| 002 | Services backend & API workflow | Implémenter les transitions de statuts, règles métiers et endpoints associés. |
| 003 | Paramétrage et matrice de permissions | Étendre les settings organisation pour gérer les permissions/actions par statut et les seuils métier. |
| 004 | Expérience frontend par statut | Adapter l’UI SvelteKit pour afficher les onglets/contextes selon le statut et assurer les formulaires côté client. |
| 005 | Automatisations livrables & procédures | Mettre en place les règles automatiques (recalcul échéances, non-conformité, votes de révocation). |
| 006 | Notifications & auditabilité | Assurer notifications, suivi historique et instrumentation transverses du workflow. |

Chaque tâche dispose de sa fiche détaillée dans `doc/development/tasks/`.
