# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ce qu'est ce dépôt

*Apocalypse Zombie* — tower defense 3D voxel, vue à la troisième personne, un seul build web (manette sur PC, tactile sur iPad), pour un enfant de 8 ans.

**La spec est écrite** — onze chapitres, toutes les décisions de conception verrouillées et chiffrées. Ce qui reste est le code : un squelette gardé, sans jeu dedans, à remplir module par module **contre** la spec.

Cinq choses vivent sur `main` :

- `docs/spec/` — la **spec** : la source de vérité du jeu, onze chapitres. Son [`README`](docs/spec/README.md) porte le sommaire, **la page des interdits — à relire avant chaque session de code** — et les règles d'écriture. C'est elle, et elle seule, qu'on lit pour connaître une **valeur**.
- `CONTEXT.md` — le **glossaire** : le vocabulaire tranché, et lui seul. À relire avant tout travail, à enrichir à la clôture d'un ticket, jamais avant qu'un terme soit réellement tranché.
- `docs/adr/` — les décisions d'architecture.
- `docs/research/` — les recherches à sources primaires. Chaque affirmation y porte une étiquette (`[source]`, `[mesuré]`, `[calcul]`, `[incertain]`, `[à mesurer]`) ; ne jamais citer un chiffre de ces documents sans son étiquette.
- `src/`, `bench/`, `public/` — le code, écrit **contre** la spec et gardé par un test qui lit les fichiers.

**La spec est la source de vérité ; les tickets GitHub sont l'archive du raisonnement** — on y va pour comprendre un **motif**, jamais pour connaître une **valeur** : beaucoup ont été rectifiés, et lus seuls ils mentent. Le glossaire nomme, la spec calcule ; les ADR ne portent que ce qui contraint le code. Une décision qui change se change dans la spec, par PR : **on ne rouvre jamais un ticket fermé**.

## Le workflow : la spec, et l'archive

**On lit la spec.** L'issue [#1](https://github.com/ben-barbier/apocalypse-zombie/issues/1) (label `wayfinder:map`) est la carte qui a produit cette spec ; son travail est fini et elle est devenue l'**archive du raisonnement**, avec ses quarante-cinq tickets fermés. On n'y va que pour comprendre un **motif** — jamais pour connaître une **valeur**, qui est dans la spec. Coder la v1 ouvrira une **nouvelle carte**.

```bash
gh issue view <n> --comments        # la question (corps) ET la réponse (commentaire de clôture)
gh issue list --state open          # les tickets ouverts
gh issue edit <n> --add-assignee @me   # revendiquer un ticket AVANT de travailler
```

Trois pièges de lecture, valables pour toute la fouille de l'archive :

