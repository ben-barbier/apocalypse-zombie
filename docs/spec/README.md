# La spec d'*Apocalypse Zombie*

Ce dossier est la **spec** du jeu : le gameplay entièrement chiffré et l'architecture technique, assez complet pour qu'un agent code la v1 **sans reposer une seule question de conception**.

Elle est la **source de vérité**. Les [trente-deux tickets fermés](https://github.com/ben-barbier/apocalypse-zombie/issues/1) qui l'ont produite sont l'archive du raisonnement : on y va pour comprendre un **motif**, jamais pour connaître une **valeur** — beaucoup ont été rectifiés, et lus seuls ils mentent.

> **En cours de rédaction.** Un chapitre non écrit n'a pas de fichier ; sa source reste ses tickets, que le sommaire nomme. Le tableau des interdits se récolte quand les onze sont là.

## Comment on la lit

Un chapitre est ce qu'on charge pour un travail : celui qui code `src/game/cannons.ts` lit *Les canons* et rien d'autre. Avant **toute** session de code, on relit **Les interdits** ci-dessous — c'est la liste de ce que le projet a refusé, et c'est précisément ce qu'un agent rajoute spontanément.

Le vocabulaire, lui, est dans [`CONTEXT.md`](../../CONTEXT.md) : **le glossaire nomme, la spec calcule.** La spec n'y redéfinit jamais un terme, elle l'emploie.

## Sommaire

| | chapitre | ce qu'il décide | sources |
|---|---|---|---|
| 1 | [`01-la-partie.md`](01-la-partie.md) | le cadre, la boucle en deux temps, la victoire, la défaite douce, la Rallonge | [#5](https://github.com/ben-barbier/apocalypse-zombie/issues/5), [#20](https://github.com/ben-barbier/apocalypse-zombie/issues/20), [#35](https://github.com/ben-barbier/apocalypse-zombie/issues/35) |
| 2 | [`02-la-ville.md`](02-la-ville.md) | l'étoile à trois branches, la place, les rues, les fronts bâtis, les portiques, la mairie, la base | [#27](https://github.com/ben-barbier/apocalypse-zombie/issues/27), [#25](https://github.com/ben-barbier/apocalypse-zombie/issues/25), [#6](https://github.com/ben-barbier/apocalypse-zombie/issues/6) |
| 3 | [`03-les-zombies.md`](03-les-zombies.md) | les quatre types, les rails, la table des vagues, la cadence, les filets de fin d'assaut | [#7](https://github.com/ben-barbier/apocalypse-zombie/issues/7), [#26](https://github.com/ben-barbier/apocalypse-zombie/issues/26), [#35](https://github.com/ben-barbier/apocalypse-zombie/issues/35), [#20](https://github.com/ben-barbier/apocalypse-zombie/issues/20) |
| 4 | [`04-le-joueur.md`](04-le-joueur.md) | le corps, la course, la caméra assistée, le saut, les échelles, l'épée, la fauchée, les points de vie, le ravitaillement | [#14](https://github.com/ben-barbier/apocalypse-zombie/issues/14), [#10](https://github.com/ben-barbier/apocalypse-zombie/issues/10), [#22](https://github.com/ben-barbier/apocalypse-zombie/issues/22), [#9](https://github.com/ben-barbier/apocalypse-zombie/issues/9), [#24](https://github.com/ben-barbier/apocalypse-zombie/issues/24) |
| 5 | [`05-les-canons.md`](05-les-canons.md) | les trois niveaux, la pose, le boulet, le jet de feu, la portée, l'usure — et pourquoi le canon est seul | [#8](https://github.com/ben-barbier/apocalypse-zombie/issues/8), [#28](https://github.com/ben-barbier/apocalypse-zombie/issues/28) |
| 6 | `06-l-argent.md` | les gains, la prime de bravoure, les prix, la courbe, le Renfort de la mairie | [#11](https://github.com/ben-barbier/apocalypse-zombie/issues/11), [#16](https://github.com/ben-barbier/apocalypse-zombie/issues/16) |
| 7 | `07-le-regard.md` | l'heure orange, les effets, les corps à quatorze boîtes, la planche de textures | [#12](https://github.com/ben-barbier/apocalypse-zombie/issues/12), [#23](https://github.com/ben-barbier/apocalypse-zombie/issues/23), [#29](https://github.com/ben-barbier/apocalypse-zombie/issues/29), [#38](https://github.com/ben-barbier/apocalypse-zombie/issues/38) |
| 8 | `08-le-bandeau-et-le-sas.md` | les cinq affichages, le refus de la carte, le Sas, l'interruption, l'Instantané, le stockage | [#15](https://github.com/ben-barbier/apocalypse-zombie/issues/15), [#17](https://github.com/ben-barbier/apocalypse-zombie/issues/17), [#42](https://github.com/ben-barbier/apocalypse-zombie/issues/42) |
| 9 | `09-les-bruitages.md` | les dix-sept bruitages, le pouls, et leurs paramètres de synthèse | [#30](https://github.com/ben-barbier/apocalypse-zombie/issues/30) |
| 10 | [`10-l-architecture.md`](10-l-architecture.md) | la stack, les modules, l'objet `Game`, le tampon d'événements, le pas, les tests, la garde | [#13](https://github.com/ben-barbier/apocalypse-zombie/issues/13), [ADR-0001](../adr/0001-logique-de-jeu-sans-moteur-3d.md), [ADR-0002](../adr/0002-code-en-anglais-conception-en-francais.md) |
| 11 | `11-le-banc.md` | les trois profils, les huit indicateurs, les seuils, les balayages, `reference.json` | [#41](https://github.com/ben-barbier/apocalypse-zombie/issues/41) |

## Les interdits

<!-- Récolté au ticket de clôture, une fois les onze chapitres écrits : une ligne par « jamais » du projet, avec le chapitre où son motif est écrit. -->

_À écrire._

## Comment on l'écrit

### Le squelette, identique dans les onze chapitres

```
# <Titre>
<Une phrase : ce que ce chapitre décide, et où est le reste.>

## Les règles      ← numérotées, impératives, une phrase chacune
## Les chiffres    ← en tableaux, en unités du domaine (blocs, secondes, coups d'épée, pièces)
## Les interdits   ← « Jamais … — parce que … »
## Pourquoi        ← les motifs qui empêchent un agent de « corriger » un chiffre
## D'où ça vient   ← les tickets sources
```

### L'adressage

Les règles sont numérotées, donc **chaque décision a une adresse stable** : `03-4` est la quatrième règle du chapitre 3. C'est ce qu'on cite dans un test (`// spec 03-4`), dans une PR, dans un commentaire de code — et c'est ce qui remplace le numéro de ticket, maintenant que les tickets sont une archive.

On **n'insère jamais** une règle au milieu : on ajoute à la fin, et le numéro d'une règle supprimée reste vacant.

### Les cinq règles d'écriture

1. **Le glossaire nomme, la spec calcule.** `CONTEXT.md` garde les chiffres constitutifs d'un terme ; la spec porte les tables, les règles de résolution, les motifs et les interdits. En cas de divergence, **la spec gagne**, et la PR qui change un chiffre corrige le glossaire dans le même souffle.
2. **La spec n'a pas d'histoire, elle a un état.** Aucun « rectifié par », aucune valeur périmée, aucune trace de ce qui a été envisagé. L'histoire est dans les tickets et dans `git`.
3. **La spec ne renvoie jamais à une branche `prototype/*`.** Ces branches sont jetables et ne sont jamais fusionnées : tout ce dont le code a besoin est recopié ici en toutes lettres — les paramètres des bruitages, la spécification de la planche de textures. Vérifiable au `grep`.
4. **La spec n'énonce que des décisions, donc elle ne porte pas d'étiquette.** Une décision n'est plus une observation. `docs/research/` est cité pour la provenance, jamais résumé ; les étiquettes (`[source]`, `[mesuré]`, `[calcul]`, `[incertain]`, `[à mesurer]`) ne survivent qu'à un seul endroit, la section *Ce qui reste à vérifier sur l'appareil* du chapitre 10.
5. **On ne rouvre jamais un ticket fermé.** Une décision qui change se change ici, par PR.

## Comment on la met à jour

Trois choses porteront les mêmes chiffres : **la spec** (unités du domaine, avec le motif), **`src/game/balance.ts`** (l'exécutable) et **les tests** (en dur, écrits d'après la spec). Une retouche d'équilibrage **touche les trois dans la même PR**, et le diff de `bench/reference.json` en est le compte rendu — c'est lui qui dit ce que la retouche a fait au jeu.

`balance.ts` n'est jamais autorité contre la spec : le test qui les sépare est là pour faire du désaccord une erreur rouge.
