# Les libellés de triage

Les skills parlent en **cinq rôles canoniques**. Ce fichier fait la correspondance entre ces rôles et les chaînes de libellés réellement utilisées dans le traqueur de ce dépôt.

| Rôle chez mattpocock/skills | Libellé dans notre traqueur | Sens                                            |
| --------------------------- | --------------------------- | ----------------------------------------------- |
| `needs-triage`              | `needs-triage`              | À évaluer par le mainteneur                     |
| `needs-info`                | `needs-info`                | En attente d'un complément du rapporteur        |
| `ready-for-agent`           | `ready-for-agent`           | Entièrement spécifié, prêt pour un agent AFK    |
| `ready-for-human`           | `ready-for-human`           | Demande une implémentation humaine              |
| `wontfix`                   | `wontfix`                   | Ne sera pas traité                              |

Quand un skill nomme un rôle (« poser le libellé prêt-pour-agent »), utiliser la chaîne de la colonne de droite.

La colonne de droite s'édite : c'est elle qui doit refléter le vocabulaire réel du traqueur.

## État sur GitHub

Seul `wontfix` existe déjà dans le dépôt (libellé par défaut de GitHub). Les quatre autres seront créés au premier usage :

```bash
gh label create needs-triage    --description "À évaluer par le mainteneur"
gh label create needs-info      --description "En attente d'un complément du rapporteur"
gh label create ready-for-agent --description "Entièrement spécifié, prêt pour un agent AFK"
gh label create ready-for-human --description "Demande une implémentation humaine"
```

Ces cinq libellés sont **indépendants** des `wayfinder:*` (`map`, `research`, `prototype`, `grilling`, `task`), qui disent le *type* d'un ticket et non son état de triage. Un ticket peut porter les deux.
