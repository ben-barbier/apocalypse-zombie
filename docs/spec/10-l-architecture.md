# L'architecture

Ce chapitre décide la stack, la frontière entre la logique de jeu et le rendu, la forme de l'état, la boucle, le hasard, les tests et la garde qui rend tout cela exécutable ; les motifs longs sont dans [ADR-0001](../adr/0001-logique-de-jeu-sans-moteur-3d.md) et [ADR-0002](../adr/0002-code-en-anglais-conception-en-francais.md), qui sont cités et jamais recopiés.

## Les règles

**La frontière**

1. `src/game/` n'importe **rien** : ni `three`, ni `Math.random`, ni `Date.now`, ni `performance.now`, ni `window`, ni `document`, ni aucune interface de stockage.
2. `src/render/` n'importe de `src/game/` que des **types**, jamais une fonction, et l'importe avec `import type`.
3. `src/app/` importe les deux ; `src/audio/` ne connaît que les types et le tampon d'événements.
4. `src/game/` n'importe jamais `src/render/`, `src/app/` ni `src/audio/`, et `src/render/` n'importe jamais `src/app/`.
5. `bench/` obéit à la même interdiction que `src/game/`, plus le seul droit d'en importer les fonctions.
6. Seules les fonctions de `src/game/` écrivent dans l'état ; tout le reste le reçoit en `Readonly<Game>`.
7. `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie` et `caches` n'apparaissent que dans `src/app/storage.ts`.
8. Un test de garde lit les fichiers et échoue sur toute violation de 10-1 à 10-7, sur les trois règles de stockage 10-7, 10-32 et 10-33, et sur tout mot interdit d'ADR-0002.
9. La garde des mots lit ce que le code **nomme**, jamais ce qu'il **appelle** : elle ignore les accès à un membre après un point et les identifiants importés de `three`, et vérifie tout le reste.

**L'état**

10. Il existe un seul objet `Game`, alloué au chargement, jamais remplacé, jamais copié.
11. `Game` est en structures de tableaux — `zombies.x: Float32Array(60)`, `zombies.type: Uint8Array(60)`, jamais un tableau d'objets — et se mute en place.
12. `Game` a trois branches et trois seulement : `balance` (les constantes, gelées, non sérialisées), `snapshot` (la frontière de vague sérialisable), `assault` (les pools volatils, le joueur et les compteurs).
13. Tous les pools ont une taille fixe allouée au chargement et pilotée par un compteur.
14. La boucle n'alloue rien : ni objet, ni tableau, ni fermeture, ni chaîne.
15. `game/balance.ts` est **injecté** — `createGame(BALANCE)` le range dans `game.balance` — et aucun module de logique ne l'importe.
16. Le barème s'écrit en unités du domaine — blocs, secondes, coups d'épée, pièces — et jamais en unités par pas ; la conversion appartient à la simulation.

**Le tampon d'événements**

17. `step()` n'annonce ce qui vient de se passer que par un tampon d'événements pré-alloué de 256 entrées, lui-même en structures de tableaux.
18. Le tampon se vide au début de chaque **image**, se remplit par les pas de cette image, et se lit une fois avant le dessin.
19. Le rendu, l'audio et les tests lisent ce même tampon ; **le rendu ne compare jamais deux états** pour deviner qu'un zombie est mort.
20. Le type d'un événement est une constante d'une énumération unique déclarée dans `game/state.ts` ; un chapitre qui ajoute un fait du jeu y ajoute son type, la taille du tampon ne bouge pas.

**La boucle**

21. Le pas de simulation est **fixe** : 16,666 ms, soit 60 Hz, avec accumulateur — il ne dépend jamais de la fréquence d'affichage.
22. L'horloge est le `timestamp` de `requestAnimationFrame`, et lui seul.
23. L'écart entre deux images est borné à 100 ms avant d'alimenter l'accumulateur, soit six pas rattrapés au maximum.
24. Le rendu interpole entre les deux derniers pas, par les tampons `xPrev` / `zPrev` / `angPrev` des pools.
25. L'ordre du pas est fixe et écrit dans `step.ts` : entrées → joueur → épée → zombies → canons → projectiles → économie → vagues → mairie.
26. Le figeage de 60 ms sur coup fatal cesse d'alimenter l'accumulateur et n'est jamais rattrapé.

