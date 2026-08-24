# Le code est en anglais, la conception reste en français

Le cahier, le glossaire, les tickets, les commits et le texte affiché dans le jeu sont en **français** ; les dossiers, fichiers, identifiants, types et commentaires du code sont en **anglais**. Cette ADR existe parce qu'un lecteur qui ouvre `src/game/zombies.ts` et lit `bruiser` doit pouvoir remonter à *Costaud* sans deviner : la traduction est fixée ici, une fois, et un terme du glossaire reçoit **un mot et un seul**.

## Table de correspondance

| Domaine | Code | | Domaine | Code |
|---|---|---|---|---|
| Partie | `Game` | | Épée | `sword` |
| Vague | `wave` | | Fauchée | `sweep` |
| Assaut | `assault` | | Étourdissement | `stagger` |
| Préparation | `prep` | | Coup d'épée | `SWORD_HIT` |
| Sas | `airlock` | | Coup de Traînard | `SHAMBLER_HIT` |
| Instantané | `snapshot` | | Canon | `cannon` |
| Ville | `city` | | Boulet | `cannonball` |
| Place | `square` | | Jet de feu | `flame` |
| Rue | `street` | | Bombe de feu | `firebomb` |
| Front bâti | `frontage` | | Brassée | `armful` |
| Portique | `gateway` | | Soute | `magazine` |
| Mairie | `townHall` | | Tapis roulant | `conveyor` |
| Base | `base` | | Halo | `halo` |
| Échelle | `ladder` | | Ravitaillement | `resupply` |
| Extérieur | `outskirts` | | Renfort | `reinforcement` |
| Traînard | `shambler` | | Heure orange | `orangeHour` |
| Sprinteur | `sprinter` | | Brume | `haze` |
| Costaud | `bruiser` | | Éclat | `shard` |
| Colosse | `colossus` | | Mire | `mark` |
| Rail | `rail` | | Cerne | `rim` |
| Avancement | `progress` | | Losange | `diamond` |
| Paquet | `pack` | | Tuile | `tile` |
| Cadence | `CADENCE` | | Pièce | `coin` |
| Colonne | `column` | | Prime de bravoure | `braveryBonus` |
| Fuite | `breach` | | Prime de fin d'assaut | `assaultBonus` |
| Course | `RUN_SPEED` | | Escorte | `escort` |
| Contact | `contact` | | Écroulement | `collapse` |

**La règle qui gouverne cette table** : en anglais, un terme du glossaire reçoit un mot et un seul, qui ne soit ni déjà pris par un autre terme du glossaire, ni pris par l'API Three.js. C'est le flou que les listes `_Éviter_` de `CONTEXT.md` combattent, pas la racine des mots — `sweep`, `breach` et `magazine` sont retenus bien que « balayage », « percée » et « chargeur » soient bannis en français, parce qu'aucun n'a de concurrent en anglais.

## Mots interdits dans le code

Les `_Éviter_` du glossaire ne sont **pas** traduites : elles gouvernent le français. Le code a sa propre liste, construite pour les mots qu'un agent écrirait spontanément et que le glossaire français n'avait aucune raison d'anticiper.

| Ne jamais écrire | Écrire | Pourquoi |
|---|---|---|
| `enemy`, `monster`, `mob` | `zombie` | un seul mot pour l'assaillant |
| `tower`, `turret`, `defense` | `cannon` | « tower defense » est le genre, pas l'objet |
| `boss`, `tank` | `colossus`, `bruiser` | le défaut de sens se transporte de l'interdit français |
| `score`, `points` | `coins` | ce jeu n'a pas de score, il a des pièces |
| `damage` seul | `swordHits`, `shamblerHits`, `contacts` | **trois** unités de dégâts ([#7](https://github.com/ben-barbier/apocalypse-zombie/issues/7), [#22](https://github.com/ben-barbier/apocalypse-zombie/issues/22)) — un `damage: number` les confond |
| `health`, `life` | `hp` | un seul nom pour les PV du joueur, de la mairie et d'un canon au sol |
| `ammo` | `magazine` (contenant), `firebomb` (contenu) | |
| `particle`, `sprite` | `shard` | |
| `fog` | `haze` | `scene.fog` appartient à Three.js |
| `pause`, `menu`, `title` | `airlock` | il n'existe qu'un écran hors-jeu |
| `round`, `level`, `stage` | `wave` | |
| `update`, `tick` | `step` | un seul nom pour le pas de simulation |
| `entity`, `actor`, `unit`, `gameObject` | *rien* | pas d'abstraction générique : des zombies, un joueur, des canons, des projectiles |
| `spawnRate` | `CADENCE` | la cadence ne varie jamais ; le verbe `spawn` reste permis |
| `checkpoint`, `save` | `snapshot` | |
| `death`, `die`, `respawn`, `revive` | `collapse` | le joueur ne meurt pas : à zéro il s'écroule sur place |

**`state` contre `snapshot`** : `state` est l'état vivant en mémoire (`game/state.ts`, le type `Game`) ; `snapshot` est ce qui part dans `localStorage`. Le glossaire bannit « état » comme synonyme d'*Instantané* pour cette raison exacte ; en anglais les deux mots coexistent tant que la frontière est écrite.

Cette liste est portée par le **test de garde** de [ADR-0001](./0001-logique-de-jeu-sans-moteur-3d.md) : le flottement de vocabulaire est une erreur de test, pas une affaire de discipline.
