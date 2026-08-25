# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ce qu'est ce dépôt

*Apocalypse Zombie* — tower defense 3D voxel, vue à la troisième personne, un seul build web (manette sur PC, tactile sur iPad), pour un enfant de 8 ans.

**Il n'y a pas encore une ligne de code.** Le dépôt est à l'état de **spec** : le livrable en cours est un jeu de décisions verrouillées, assez complet pour qu'un agent code la v1 sans reposer une question de conception. Écrire le code sera un effort séparé.

Quatre choses vivent sur `main` :

- `docs/spec/` — la **spec** : la source de vérité du jeu, onze chapitres, **en cours de rédaction**. Son [`README`](docs/spec/README.md) porte le sommaire, la page des interdits et les règles d'écriture. C'est elle qu'on lit pour connaître une **valeur** ; tant qu'un chapitre manque, sa source reste les tickets que le sommaire nomme.
- `CONTEXT.md` — le **glossaire** : le vocabulaire tranché, et lui seul. À relire avant tout travail, à enrichir à la clôture d'un ticket, jamais avant qu'un terme soit réellement tranché.
- `docs/adr/` — les décisions d'architecture.
- `docs/research/` — les recherches à sources primaires. Chaque affirmation y porte une étiquette (`[source]`, `[mesuré]`, `[calcul]`, `[incertain]`, `[à mesurer]`) ; ne jamais citer un chiffre de ces documents sans son étiquette.

**La spec est la source de vérité ; les tickets GitHub sont l'archive du raisonnement** — on y va pour comprendre un **motif**, jamais pour connaître une **valeur** : beaucoup ont été rectifiés, et lus seuls ils mentent. Le glossaire nomme, la spec calcule ; les ADR ne portent que ce qui contraint le code. Une décision qui change se change dans la spec, par PR : **on ne rouvre jamais un ticket fermé**.

## Le workflow : la carte wayfinder

L'issue [#1](https://github.com/ben-barbier/apocalypse-zombie/issues/1) (label `wayfinder:map`) est la **carte** : destination, cadre verrouillé, décisions prises, brouillard, hors périmètre. Les tickets sont ses **sous-issues**, étiquetées `wayfinder:research` / `prototype` / `grilling` / `task`.

```bash
gh issue view 1                     # la carte — à charger avant toute session de conception
gh issue list --state open          # les tickets ouverts
gh issue view <n> --comments        # la question (corps) ET la réponse (commentaire de clôture)
gh issue edit <n> --add-assignee @me   # revendiquer un ticket AVANT de travailler
```

Trois pièges de lecture :