**Le hasard**

27. Il existe un seul générateur, un mulberry32, dont l'état vit dans `Game` et part dans l'Instantané.
28. Le banc tire son hasard d'un **second** mulberry32, semé à part, pour qu'une retouche de pilote ne décale jamais le tirage du monde.
29. Une partie est rejouable à partir de (graine + suite des entrées), et un test compare les pools octet à octet.

**Les entrées**

30. Il existe un seul type `InputState` — `dx` et `dz` de norme ≤ 1, `strike` maintenu, `action`, `jump` et `airlock` en fronts montants — produit indifféremment par `gamepad.ts`, `touch.ts`, `keyboard.ts` ou le pilote du banc.
31. L'entrée est échantillonnée **au pas**, jamais événementielle : les fronts montants sont retenus par un drapeau « appuyé depuis la dernière lecture », remis à zéro à la lecture.

**Le stockage**

32. L'Instantané est du JSON compact écrit **synchronement** dans `localStorage` sous la clé littérale `apocalypse-zombie:snapshot`, sa version dans le JSON et jamais dans la clé.
33. `src/app/storage.ts` déclare une seule constante de clé et n'expose que `readSnapshot()`, `writeSnapshot()` et `clearSnapshot()`.
34. Ces trois fonctions ne lèvent jamais : stockage indisponible, le jeu joue sans filet et en silence.
35. Un instantané illisible ou d'une autre version est effacé sans bruit — aucune migration, jamais.
36. Rien ne s'écrit dans un gestionnaire d'interruption, et il n'existe aucun gestionnaire `unload`.

**Le GPU**

37. L'état de partie est une donnée pure et la scène 3D en est une projection reconstructible : aucune donnée de jeu ne vit uniquement sur le GPU.
38. `render/context.ts` pose `webglcontextlost` avec `preventDefault()` et `webglcontextrestored`, ouvre le Sas pendant la reconstruction, repeuple la scène depuis l'état, et recharge la page si rien ne revient sous 3 s.
39. `render/quality.ts` ne joue que sur la résolution et le pool d'éclats, et ne touche **jamais** la simulation.
40. Son capteur est la médiane glissante de l'écart entre deux `requestAnimationFrame` sur 2 s : on descend d'un palier au-delà de 20 ms pendant 2 s, on remonte en dessous de 17,5 ms pendant 10 s.

**Les tests**

41. Les tests sont co-localisés — `sword.test.ts` à côté de `sword.ts` — et tournent en environnement `node`.
42. Un test de `src/game/` écrit ses chiffres **en dur, d'après la spec**, et cite l'adresse de la règle en commentaire (`// spec 03-4`).
43. `waves.ts` porte une assertion testée : aucun total de vague, Rallonge comprise, ne dépasse 60.
44. Le banc joue des parties entières sans rendu, et un lancer de référence est gelé dans `bench/reference.json`.
45. Il n'existe aucun test de rendu, aucune capture d'écran, aucun navigateur automatisé.
46. Le projet a cinq scripts et cinq seulement : `dev`, `build`, `test`, `bench`, `check`.
47. `npm run check` enchaîne le compilateur et la garde d'architecture, et c'est lui qui doit passer avant toute revue.

## Les chiffres

### La stack

| Paquet | Version | Rôle |
|---|---|---|
| `typescript` | `^7.0.2` | compilateur, `strict` |
| `vite` | `^8.2.1` | serveur de développement et build |
| `vitest` | `^4.1.11` | tests, environnement `node` |
| `three` | `0.185.1` | **épinglé, sans accent circonflexe** — seule dépendance d'exécution |
| `@types/three` | `^0.185.4` | `three` ne publie aucun champ `types` : ce paquet n'est pas optionnel |
| `@types/node` | `^26` | la garde lit des fichiers ; sans lui elle ne compile pas |

