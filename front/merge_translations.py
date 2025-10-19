#!/usr/bin/env python3
import json

# Lire le fichier fr.json existant
with open('messages/fr.json', 'r', encoding='utf-8') as f:
    fr_data = json.load(f)

# Lire les nouvelles traductions
with open('messages/propositions_import_export_fr.json', 'r', encoding='utf-8') as f:
    new_translations = json.load(f)

# Ajouter la section propositions dans admin s'il n'existe pas
if 'propositions' not in fr_data['admin']:
    fr_data['admin']['propositions'] = {}

# Fusionner les traductions
fr_data['admin']['propositions'] = new_translations['admin']['propositions']

# Ajouter back et remove dans common s'ils n'existent pas
if 'back' not in fr_data['common']:
    fr_data['common']['back'] = new_translations['common']['back']
if 'remove' not in fr_data['common']:
    fr_data['common']['remove'] = new_translations['common']['remove']

# Écrire le résultat
with open('messages/fr.json', 'w', encoding='utf-8') as f:
    json.dump(fr_data, f, ensure_ascii=False, indent=4)

print("✅ Traductions FR fusionnées avec succès!")