1. **Le corps d'un ticket ne contient que la question.** La décision est dans son commentaire de résolution, d'où `--comments` systématiquement.
2. **Une décision en rectifie souvent une précédente** (le plan de la ville, les ombres, l'état de la soute, la couleur du jet de feu…). La ligne correspondante de *Decisions so far* sur la carte signale la rectification — s'y fier plutôt qu'au ticket rectifié lu seul.
3. Issues et PR partagent la même numérotation GitHub : un `#18` peut être une PR.

Un ticket par session, jamais deux (les tickets de recherche exceptés). Le skill `/wayfinder` porte la procédure complète.

## Commandes

**Aucune aujourd'hui** : pas de `package.json`, pas de build, pas de test. Ne pas en inventer.

Le cadre technique est tranché (ticket [#13](https://github.com/ben-barbier/apocalypse-zombie/issues/13)) et attend la première ligne de code : npm avec lockfile commité, TypeScript 7 `strict`, Vite 8, Vitest 4, `three@0.185.1` épinglé sans accent circonflexe + `@types/three` (`three` ne publie aucun champ `types`), **zéro autre dépendance d'exécution**. Scripts prévus : `dev`, `build`, `test`, `bench`, `check` (`tsc` + garde d'architecture). Tests co-localisés (`sword.test.ts` à côté de `sword.ts`), donc un test seul se lance par son chemin : `npx vitest run src/game/sword.test.ts`.

**Prototypes** : un fichier HTML autonome par prototype, Three.js embarqué dedans, aucune dépendance — il s'ouvre directement dans un navigateur. Ils vivent sur des branches `prototype/*` (`prototype/deplacement-camera`, `prototype/planche-art`), sont **jetables** et ne sont **jamais** fusionnés dans `main` — donc tout ce qui doit survivre à un prototype est recopié en toutes lettres dans la spec, qui ne renvoie jamais à une branche `prototype/*`.

## L'architecture, déjà tranchée

La règle dont tout le reste découle ([ADR-0001](docs/adr/0001-logique-de-jeu-sans-moteur-3d.md)) : **`src/game/` n'importe rien** — ni `three`, ni `Math.random`, ni `Date.now`, ni `performance.now`, ni `window`, ni `document`. `src/render/` importe les **types** de `src/game/` et jamais ses fonctions ; `src/app/` importe les deux. Un **test de garde** lit les fichiers et échoue sur toute violation : la règle est exécutable, pas déclarative.

Ce qui en découle, et qu'on ne rediscute pas :

- **Un seul objet `Game`**, alloué au chargement et jamais remplacé, en structures de tableaux (`zombies.x: Float32Array(60)`, `.type: Uint8Array(60)`…). Mutation en place, **zéro allocation dans la boucle**, jamais d'immuabilité. Trois branches : `balance` (constantes gelées), `snapshot` (la frontière de vague sérialisée), `assault` (les pools volatils : 60 zombies, 96 projectiles, 600 éclats, le joueur).
- **Seul `src/game/` écrit.** Le rendu reçoit `Readonly<Game>` et n'infère rien en comparant deux états : `step()` remplit un **tampon d'événements pré-alloué de 256 entrées**, vidé à chaque image, que le rendu, l'audio et les tests lisent tous les trois.
- **Pas de temps fixe à 16,666 ms avec accumulateur**, horloge prise sur le `timestamp` de `requestAnimationFrame`, `dt` borné à 100 ms, interpolation au rendu (`xPrev`/`zPrev`/`angPrev`). L'ordre du pas est fixe et écrit dans `step.ts` : entrées → joueur → épée → zombies → canons → projectiles → économie → vagues → mairie.
- **Déterminisme** : un seul PRNG mulberry32 dont l'état vit dans `Game` et part dans l'instantané. Une partie est rejouable à partir de (graine + suite des entrées) — c'est ce qui rend le banc d'équilibrage possible, et ce que `Math.random()` casserait.
- **`game/balance.ts` est injecté, pas importé** (`createGame(BALANCE)`), en unités du domaine (blocs, secondes, coups d'épée, pièces) et jamais en unités par pas ; la conversion appartient à la simulation.
- **La qualité de rendu ne touche jamais la simulation** : `render/quality.ts` ne joue que sur la résolution, les props et le pool d'éclats. Faire varier le plafond de zombies ferait dépendre la difficulté du matériel et invaliderait l'équilibrage.
- **Budget** : ≤ 80 draw calls par image, `setPixelRatio(1)`, un seul contexte WebGL, aucune ombre portée, aucune lumière ponctuelle.

Arborescence prévue :

```
src/game/     balance · state · random · step · waves · zombies · player ·
              sword · cannons · projectiles · economy · townhall · snapshot
src/render/   scene · city · characters · cannons · props · effects ·
              camera · hud · atlas · context · quality
src/app/      loop · input · airlock · storage
src/audio/
bench/        le banc d'équilibrage (une partie ≈ 50 000 pas, ~1 s, sans rendu)
public/       atlas.png · index.html
```

Tests : unitaires Vitest sur `src/game/` en environnement `node`, écrits **contre les chiffres de la spec** (la table des vagues, la durée de traversée d'une rue, les points de vie de la mairie…) ; garde d'architecture ; banc d'équilibrage ; rejouabilité comparée octet à octet. **Aucun test de rendu, aucune capture, aucun navigateur automatisé en v1.**

## La langue

Français partout — glossaire, tickets, commits, texte affiché dans le jeu — **sauf le code, en anglais** : dossiers, fichiers, identifiants, types, commentaires.

[ADR-0002](docs/adr/0002-code-en-anglais-conception-en-francais.md) fixe la table de correspondance glossaire → identifiant : un terme reçoit **un mot et un seul** (`Costaud` → `bruiser`, `Fauchée` → `sweep`, `Sas` → `airlock`, `Instantané` → `snapshot`…). Elle porte aussi la liste des **mots interdits dans le code** — `enemy`, `tower`/`turret`, `boss`, `score`, `health`, `ammo`, `particle`, `fog`, `pause`/`menu`, `round`/`level`, `update`/`tick`, `entity`/`gameObject`, `spawnRate`, `save`… Les deux listes sont tenues par le test de garde : le flottement de vocabulaire est une erreur de test.

Deux pièges qui reviennent :

- **Deux unités de dégâts**, jamais un `damage: number` qui les confondrait : `swordHits` pour les zombies, `shamblerHits` pour les constructions.
- **`state` contre `snapshot`** : `state` est l'état vivant en mémoire, `snapshot` est ce qui part dans `localStorage`.

Les listes `_Éviter_` de `CONTEXT.md` gouvernent le **français** et ne se traduisent pas.

## Commits

Français, préfixe emoji suivi de deux-points, et un sujet qui dit **la décision**, pas le fichier touché :

```
📚: glossaire des effets — éclat, mire, cerne, et le jet de feu rectifié
📚: architecture — la logique de jeu n'importe rien, et le code passe en anglais
```

Le travail de documentation passe par une branche (`docs/…`) et une PR.

## Piège connu

Ne présumer **aucune** préférence technique à partir des autres dépôts de cette machine : le propriétaire a explicitement posé que la stack de ce projet n'a rien à voir. Tout ce qui n'est pas déjà tranché dans un ticket se décide à partir de faits, ticket par ticket.
