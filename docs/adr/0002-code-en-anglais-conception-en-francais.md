# Le code est en anglais, la conception reste en français

Le cahier, le glossaire, les tickets, les commits et le texte affiché dans le jeu sont en **français** ; les dossiers, fichiers, identifiants, types et commentaires du code sont en **anglais**. Cette ADR existe parce qu'un lecteur qui ouvre `src/game/zombies.ts` et lit `bruiser` doit pouvoir remonter à *Costaud* sans deviner : la traduction est fixée ici, une fois, et un terme du glossaire reçoit **un mot et un seul**.

## Table de correspondance

| Domaine | Code | | Domaine | Code |
|---|---|---|---|---|
| Partie | `Game` | | Épée | `sword` |
| Vague | `wave` | | Fauchée | `sweep` |
| Assaut | `assault` | | Étourdissement | `stagger` |
| Préparation | `prep` | | Coup d'épée | `SWORD_HIT` |
| Rallonge | `overtime` | | Coup de Traînard | `SHAMBLER_HIT` |
| Sas | `airlock` | | Canon | `cannon` |
| Instantané | `snapshot` | | Boulet | `cannonball` |
| Ville | `city` | | Jet de feu | `flame` |
| Place | `square` | | Bombe de feu | `firebomb` |
| Rue | `street` | | Brassée | `armful` |
| Front bâti | `frontage` | | Soute | `magazine` |
| Portique | `gateway` | | Tapis roulant | `conveyor` |
| Mairie | `townHall` | | Halo | `halo` |
| Base | `base` | | Ravitaillement | `resupply` |
| Échelle | `ladder` | | Renfort | `reinforcement` |
| Extérieur | `outskirts` | | Heure orange | `orangeHour` |
| Traînard | `shambler` | | Brume | `haze` |
| Sprinteur | `sprinter` | | Éclat | `shard` |
| Costaud | `bruiser` | | Mire | `mark` |
| Colosse | `colossus` | | Cerne | `rim` |
| Rail | `rail` | | Losange | `diamond` |
| Avancement | `progress` | | Tuile | `tile` |
| Paquet | `pack` | | Pièce | `coin` |
| Cadence | `CADENCE` | | Prime de bravoure | `braveryBonus` |
| Colonne | `column` | | Prime de fin d'assaut | `assaultBonus` |
| Fuite | `breach` | | Escorte | `escort` |
| Course | `RUN_SPEED` | | Écroulement | `collapse` |
| Contact | `contact` | | Bandeau | `hud` |
| Saut | `jump` | | Bourse | `purse` |
| Pastille | `pip` | | Flèche | `arrow` |
| Vignette | `badge` | | Porte | `door` |
| Liseré | `reach` | | Tache | `blot` |
| Manche | `stick` | | Mur | `wall` |
| Toit | `roof` | | Corniche | `cornice` |
| Planche | `atlas` | | | |

**La règle qui gouverne cette table** : en anglais, un terme du glossaire reçoit un mot et un seul, qui ne soit ni déjà pris par un autre terme du glossaire, ni pris par l'API Three.js. C'est le flou que les listes `_Éviter_` de `CONTEXT.md` combattent, pas la racine des mots — `sweep`, `breach` et `magazine` sont retenus bien que « balayage », « percée » et « chargeur » soient bannis en français, parce qu'aucun n'a de concurrent en anglais.

## Mots interdits dans le code

Les `_Éviter_` du glossaire ne sont **pas** traduites : elles gouvernent le français. Le code a sa propre liste, construite pour les mots qu'un agent écrirait spontanément et que le glossaire français n'avait aucune raison d'anticiper.

| Ne jamais écrire | Écrire | Pourquoi |
|---|---|---|
| `enemy`, `monster`, `mob` | `zombie` | un seul mot pour l'assaillant |
| `tower`, `turret`, `defense` | `cannon` | « tower defense » est le genre, pas l'objet |
| `boss`, `tank` | `colossus`, `bruiser` | le défaut de sens se transporte de l'interdit français |
| `score`, `points` | `coins` | ce jeu n'a pas de score, il a des pièces |
| `record`, `highScore`, `best`, `bestWave` | *rien* | **rien ne survit à une partie** ([#42](https://github.com/ben-barbier/apocalypse-zombie/issues/42)) — pas même un octet |
| `damage` seul | `swordHits`, `shamblerHits`, `contacts` | **trois** unités de dégâts ([#7](https://github.com/ben-barbier/apocalypse-zombie/issues/7), [#22](https://github.com/ben-barbier/apocalypse-zombie/issues/22)) — un `damage: number` les confond |
| `health`, `life` | `hp` | un seul nom pour les PV du joueur, de la mairie et d'un canon au sol |
| `ammo` | `magazine` (contenant), `firebomb` (contenu) | |
| `particle`, `sprite` | `shard` | |
| `fog` | `haze` | `scene.fog` appartient à Three.js |
| `pause`, `menu`, `title` | `airlock` | il n'existe qu'un écran hors-jeu |
| `band` | `hud` (interface), `cornice` (bâtiment) | « bandeau » a deux sens en français, un mot chacun en code |
| `plaza`, `outside`, `depot` | `square`, `outskirts`, `base` | traductions naturelles, et fausses ici — la table seule fait foi |
| `spritesheet`, `texture` seul | `atlas` | il n'y a qu'une planche, et `tile` est ce qu'elle contient |
| `round`, `level`, `stage` | `wave` | |
| `endless`, `survival`, `infinite` | `overtime` | la Rallonge prolonge la partie, elle n'ouvre pas un second mode |
| `update`, `tick` | `step` | un seul nom pour le pas de simulation |
| `entity`, `actor`, `unit`, `gameObject` | *rien* | pas d'abstraction générique : des zombies, un joueur, des canons, des projectiles |
| `spawnRate` | `CADENCE` | la cadence ne varie jamais ; le verbe `spawn` reste permis |
| `checkpoint`, `save` | `snapshot` | |
| `death`, `die`, `respawn`, `revive` | `collapse` | le joueur ne meurt pas : à zéro il s'écroule sur place |
| `minimap`, `radar` | *rien* | ce jeu n'a **pas de carte** ([#15](https://github.com/ben-barbier/apocalypse-zombie/issues/15)) : les flèches de rue sont la seule vue du hors-champ |
| `shop`, `buyMenu`, `inventory` | *rien* | il n'y a pas de menu de construction : on achète là où l'on se tient |
| `hpBar`, `healthBar` | `hud` | la barre de la mairie et les pastilles du joueur ne partagent aucun composant |
| `joystick`, `dpad` | `stick` | |
| `prop`, `decoration`, `clutter` | *rien* | la ville ne porte **aucun** objet de décor ([#29](https://github.com/ben-barbier/apocalypse-zombie/issues/29)) : seul le canon se pose |
| `shadow`, `contactShadow` | `blot` | aucune ombre portée n'existe ; la tache n'en est pas une, et `castShadow` appartient à Three.js |
| `tooltip`, `banner`, `popup` | *rien* | rien ne surgit jamais par-dessus le jeu, le Sas excepté |

**`state` contre `snapshot`** : `state` est l'état vivant en mémoire (`game/state.ts`, le type `Game`) ; `snapshot` est ce qui part dans `localStorage`. Le glossaire bannit « état » comme synonyme d'*Instantané* pour cette raison exacte ; en anglais les deux mots coexistent tant que la frontière est écrite.

Cette liste est portée par le **test de garde** de [ADR-0001](./0001-logique-de-jeu-sans-moteur-3d.md) : le flottement de vocabulaire est une erreur de test, pas une affaire de discipline.