npm, **lockfile commité**. `three` est la **seule** dépendance d'exécution ; les quatre autres sont des dépendances de développement, et deux d'entre elles ne portent que des types. Un seul fil, aucun Web Worker. Le build sort un `index.html`, un bundle ESM et la planche PNG, servis en statique.

### La boucle

| Grandeur | Valeur |
|---|---:|
| Pas de simulation | 16,666 ms (60 Hz) |
| Borne de l'écart entre images | 100 ms |
| Pas rattrapés au maximum par image | 6 |
| Figeage sur coup fatal, jamais rattrapé | 60 ms |
| Entrées du tampon d'événements | 256 |
| Pas dans une partie de 15,2 min | ≈ 55 000 |
| Durée d'une partie au banc, sans rendu | ≈ 1 s |

### Les pools, alloués au chargement

| Pool | Taille |
|---|---:|
| Zombies | 60 |
| Projectiles | 96 |
| Éclats | 600 |
| Événements | 256 |

### Le budget de rendu

| Ressource | Budget | Prévision mesurée |
|---|---:|---:|
| Draw calls par image | ≤ 80 | 22 à 33 |
| `setPixelRatio` | 1 | 1 |
| Contextes WebGL | exactement 1 | 1 |
| Ombres portées | 0 | 0 |
| Lumières ponctuelles | 0 | 0 |
| Allocations dans la boucle | 0 | 0 |

### L'échelle de qualité

| Palier | Action |
|---|---|
| 0 | régime nominal : `pixelRatio` 1, 600 éclats |
| 1 | `pixelRatio` → 0,85 |
| 2 | éclats 600 → 200 |
| 3 | `pixelRatio` → 0,75 |
| 4 | verrouillage à 30 images/s |

### L'arborescence

```
index.html          l'entrée du build, à la racine — Vite l'exige là
package.json        cinq scripts, et le lockfile à côté
tsconfig.json       strict, verbatimModuleSyntax
vite.config.ts      le build et Vitest, un seul fichier
public/             atlas.png
src/
  architecture.test.ts    la garde — hors des dossiers qu'elle lit, car elle
                          cite tous les mots interdits
  game/             balance · state · random · step · waves · zombies · player ·
                    sword · cannons · projectiles · economy · townhall · snapshot
  render/           scene · city · characters · cannons · effects ·
                    camera · hud · atlas · context · quality
  app/              loop · input · gamepad · touch · keyboard · airlock · storage
  audio/
bench/              le banc et son reference.json
docs/               spec/ · adr/ · research/
```

## Les interdits

- **Jamais `Math.random()` dans `src/game/` ni dans `bench/`** — parce qu'une partie doit se rejouer depuis (graine + suite des entrées), et que le banc en dépend tout entier.
- **Jamais d'horloge dans `src/game/` ni dans `bench/`** — le banc compte des pas de 1/60 de seconde, il n'en lit aucun.
- **Jamais d'immuabilité, jamais une copie de l'état** — la règle zéro allocation dans la boucle n'est pas négociable.
- **Jamais un `damage: number`** — il y a trois unités de dégâts, `swordHits`, `shamblerHits` et `contacts`, et un seul nombre les confondrait.
- **Jamais un Web Worker** — il imposerait de partager l'état à chaque image et une image de retard sur la manette, pour un problème que ce jeu n'a pas.
- **Jamais un second contexte WebGL.**
- **Jamais une migration d'Instantané** — une partie dure un quart d'heure et rien ne lui survit ; un format qu'on migre est un format qu'on doit tenir.
- **Jamais un gestionnaire `unload`, jamais une écriture dans un gestionnaire d'interruption** — le disque est déjà à jour quand le navigateur ne promet plus rien.
- **Jamais IndexedDB** — asynchrone, pour 1 Kio, et `pagehide` ne garantit aucun `await`.
- **Jamais une dépendance d'exécution de plus.**
- **Jamais un palier de qualité qui touche la simulation, et jamais le palier « 60 → 40 zombies »** — la difficulté ne peut pas dépendre de la température de l'iPad, et le banc ne mesurerait plus rien.
- **Jamais un module `render/props.ts`** — la ville ne porte aucun objet de décor, et `prop` est un mot interdit.
- **Jamais une abstraction générique** — pas d'`entity`, pas de `gameObject` : des zombies, un joueur, des canons, des projectiles.
- **Jamais un test de rendu, une capture d'écran ou un navigateur automatisé** — le rendu se juge à l'œil, et le seul banc d'essai qui compte pour lui a 8 ans.
- **Jamais un sixième script npm.**

