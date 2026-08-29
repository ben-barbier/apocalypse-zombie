# La spec d'*Apocalypse Zombie*

Ce dossier est la **spec** du jeu : le gameplay entièrement chiffré et l'architecture technique, assez complet pour qu'un agent code la v1 **sans reposer une seule question de conception**.

Elle est la **source de vérité**. Les [quarante-cinq tickets fermés](https://github.com/ben-barbier/apocalypse-zombie/issues/1) qui l'ont produite sont l'archive du raisonnement : on y va pour comprendre un **motif**, jamais pour connaître une **valeur** — beaucoup ont été rectifiés, et lus seuls ils mentent.

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
| 6 | [`06-l-argent.md`](06-l-argent.md) | les gains, la prime de bravoure, les prix, la courbe, le Renfort de la mairie | [#11](https://github.com/ben-barbier/apocalypse-zombie/issues/11), [#16](https://github.com/ben-barbier/apocalypse-zombie/issues/16) |
| 7 | [`07-le-regard.md`](07-le-regard.md) | l'heure orange, les effets, les corps à quatorze boîtes, la planche de textures | [#12](https://github.com/ben-barbier/apocalypse-zombie/issues/12), [#23](https://github.com/ben-barbier/apocalypse-zombie/issues/23), [#29](https://github.com/ben-barbier/apocalypse-zombie/issues/29), [#38](https://github.com/ben-barbier/apocalypse-zombie/issues/38) |
| 8 | [`08-le-bandeau-et-le-sas.md`](08-le-bandeau-et-le-sas.md) | les cinq affichages, le refus de la carte, le Sas, l'interruption, l'Instantané, le stockage | [#15](https://github.com/ben-barbier/apocalypse-zombie/issues/15), [#17](https://github.com/ben-barbier/apocalypse-zombie/issues/17), [#42](https://github.com/ben-barbier/apocalypse-zombie/issues/42) |
| 9 | [`09-les-bruitages.md`](09-les-bruitages.md) | les dix-sept bruitages, le pouls, et leurs paramètres de synthèse | [#30](https://github.com/ben-barbier/apocalypse-zombie/issues/30), [#22](https://github.com/ben-barbier/apocalypse-zombie/issues/22) |
| 10 | [`10-l-architecture.md`](10-l-architecture.md) | la stack, les modules, l'objet `Game`, le tampon d'événements, le pas, les tests, la garde | [#13](https://github.com/ben-barbier/apocalypse-zombie/issues/13), [ADR-0001](../adr/0001-logique-de-jeu-sans-moteur-3d.md), [ADR-0002](../adr/0002-code-en-anglais-conception-en-francais.md) |
| 11 | [`11-le-banc.md`](11-le-banc.md) | les trois profils, les huit indicateurs, les seuils, les balayages, `reference.json` | [#41](https://github.com/ben-barbier/apocalypse-zombie/issues/41) |

## Les interdits

**La page qu'on relit avant chaque session de code.** Elle récolte les « jamais » des onze chapitres, une ligne chacun, avec le chapitre où son **motif** est écrit — le motif ne se recopie pas ici, il se lit là-bas. Un interdit énoncé par plusieurs chapitres n'apparaît qu'une fois, chez celui qui le démontre.

Ces refus sont exactement ce qu'un agent rajoute spontanément : un rouge d'alerte, une minicarte, un menu de construction, un cinquième type de zombie, un objet de décor, une ombre portée. Rien de tout cela n'est un oubli.

Un interdit se lève **par une PR sur le chapitre qui le porte**, jamais en passant.

### Le contrat avec l'enfant

| Jamais… | Chapitre |
|---|---|
| un jeu infini sans victoire | [1](01-la-partie.md) |
| une difficulté qui monte par les statistiques — points de vie, dégâts, vitesse | [1](01-la-partie.md) |
| un chrono pendant l'assaut | [1](01-la-partie.md) |
| un bouton « prêt », une préparation qu'on allonge ou qu'on abrège | [1](01-la-partie.md) |
| une préparation sous 30 secondes, Rallonge comprise | [1](01-la-partie.md) |
| une régénération de la mairie | [1](01-la-partie.md) |
| un tutoriel | [1](01-la-partie.md) |
| un texte d'échec, une musique triste | [1](01-la-partie.md) |
| un score — compteur de zombies écrasés, total de pièces en fin de partie | [1](01-la-partie.md) |
| rien qui survive à une partie : record, médaille, réglage, progression | [1](01-la-partie.md) |
| un asset Minecraft | [1](01-la-partie.md) |
| un texte à lire pour jouer — tutoriel, carton « tourne ta tablette », écran d'erreur | [8](08-le-bandeau-et-le-sas.md) |
| un second octet écrit sur l'appareil | [8](08-le-bandeau-et-le-sas.md) |
| une reprise qui reparte de zéro après une interruption | [8](08-le-bandeau-et-le-sas.md) |

### Les listes fermées

| Jamais… | Chapitre |
|---|---|
| une seconde ville, une ville engendrée par graine | [2](02-la-ville.md) |
| une hauteur de bâtiment autre que 4, 6 ou 8 | [2](02-la-ville.md) |
| un cinquième type de zombie | [3](03-les-zombies.md) |
| deux Colosses à la fois | [3](03-les-zombies.md) |
| une seconde construction | [5](05-les-canons.md) |
| un quatrième niveau de canon, un embranchement au niveau 2 | [5](05-les-canons.md) |
| un ralentisseur achetable — goudron, glu, barricade | [5](05-les-canons.md) |
| un objet neuf pour rattraper l'équilibrage | [5](05-les-canons.md) |
| un sixième poste de dépense | [6](06-l-argent.md) |
| un quatrième palier de Renfort | [6](06-l-argent.md) |
| une quatorzième tuile d'atlas | [7](07-le-regard.md) |
| un sixième affichage du bandeau | [8](08-le-bandeau-et-le-sas.md) |
| un second écran hors-jeu | [8](08-le-bandeau-et-le-sas.md) |
| un dix-huitième bruitage | [9](09-les-bruitages.md) |
| une nappe, un drone, une seconde musique | [9](09-les-bruitages.md) |
| une deuxième alarme | [9](09-les-bruitages.md) |
| un second `AudioContext`, un contexte par bruitage | [9](09-les-bruitages.md) |
| un second contexte WebGL | [10](10-l-architecture.md) |
| une dépendance d'exécution de plus | [10](10-l-architecture.md) |
| un sixième script npm | [10](10-l-architecture.md) |
| un quatrième profil de banc | [11](11-le-banc.md) |

### Les commandes et la caméra

| Jamais… | Chapitre |
|---|---|
| une souris, une visée libre, un clavier équilibré | [1](01-la-partie.md) |
| une seconde allure — marche, sprint, ralentissement en charge | [4](04-le-joueur.md) |
| un saut qui monte du sol à un toit | [4](04-le-joueur.md) |
| un dégât de chute | [4](04-le-joueur.md) |
| une commande de caméra, sur aucune plateforme | [4](04-le-joueur.md) |
| une caméra asservie à l'auto-ciblage | [4](04-le-joueur.md) |
| une cinématique, un cadrage repris au joueur | [4](04-le-joueur.md) |
| une cible unique à l'épée | [4](04-le-joueur.md) |
| une priorité de cible « intelligente » | [4](04-le-joueur.md) |
| un tapis roulant qu'on trace, qu'on dirige ou qu'on détruit | [4](04-le-joueur.md) |
| un bouton polyvalent | [4](04-le-joueur.md) |
| une zone morte — un appui qui ne fait rien là où quelque chose est possible | [4](04-le-joueur.md) |
| le bouton `B` sur manette | [4](04-le-joueur.md) |
| une cible tactile près d'un bord, ou sous 44 px | [8](08-le-bandeau-et-le-sas.md) |

### La ville

| Jamais… | Chapitre |
|---|---|
| un raccourci d'une rue à l'autre | [2](02-la-ville.md) |
| un anneau, une brèche, une place carrée | [2](02-la-ville.md) |
| un bâtiment qui se traverse, s'abîme, ou se monte autrement que par son échelle | [2](02-la-ville.md) |
| une variante de façade, une façade reculée | [2](02-la-ville.md) |
| un objet de décor — lampadaire, caisse, banc, jardinière, cheminée | [2](02-la-ville.md) |
| un bord de rue franchissable au saut du pied au fond | [2](02-la-ville.md) |
| un portique au fond d'une rue | [2](02-la-ville.md) |
| un halo qui serve les trois rues | [2](02-la-ville.md) |
| un toit interdit à la construction | [2](02-la-ville.md) |

### Les zombies

| Jamais… | Chapitre |
|---|---|
| un calcul de chemin — A\*, navmesh, champ de flux | [3](03-les-zombies.md) |
| un zombie qui quitte son rail, un zombie qui poursuit le joueur | [3](03-les-zombies.md) |
| un avancement qui décroît, un recul qui fait reculer un zombie | [3](03-les-zombies.md) |
| un zombie que le canon bloque, une barricade | [3](03-les-zombies.md) |
| un zombie qui disparaît en atteignant la mairie | [3](03-les-zombies.md) |
| un cadavre, une trace au sol, du sang | [3](03-les-zombies.md) |
| un paquet mixte | [3](03-les-zombies.md) |
| une cadence autre que 6 secondes | [3](03-les-zombies.md) |
| une rue tirée au sort | [3](03-les-zombies.md) |
| un Colosse qui sprinte | [3](03-les-zombies.md) |
| une vitesse au-dessus de 4 blocs par seconde | [3](03-les-zombies.md) |
| un garde-fou de population à l'exécution | [3](03-les-zombies.md) |
| une vague engendrée par formule | [3](03-les-zombies.md) |

### Le joueur

| Jamais… | Chapitre |
|---|---|
| une épée qui s'améliore, s'achète ou se remplace | [4](04-le-joueur.md) |
| un achat qui porte sur le joueur — points de vie, vitesse, portée, armure | [4](04-le-joueur.md) |
| un tir ami, dans un sens comme dans l'autre | [4](04-le-joueur.md) |
| un dégât de contact qui varie selon le type | [4](04-le-joueur.md) |
| un soin autre que la régénération | [4](04-le-joueur.md) |
| une mort du joueur, un relèvement ailleurs qu'à l'endroit de la chute | [4](04-le-joueur.md) |
| une bombe qui tombe, une bombe au sol à ramasser | [4](04-le-joueur.md) |
| une reprise de bombes dans un canon | [4](04-le-joueur.md) |

### Les canons

| Jamais… | Chapitre |
|---|---|
| une zone d'effet sur le boulet | [5](05-les-canons.md) |
| un test de ligne de vue, un test de collision sur un projectile | [5](05-les-canons.md) |
| un canon qui rate | [5](05-les-canons.md) |
| un boulet qui vire en l'air | [5](05-les-canons.md) |
| un ciblage par type, une visée réglable | [5](05-les-canons.md) |
| un jet de feu qui s'éteint | [5](05-les-canons.md) |
| une flamme allumée sans zombie dedans | [5](05-les-canons.md) |
| une barre, un clignotement ou une couleur d'alerte sur un canon | [5](05-les-canons.md) |
| une réparation, payante ou gratuite | [5](05-les-canons.md) |
| un canon de toit qui s'abîme | [5](05-les-canons.md) |
| une revente, un déplacement, une destruction volontaire | [5](05-les-canons.md) |
| un plafond au nombre de canons | [5](05-les-canons.md) |

### L'argent

| Jamais… | Chapitre |
|---|---|
| un prix qui monte — avec la vague, avec le nombre de canons, en Rallonge | [6](06-l-argent.md) |
| une prime calculée sur autre chose que le coup fatal | [6](06-l-argent.md) |
| une pièce qui périme, une pièce perdue | [6](06-l-argent.md) |
| un plafond de bourse, des intérêts, une dépense forcée | [6](06-l-argent.md) |
| une remise | [6](06-l-argent.md) |
| un remboursement, un crédit | [6](06-l-argent.md) |
| un gain qui ne vienne pas d'un zombie | [6](06-l-argent.md) |
| une réparation payante de la mairie | [6](06-l-argent.md) |
| une armure, une réduction de dégâts | [6](06-l-argent.md) |
| un prix de Renfort proportionnel aux dégâts subis | [6](06-l-argent.md) |
| un Renfort qui attende la préparation | [6](06-l-argent.md) |
| un plancher de prix calculé sur la masse monétaire | [6](06-l-argent.md) |

### Le regard

| Jamais… | Chapitre |
|---|---|
| une ombre portée | [7](07-le-regard.md) |
| une lumière ponctuelle | [7](07-le-regard.md) |
| une variation d'heure, de ciel ou de météo | [7](07-le-regard.md) |
| un effet orange | [7](07-le-regard.md) |
| un rouge, nulle part — ni dans le monde, ni dans le bandeau | [7](07-le-regard.md) |
| un cerne ailleurs que sur ce qui se ramasse | [7](07-le-regard.md) |
| une transparence | [7](07-le-regard.md) |
| un sprite, un billboard, un système de particules | [7](07-le-regard.md) |
| une tuile sur un corps ou sur un canon | [7](07-le-regard.md) |
| une occlusion peinte dans la tuile | [7](07-le-regard.md) |
| un dégradé vertical sur une tuile horizontale | [7](07-le-regard.md) |
| une tuile de fissure | [7](07-le-regard.md) |
| une fenêtre froide | [7](07-le-regard.md) |
| une hauteur de toit lue à la teinte | [7](07-le-regard.md) |
| un `SkinnedMesh`, un fichier d'animation | [7](07-le-regard.md) |
| une planche dessinée à la main, un PNG retouché | [7](07-le-regard.md) |
| un fichier d'image importé | [7](07-le-regard.md) |
| une case d'atlas laissée vide en noir ou en transparent | [7](07-le-regard.md) |
| une marge étirée | [7](07-le-regard.md) |
| un `magFilter` linéaire, un `minFilter` sans mipmap | [7](07-le-regard.md) |
| un effet qui prenne la brume | [7](07-le-regard.md) |

### Le bandeau, le Sas et l'Instantané

| Jamais… | Chapitre |
|---|---|
| un multiplicateur, un chiffre flottant, un combo | [6](06-l-argent.md) |
| une carte, une minicarte, un radar, une vue de dessus | [8](08-le-bandeau-et-le-sas.md) |
| un menu de construction, un magasin, un inventaire, une mise en pause pour acheter, une confirmation d'achat | [8](08-le-bandeau-et-le-sas.md) |
| un affichage qui répète le monde | [8](08-le-bandeau-et-le-sas.md) |
| un affichage sous un doigt | [8](08-le-bandeau-et-le-sas.md) |
| un compteur de canons, un compteur de bombes | [8](08-le-bandeau-et-le-sas.md) |
| un signal d'alarme — tremblement d'écran, flash plein écran, carton, message | [8](08-le-bandeau-et-le-sas.md) |
| une mise en page décidée par l'orientation de l'appareil | [8](08-le-bandeau-et-le-sas.md) |
| une pause sur redimensionnement | [8](08-le-bandeau-et-le-sas.md) |
| un bandeau dessiné en WebGL | [8](08-le-bandeau-et-le-sas.md) |
| une écriture du bandeau à chaque image | [8](08-le-bandeau-et-le-sas.md) |
| une reprise automatique | [8](08-le-bandeau-et-le-sas.md) |
| un réglage dans le Sas — volume, muet, qualité, langue | [8](08-le-bandeau-et-le-sas.md) |
| une nouvelle partie lancée d'un appui simple quand une partie est en cours | [8](08-le-bandeau-et-le-sas.md) |
| un instantané qui décrive un assaut | [8](08-le-bandeau-et-le-sas.md) |
| un effacement de l'Instantané à la victoire | [8](08-le-bandeau-et-le-sas.md) |
| une migration de format, un message d'erreur de sauvegarde | [8](08-le-bandeau-et-le-sas.md) |
| une sonde de stockage au démarrage | [8](08-le-bandeau-et-le-sas.md) |

### Le son

| Jamais… | Chapitre |
|---|---|
| un fichier audio, une banque de sons | [9](09-les-bruitages.md) |
| un son qui répète ce que l'image dit déjà | [9](09-les-bruitages.md) |
| un son de canon à sec | [9](09-les-bruitages.md) |
| un traitement « zombie derrière soi » | [9](09-les-bruitages.md) |
| un son d'impact de boulet | [9](09-les-bruitages.md) |
| un son de montée d'échelle | [9](09-les-bruitages.md) |
| un son d'entrée du Colosse | [9](09-les-bruitages.md) |
| un rugissement, un cri, un bruit de chair | [9](09-les-bruitages.md) |
| un son de mort du joueur | [9](09-les-bruitages.md) |
| un plafond de voix global | [9](09-les-bruitages.md) |
| une voix refusée quand un bus est plein | [9](09-les-bruitages.md) |
| un son différé, remis en file | [9](09-les-bruitages.md) |
| un gémissement par zombie | [9](09-les-bruitages.md) |
| un `PannerNode`, une atténuation par la distance, une réverbération | [9](09-les-bruitages.md) |
| un message quand le son ne revient pas | [9](09-les-bruitages.md) |

### Le code

| Jamais… | Chapitre |
|---|---|
| `Math.random()` hors de `src/audio/` | [10](10-l-architecture.md) |
| une horloge dans `src/game/` ou dans `bench/` | [10](10-l-architecture.md) |
| une immuabilité, une copie de l'état | [10](10-l-architecture.md) |
| un `damage: number` | [10](10-l-architecture.md) |
| un Web Worker | [10](10-l-architecture.md) |
| un gestionnaire `unload`, une écriture dans un gestionnaire d'interruption | [10](10-l-architecture.md) |
| IndexedDB | [10](10-l-architecture.md) |
| un palier de qualité qui touche la simulation | [10](10-l-architecture.md) |
| un module `render/props.ts` | [10](10-l-architecture.md) |
| une abstraction générique — `entity`, `gameObject` | [10](10-l-architecture.md) |
| un test de rendu, une capture d'écran, un navigateur automatisé | [10](10-l-architecture.md) |

### Le banc

| Jamais… | Chapitre |
|---|---|
| un script écrit à la main par profil | [11](11-le-banc.md) |
| un pilote qui écrive autre chose qu'un `InputState` | [11](11-le-banc.md) |
| un seuil sur les écroulements | [11](11-le-banc.md) |
| un seuil de durée à 15 minutes | [11](11-le-banc.md) |
| la moyenne des cinq graines | [11](11-le-banc.md) |
| un seuil sur un balayage, un code de sortie autre que 0 pour un balayage | [11](11-le-banc.md) |
| un banc qui corrige un chiffre | [11](11-le-banc.md) |
| un barème qui ne tienne qu'à une profondeur | [11](11-le-banc.md) |
| un banc qui décide jusqu'où l'enfant descend | [11](11-le-banc.md) |
| un `bench/reference.json` réparé à la main | [11](11-le-banc.md) |
| un réglage de difficulté | [11](11-le-banc.md) |

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
