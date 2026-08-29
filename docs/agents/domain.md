# Les documents de domaine

Comment les skills d'ingénierie doivent lire la documentation de domaine de ce dépôt avant d'explorer le code.

## Avant d'explorer, lire ceci

- **`docs/spec/`** — la **spec**, source de vérité du jeu : onze chapitres, toutes les décisions de conception verrouillées et chiffrées. Son [`README`](../spec/README.md) porte le sommaire, **la page des interdits — à relire avant chaque session de code** — et les règles d'écriture. **C'est elle, et elle seule, qu'on lit pour connaître une valeur.**
- **`CONTEXT.md`** à la racine — le **glossaire** : le vocabulaire tranché, et lui seul. Le glossaire nomme, la spec calcule.
- **`docs/adr/`** — les ADR qui touchent la zone où l'on va travailler. Ils ne portent que ce qui contraint le code.
- **`docs/research/`** — les recherches à sources primaires. Chaque affirmation y porte une étiquette (`[source]`, `[mesuré]`, `[calcul]`, `[incertain]`, `[à mesurer]`) : **ne jamais citer un chiffre de ces documents sans son étiquette.**

Si l'un de ces fichiers n'existe pas, **continuer en silence**. Ne pas signaler son absence, ne pas proposer de le créer d'avance : `/domain-modeling` les crée paresseusement, quand un terme ou une décision est réellement tranché.

## Structure des fichiers

Ce dépôt est **mono-contexte** :

```
/
├── CONTEXT.md          ← le glossaire
├── docs/
│   ├── spec/           ← la spec, onze chapitres
│   ├── adr/
│   │   ├── 0001-logique-de-jeu-sans-moteur-3d.md
│   │   └── 0002-code-en-anglais-conception-en-francais.md
│   └── research/
└── src/
```

Un dépôt multi-contextes (signalé par un `CONTEXT-MAP.md` à la racine, qui pointe vers un `CONTEXT.md` par contexte, et des `src/<contexte>/docs/adr/`) — **ce n'est pas le cas ici**.

## Employer le vocabulaire du glossaire

Quand une sortie nomme un concept du domaine — titre de ticket, proposition de refactorisation, hypothèse, nom de test —, employer le terme tel que `CONTEXT.md` le définit. Ne pas dériver vers les synonymes que les listes `_Éviter_` du glossaire écartent explicitement.

Deux règles s'ajoutent, propres à ce dépôt :

- **Le français partout, sauf le code.** Glossaire, tickets, commits, texte affiché dans le jeu : en français. Dossiers, fichiers, identifiants, types, commentaires : en anglais. [ADR-0002](../adr/0002-code-en-anglais-conception-en-francais.md) fixe la table glossaire → identifiant (`Costaud` → `bruiser`, `Sas` → `airlock`…) et la liste des **mots interdits dans le code** (`enemy`, `tower`, `health`, `score`, `update`/`tick`, `save`…). Les deux listes sont tenues par le test de garde `src/architecture.test.ts` : le flottement de vocabulaire est **une erreur de test**, pas une question de style.
- Si le concept manque au glossaire, c'est un signal : soit on invente une langue que le projet n'emploie pas (se raviser), soit il y a un vrai trou (le noter pour `/domain-modeling`, et l'enrichir à la clôture du ticket, jamais avant que le terme soit tranché).

## Signaler les conflits d'ADR — et de spec

Si une sortie contredit un ADR existant, le dire explicitement plutôt que de passer outre en silence :

> _Contredit l'ADR-0001 (`src/game/` n'importe rien) — mais vaut d'être rouvert parce que…_

Même règle pour la spec, en plus strict : **une décision qui change se change dans la spec, par PR.** On ne la contourne pas dans le code, et on ne rouvre jamais un ticket fermé pour la rediscuter.