## Pourquoi

**Pourquoi la frontière est si stricte.** Three.js tourne dans Node — les mathématiques et le graphe de scène, seul `WebGLRenderer` exige un navigateur —, mais ce support n'est documenté nulle part et n'est couvert par aucun test chez eux. Plutôt que de parier, on l'écarte du chemin du cœur du jeu : la logique n'importe rien, donc la question ne se pose plus. Effet de bord vérifié en séance : changer de moteur 3D coûterait environ mille lignes de rendu et **aucune règle de jeu**.

**Pourquoi la garde plutôt que la discipline.** C'est un agent qui écrit ce code, et un agent respecte ce qui échoue en rouge. Une règle d'architecture écrite dans un document est une intention ; la même règle lue par un test est une contrainte. C'est aussi ce qui rend tenable la liste des mots interdits : le flottement de vocabulaire devient une erreur de test, pas une affaire de vigilance.

**Pourquoi la garde ignore les accès à un membre.** ADR-0002 interdit `fog`, `depth` et `texture` **parce que** Three.js les emploie déjà — donc le rendu, qui appelle Three.js, les rencontrera forcément. Une garde qui les refuserait partout rendrait la couche de rendu inécrivable et se ferait désactiver au premier module. Elle vérifie donc les noms que nous choisissons, et laisse passer ceux que la bibliothèque nous impose.

**Pourquoi le tampon d'événements.** Sans lui, le rendu et l'audio devinent : ils gardent une copie de l'état précédent, la comparent, et concluent qu'un zombie est mort parce qu'il a disparu. Cette copie est une allocation par image, la comparaison est fausse dès qu'un pool réutilise un emplacement, et les tests n'ont rien à asserter. Le tampon renverse tout cela : la simulation **dit** ce qu'elle vient de faire, une fois, et les trois lecteurs lisent la même phrase.

**Pourquoi le pas est fixe.** Un pas variable rend une partie irreproductible, donc le banc impossible, donc l'équilibrage réduit à une moyenne floue. La phrase se lit mal quand on l'abrège — « pas de temps fixe » a déjà été compris comme une négation : le pas **est** fixe, à 16,666 ms, et l'accumulateur est ce qui absorbe une image lente.

**Pourquoi l'interpolation malgré le pas fixe.** À 144 Hz, un rendu qui affiche le dernier pas simulé saccade visiblement : deux images sur trois montrent la même position. Les tampons `xPrev` sont le prix à payer pour que le pas fixe ne se voie pas.

**Pourquoi le barème est injecté et en unités du domaine.** Injecté, parce que simuler cent variantes ne doit toucher aucune ligne de logique. En blocs et en secondes, parce qu'un chiffre en unités par pas ne se relit pas contre la spec, et que la spec est ce qui arbitre les désaccords — `balance.ts` n'est jamais autorité contre elle.

**Pourquoi TypeScript en `strict`.** Le compilateur est le seul retour automatique qui attrape `zombie.pv` écrit pour `zombie.hp` sans lancer le jeu. Pour un lecteur humain c'est un confort ; pour l'agent qui écrit ce code, c'est le garde-fou principal.

**Pourquoi la qualité de rendu ne touche jamais la simulation.** Un palier qui baisserait le plafond de zombies ferait dépendre la difficulté de la température de l'appareil, casserait le déterminisme, et invaliderait tout ce que le banc mesure. Un plafond de population est une règle de jeu ; la résolution est un réglage de rendu ; les deux ne se rencontrent pas.

