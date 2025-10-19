#!/usr/bin/env python3
import json

# Lire le fichier en.json existant
with open('messages/en.json', 'r', encoding='utf-8') as f:
    en_data = json.load(f)

# Lire les nouvelles traductions
with open('messages/propositions_import_export_en.json', 'r', encoding='utf-8') as f:
    new_translations = json.load(f)

# Ajouter la section propositions dans admin s'il n'existe pas
if 'propositions' not in en_data['admin']:
    en_data['admin']['propositions'] = {}

# Fusionner les traductions
en_data['admin']['propositions'] = new_translations['admin']['propositions']

# Ajouter back et remove dans common s'ils n'existent pas
if 'back' not in en_data['common']:
    en_data['common']['back'] = new_translations['common']['back']
if 'remove' not in en_data['common']:
    en_data['common']['remove'] = new_translations['common']['remove']

# Écrire le résultat
with open('messages/en.json', 'w', encoding='utf-8') as f:
    json.dump(en_data, f, ensure_ascii=False, indent=4)

print("✅ Traductions EN fusionnées avec succès!")
