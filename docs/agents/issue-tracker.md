# Le traqueur : GitHub Issues

Les tickets et les specs de ce dépôt vivent en **issues GitHub**, sur `ben-barbier/apocalypse-zombie`. Tout passe par la CLI `gh`, qui déduit le dépôt du `git remote` — aucune option `--repo` n'est nécessaire depuis un clone.

## Conventions

- **Créer un ticket** : `gh issue create --title "..." --body "..."`. Corps multi-lignes par heredoc.
- **Lire un ticket** : `gh issue view <n> --comments` — **toujours** avec `--comments` (voir le piège ci-dessous).
- **Lister** : `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`, avec les filtres `--label` / `--state` utiles.
- **Commenter** : `gh issue comment <n> --body "..."`
- **Étiqueter** : `gh issue edit <n> --add-label "..."` / `--remove-label "..."`
- **Fermer** : `gh issue close <n> --comment "..."`

## Trois pièges de lecture, propres à ce dépôt

1. **Le corps d'un ticket ne contient que la question.** La décision est dans son commentaire de résolution — d'où `--comments`, systématiquement.
2. **Une décision en rectifie souvent une précédente.** Un ticket lu seul ment. La spec (`docs/spec/`) gagne contre le ticket ; la ligne *Decisions so far* de la carte gagne contre le ticket rectifié.
3. **Issues et PR partagent la même numérotation.** Un `#18` peut être une PR : `gh pr view 18`, à défaut `gh issue view 18`.

**Les tickets sont l'archive du raisonnement, jamais la source d'une valeur.** On y va pour comprendre un *motif*. Une valeur se lit dans `docs/spec/`. Et **on ne rouvre jamais un ticket fermé** : une décision qui change se change dans la spec, par PR.

## Les PR comme surface de demande

**Les PR comme surface de demande : non.** _(Passer à `oui` si ce dépôt traite les PR externes comme des demandes de fonctionnalité ; `/triage` lit ce drapeau.)_

À `oui`, les PR suivent les mêmes libellés et les mêmes états que les tickets, avec les équivalents `gh pr` :

- **Lire une PR** : `gh pr view <n> --comments`, et `gh pr diff <n>` pour le diff.
- **Lister les PR externes à trier** : `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`, puis ne garder que les `authorAssociation` valant `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR` ou `NONE` (écarter `OWNER` / `MEMBER` / `COLLABORATOR`).
- **Commenter / étiqueter / fermer** : `gh pr comment`, `gh pr edit --add-label` / `--remove-label`, `gh pr close`.

## Quand un skill dit « publier dans le traqueur »

Créer une issue GitHub.

## Quand un skill dit « récupérer le ticket concerné »

Lancer `gh issue view <n> --comments`.

## Les opérations de wayfinding

Utilisées par `/wayfinder`. La **carte** est une issue unique, dont les tickets sont les issues **enfants**.

- **Carte** : une issue étiquetée `wayfinder:map`, qui porte le corps *Notes* / *Decisions so far* / *Fog*. `gh issue create --label wayfinder:map`. La carte [#1](https://github.com/ben-barbier/apocalypse-zombie/issues/1) a produit la spec ; son travail est fini. Coder la v1 en ouvrira une nouvelle.
- **Ticket enfant** : une issue rattachée à la carte comme sous-issue GitHub (`gh api` sur le point d'entrée des sous-issues). Là où les sous-issues ne sont pas actives, ajouter l'enfant à une liste de tâches dans le corps de la carte et mettre `Part of #<carte>` en tête du corps de l'enfant. Libellés : `wayfinder:<type>` — `research`, `prototype`, `grilling`, `task`. Une fois revendiqué, le ticket est assigné au dev qui le mène.
- **Blocage** : les **dépendances natives** de GitHub, seule représentation visible dans l'interface. Poser une arête avec `gh api --method POST repos/<owner>/<repo>/issues/<enfant>/dependencies/blocked_by -F issue_id=<id-base-du-bloqueur>`, où `<id-base-du-bloqueur>` est l'**identifiant numérique de base** du bloqueur (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, et *non* son `#numéro` ni son `node_id`). GitHub rapporte `issue_dependencies_summary.blocked_by` — les bloqueurs ouverts seulement, c'est la barrière vivante. À défaut, se rabattre sur une ligne `Blocked by: #<n>, #<n>` en tête du corps de l'enfant. Un ticket est débloqué quand tous ses bloqueurs sont fermés.
- **Requête de frontière** : lister les enfants ouverts de la carte (`gh issue list --state open`, restreint aux sous-issues / à la liste de tâches), écarter ceux qui portent un bloqueur ouvert (`issue_dependencies_summary.blocked_by > 0`, ou une issue ouverte dans la ligne `Blocked by`) ou un assigné ; le premier dans l'ordre de la carte gagne.
- **Revendiquer** : `gh issue edit <n> --add-assignee @me` — la première écriture de la session.
- **Résoudre** : `gh issue comment <n> --body "<la réponse>"`, puis `gh issue close <n>`, puis ajouter un pointeur de contexte (gist + lien) au *Decisions so far* de la carte.

**Un ticket par session, jamais deux** — les tickets de recherche exceptés.