**Pourquoi le seuil de remontée est à 17,5 ms.** Une image parfaite à 60 Hz fait **16,666 ms** (10-21). Un seuil placé sous cette valeur rendrait la remontée inatteignable : sur un écran à 60 Hz, la médiane ne descend jamais sous le pas nominal, donc l'échelle ne saurait que descendre, et un appareil qui a bronché une fois resterait au palier bas pour le reste de la partie. Le seuil est donc **au-dessus** du pas, et assez près de lui pour qu'une image régulièrement en retard ne se lise pas comme un retour au calme. L'écart avec les **20 ms** de la descente est l'**hystérésis** : entre les deux, la médiane ne fait bouger personne, ce qui empêche l'échelle d'osciller d'un palier à l'autre autour d'un seuil unique.

**Pourquoi le stockage tient dans un fichier et trois fonctions.** Un Safari réglé pour bloquer tous les cookies fait lever une exception à la **lecture même** de `window.localStorage` : le cas doit être traité une fois, à un seul endroit, et jamais redécouvert ailleurs. D'où l'enfermement, d'où les trois fonctions qui ne lèvent jamais, et d'où l'absence de sonde au démarrage — elle exigerait une seconde clé.

**Pourquoi `index.html` est à la racine et non dans `public/`.** Vite prend le HTML de la racine du projet comme entrée du build et recopie `public/` verbatim à côté du bundle : un `public/index.html` ne serait jamais transformé, et écraserait le vrai. La planche PNG, elle, est bien dans `public/`.

## Ce qui reste à vérifier sur l'appareil

**La seule section de la spec qui porte des étiquettes** : elle énonce des inconnues, pas des décisions. La mesure sur l'iPad réel a été repoussée après la spec ; le budget reste utilisable tel quel, parce que la scène la plus chargée que le jeu produira consomme 22 à 33 draw calls sur 80. Trois inconnues partent avec ce report, et le protocole pour chacune est dans [`docs/research/perf-voxel-ipad.md`](../research/perf-voxel-ipad.md) §13.

| Inconnue | Étiquette | Ce qu'on ferait si elle tombait mal |
|---|---|---|
| La charge de fragments à `setPixelRatio(1)` en plein écran | `[à mesurer]` | les paliers 1 et 3 de l'échelle de qualité, déjà écrits |
| La tenue thermique sur cinq à dix minutes de jeu | `[à mesurer]` | le palier 4, verrouillage à 30 images/s |
| La fréquence des pertes de contexte WebGL sur A12–A14 | `[à mesurer]` | rien de plus : `render/context.ts` traite déjà le cas |

## D'où ça vient

[#13](https://github.com/ben-barbier/apocalypse-zombie/issues/13) pour l'ensemble, [ADR-0001](../adr/0001-logique-de-jeu-sans-moteur-3d.md) pour la frontière et [ADR-0002](../adr/0002-code-en-anglais-conception-en-francais.md) pour la langue du code et les mots interdits. [#4](https://github.com/ben-barbier/apocalypse-zombie/issues/4) pour les pools et le budget de rendu, [#17](https://github.com/ben-barbier/apocalypse-zombie/issues/17) pour la borne de 100 ms et l'Instantané, [#42](https://github.com/ben-barbier/apocalypse-zombie/issues/42) pour la clé et les trois règles de stockage, [#35](https://github.com/ben-barbier/apocalypse-zombie/issues/35) pour l'assertion de `waves.ts`, [#41](https://github.com/ben-barbier/apocalypse-zombie/issues/41) pour le second générateur et `reference.json`, [#29](https://github.com/ben-barbier/apocalypse-zombie/issues/29) pour l'absence de décor, [#15](https://github.com/ben-barbier/apocalypse-zombie/issues/15) pour le saut dans `InputState`, [#19](https://github.com/ben-barbier/apocalypse-zombie/issues/19) pour la mesure repoussée.