1. **Le corps d'un ticket ne contient que la question.** La décision est dans son commentaire de résolution, d'où `--comments` systématiquement.
2. **Une décision en rectifie souvent une précédente** (le plan de la ville, les ombres, l'état de la soute, la couleur du jet de feu…). La ligne correspondante de *Decisions so far* sur la carte signale la rectification — s'y fier plutôt qu'au ticket rectifié lu seul, et se fier à la spec plutôt qu'aux deux.
3. Issues et PR partagent la même numérotation GitHub : un `#18` peut être une PR.

Un ticket par session, jamais deux (les tickets de recherche exceptés). Le skill `/wayfinder` porte la procédure complète.

## Commandes

```bash
npm run check     # tsc + la garde d'architecture — à passer avant toute revue
npm test          # tous les tests, environnement node
npm run dev       # Vite
npm run build     # le bundle statique
npm run bench     # le banc d'équilibrage (spec chapitre 11)
```

**Cinq scripts, et cinq seulement** ([spec 10-46](docs/spec/10-l-architecture.md)). Tests co-localisés (`sword.test.ts` à côté de `sword.ts`), donc un test seul se lance par son chemin : `npx vitest run src/game/sword.test.ts`. `npm run bench` échoue tant que `bench/` n'existe pas — c'est attendu.

**Prototypes** : un fichier HTML autonome par prototype, Three.js embarqué dedans, aucune dépendance — il s'ouvre directement dans un navigateur. Ils vivent sur des branches `prototype/*` (`prototype/deplacement-camera`, `prototype/planche-art`), sont **jetables** et ne sont **jamais** fusionnés dans `main` — donc tout ce qui doit survivre à un prototype est recopié en toutes lettres dans la spec, qui ne renvoie jamais à une branche `prototype/*`.

## L'architecture

Elle est **entièrement tranchée**, et le chapitre [`docs/spec/10-l-architecture.md`](docs/spec/10-l-architecture.md) fait foi : la frontière, la forme de l'état, le tampon d'événements, la boucle, le hasard, le stockage, les tests, l'arborescence et la garde. Ce fichier n'en recopie **aucun chiffre** — un chiffre écrit à deux endroits finit par diverger, et c'est la spec qui gagne.

La seule règle à connaître **avant d'ouvrir un fichier** ([ADR-0001](docs/adr/0001-logique-de-jeu-sans-moteur-3d.md)) : **`src/game/` n'importe rien** — ni `three`, ni `Math.random`, ni `Date.now`, ni `performance.now`, ni `window`, ni `document`. `src/render/` importe les **types** de `src/game/` et jamais ses fonctions ; `src/app/` importe les deux. Le **test de garde** (`src/architecture.test.ts`) lit les fichiers et échoue sur toute violation : la règle est exécutable, pas déclarative.

Tout le reste — les pools et leurs tailles, le pas, l'ordre du pas, les budgets de rendu, les paliers de qualité, la liste des modules — se lit dans le chapitre 10 au moment d'écrire le module concerné.

## La langue

Français partout — glossaire, tickets, commits, texte affiché dans le jeu — **sauf le code, en anglais** : dossiers, fichiers, identifiants, types, commentaires.

[ADR-0002](docs/adr/0002-code-en-anglais-conception-en-francais.md) fixe la table de correspondance glossaire → identifiant : un terme reçoit **un mot et un seul** (`Costaud` → `bruiser`, `Fauchée` → `sweep`, `Sas` → `airlock`, `Instantané` → `snapshot`…). Elle porte aussi la liste des **mots interdits dans le code** — `enemy`, `tower`/`turret`, `boss`, `score`, `health`, `ammo`, `particle`, `fog`, `pause`/`menu`, `round`/`level`, `update`/`tick`, `entity`/`gameObject`, `spawnRate`, `save`… Les deux listes sont tenues par le test de garde : le flottement de vocabulaire est une erreur de test.

Deux pièges qui reviennent :

- **Trois unités de dégâts**, jamais un `damage: number` qui les confondrait : `swordHits` pour les zombies, `shamblerHits` pour les constructions, `contacts` pour le joueur.
- **`state` contre `snapshot`** : `state` est l'état vivant en mémoire, `snapshot` est ce qui part dans `localStorage`.

Les listes `_Éviter_` de `CONTEXT.md` gouvernent le **français** et ne se traduisent pas.

## Commits

Français, préfixe emoji suivi de deux-points, et un sujet qui dit **la décision**, pas le fichier touché :

```
📚: glossaire des effets — éclat, mire, cerne, et le jet de feu rectifié
🏗️: le squelette — cinq scripts, un mulberry32, et la garde qui mord
```

`📚:` pour la documentation, `🏗️:` pour le code. Le travail passe par une branche — `docs/…` pour la spec et le glossaire, `code/…` pour le code — et par une PR.

## Piège connu

Ne présumer **aucune** préférence technique à partir des autres dépôts de cette machine : le propriétaire a explicitement posé que la stack de ce projet n'a rien à voir. La stack est tranchée dans la spec ; ce qui ne l'est pas se décide à partir de faits, jamais par analogie.

## Agent skills

### Issue tracker

Les tickets vivent en issues GitHub sur `ben-barbier/apocalypse-zombie`, par la CLI `gh` ; `--comments` est obligatoire, et un ticket ne donne jamais une valeur — seulement un motif. Voir `docs/agents/issue-tracker.md`.

### Triage labels

Les cinq rôles canoniques, chacun sous son propre nom : `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix` — indépendants des `wayfinder:*`. Voir `docs/agents/triage-labels.md`.

### Domain docs

Dépôt **mono-contexte** : la spec `docs/spec/` pour les valeurs, `CONTEXT.md` pour le vocabulaire, `docs/adr/` et `docs/research/` pour le reste. Voir `docs/agents/domain.md`.
