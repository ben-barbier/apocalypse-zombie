# Les zombies

Ce chapitre décide les assaillants : les quatre types et leurs chiffres, le rail à avancement monotone, ce qu'ils frappent et ce qu'ils ne frappent pas, la table des vagues complète — Rallonge comprise —, la cadence et l'ordre d'entrée, et les trois filets qui referment un assaut. La boucle qui les appelle est au [chapitre 1](01-la-partie.md), le terrain qu'ils descendent au [chapitre 2](02-la-ville.md).

## Les règles

**Le bestiaire**

1. Il y a **quatre types de zombies**, et il n'y en aura jamais un cinquième.
2. Tous partagent les mêmes quatorze boîtes : seules la **couleur, l'échelle, la vitesse et le comportement** les distinguent — jamais la silhouette (chapitre 7).
3. Les points de vie d'un zombie se comptent en **coups d'épée**, ses dégâts aux constructions en **coups de Traînard par seconde** ; ce sont deux unités distinctes, et le contact avec le joueur en est une troisième (chapitre 4).
4. Un zombie au contact d'une construction frappe **une fois par seconde**, pour la valeur de sa colonne de dégâts.
5. **Aucune statistique ne monte jamais d'une vague à l'autre** : les chiffres du tableau valent de la vague 1 à la dernière vague de la Rallonge.

**Le rail**

6. Chaque rue porte un **rail** : une polyligne fixe, tracée une fois pour toutes, de l'entrée de la rue à la face de la mairie — **92 blocs** ([chapitre 2](02-la-ville.md)).
7. Un zombie n'a qu'une position : son **avancement** le long du rail, plus un décalage latéral tiré dans **± 2 blocs**, pour que le paquet occupe la largeur de la rue au lieu d'une file indienne.
8. **L'avancement ne décroît jamais** : c'est la garantie formelle qu'un assaut se termine toujours.
9. Un zombie n'a **aucune collision avec le décor** : il ne peut ni se coincer, ni tomber hors de la ville, ni devenir inatteignable.
10. Entre eux, les zombies ne se bloquent pas : une **poussée latérale** modifie le décalage, jamais l'avancement.
11. Un zombie dont l'avancement n'a pas bougé pendant **3 secondes** est poussé de force le long de son rail.
12. Aucun zombie ne quitte jamais son rail et **aucun ne poursuit le joueur** : ils ne ciblent que la mairie.
13. Rien ne ralentit l'avancement **sauf un coup d'épée** (chapitre 4) : le joueur est le seul ralentisseur du jeu.

**Ce qu'ils frappent**

14. Le **contact** avec le joueur lui coûte un point de vie et ne coûte rien au zombie : celui-ci ne s'arrête pas, ne dévie pas, et ne lui prend jamais ce qu'il porte (chapitre 4).
15. Un zombie qui passe à moins de **1,5 bloc** d'un canon posé au sol lui met **un coup au passage, sans jamais s'immobiliser**.
16. Un canon posé sur un **toit est hors d'atteinte**, définitivement.
17. Un zombie qui atteint la mairie **s'arrête au contact** et la frappe une fois par seconde, indéfiniment — **et il reste tuable** : aucune disparition, aucune explosion, aucune fin de course.
18. Chaque coup porté à la mairie **détache un cube** qui ne revient jamais (chapitre 6).

**La mort**

19. Au coup fatal, la **tête est éjectée en tournoyant** et le reste du corps se disperse en une dizaine d'éclats qui volent et s'effacent en **0,6 seconde**.
20. La mort tinte d'un « bloup » comique (chapitre 9), une **pièce jaillit** et file vers le joueur (chapitre 6).
21. Il ne reste **rien au sol** : aucun cadavre, aucune trace, aucun sang.

**La cadence**

22. Un **paquet de 4 zombies entre toutes les 6 secondes**, dans chaque rue active : c'est la seule constante de rythme du jeu, et elle ne varie d'aucune vague.
23. Un paquet est **homogène** : un seul type, jamais deux.
24. Les rues actives **partagent** l'effectif d'une vague, elles ne le doublent pas.
25. Les rues qui portent le gros de la vague démarrent l'une après l'autre, à **8 secondes d'intervalle** ; la rue du Colosse, elle, démarre toujours à la première seconde.
26. **L'ordre d'entrée est l'inverse de l'ordre d'arrivée** : on fait entrer du plus lent au plus rapide — Costauds, puis Traînards, puis Sprinteurs.
27. Six secondes valent **9 blocs entre deux paquets**, donc **neuf paquets tiennent dans une rue** : 36 zombies par rue, 72 sur deux, 108 sur trois. Ce n'est pas ce qui borne la population.

**Les rues actives**

28. Le calendrier des rues est **déterministe et jamais tiré au sort** : la rue 1 aux vagues 1 à 4, les rues 1 et 2 à partir de la vague 5, les trois à partir de la vague 11.
29. Les rues actives sont **annoncées dès la première seconde de la préparation** et le restent pendant tout l'assaut — le portique s'allume et couche sa bande de couleur sur les premiers blocs du rail ([chapitre 2](02-la-ville.md)), une flèche pointe la rue hors champ (chapitre 8).
30. L'ouverture de la **rue 2 à la vague 5** est annoncée avec un effet appuyé — le portique s'illumine, les barrières tombent — dès le début de la préparation qui la précède.
31. La vague 1 ne s'annonce pas : ses quatre Traînards sont **déjà debout** dans la rue 1, à 20 blocs de la place, au lever de rideau ([chapitre 2](02-la-ville.md)).
32. De la vague 2 à la dernière, tout entre par le **bout de la rue**, hors de vue.

**Le Colosse**

33. Le Colosse entre **en premier**, dès la première seconde de l'assaut, et **possède sa rue** : rien d'autre n'y entre.
34. Son **escorte est de six Costauds**, massés à moins de 3 blocs de lui et **ralentis à son pas**, 0,8 bloc par seconde.
35. Il y en a **un seul dans la partie principale**, à la vague 10 ; puis **un par vague à partir de la vague 12** en Rallonge, **jamais deux à la fois**, et **sa rue change à chaque vague**.
36. À partir de la vague 12, les **Costauds sont entièrement absorbés par l'escorte** : plus un seul en dehors de la rue du Colosse.

**Les filets de fin d'assaut**

37. Le bandeau affiche **en permanence le nombre de zombies restants** (chapitre 8).
38. Dès qu'il en reste **3 ou moins**, chacun émet une **colonne de lumière verticale** visible par-dessus les toits, et sa silhouette est **détourée à travers les murs**.
39. **Au bout de 15 secondes avec 3 zombies ou moins**, les survivants prennent **4 blocs par seconde**, quel que soit leur type, et descendent droit vers la mairie.
40. Le **Colosse est exclu** du troisième filet : sa vitesse ne change jamais.

**La table**

41. La table ci-dessous est **la table des vagues**, elle est intégralement dans `game/balance.ts`, et **aucune vague ne se calcule à l'exécution**.
42. **Aucun total de vague, Rallonge comprise, ne dépasse 60** : c'est une assertion testée dans `waves.ts`, et c'est elle qui borne la population.
43. Il n'existe **aucun garde-fou de population à l'exécution** : rien ne compte les vivants pour retenir une entrée.
44. La **vague 14 est le palier** : au-delà, chaque vague est sa copie exacte.

## Les chiffres

### Les quatre types

| Type | Couleur | Échelle | Vitesse | Points de vie | Dégâts | Apparaît |
|---|---|---:|---:|---:|---:|---|
| **Traînard** | vert pâle | 1 | 1,5 bloc/s | 1 coup d'épée | 1 /s | vague 1 |
| **Sprinteur** | vert vif saturé | 0,8 | 4 blocs/s | 1 coup d'épée | 1 /s | vague 4 |
| **Costaud** | bleu-violet | 1,4 | 1 bloc/s | 5 coups d'épée | 3 /s | vague 7 |
| **Colosse** | doré | 2,2 | 0,8 bloc/s | 25 coups d'épée | 10 /s | vague 10 |

Les dégâts sont en **coups de Traînard par seconde**, l'unité des constructions. Contre le joueur, tous valent la même chose : un contact, un point de vie (chapitre 4).

### Les traversées

| Type | Rail entier (92 blocs) | Rue seule (80 blocs) |
|---|---:|---:|
| Traînard | 61,3 s | 53,3 s |
| Sprinteur | 23 s | 20 s |
| Costaud | 92 s | 80 s |
| Colosse | 115 s | 100 s |

La **rue seule** est le temps passé sous le feu des canons ; le **rail entier** ajoute les 12 blocs qui séparent la bouche de la rue de la face de la mairie.

### La table des vagues

| Vague | Traînards | Sprinteurs | Costauds | Colosse | **Total** | Rues | Fenêtre d'entrée |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 4 | — | — | — | **4** | 1 | *déjà en place* |
| 2 | 8 | — | — | — | **8** | 1 | 6 s |
| 3 | 14 | — | — | — | **14** | 1 | 18 s |
| 4 | 12 | 4 | — | — | **16** | 1 | 18 s |
| 5 | 14 | 8 | — | — | **22** | 2 | 20 s |
| 6 | 16 | 14 | — | — | **30** | 2 | 26 s |
| 7 | 18 | 12 | 4 | — | **34** | 2 | 32 s |
| 8 | 18 | 16 | 6 | — | **40** | 2 | 32 s |
| 9 | 20 | 17 | 8 | — | **45** | 2 | 38 s |
| 10 | 20 | 14 | 6 | 1 | **41** | 2 | 48 s |
| 11 | 16 | 21 | 8 | — | **45** | 3 | 34 s |
| 12 | 18 | 25 | 6 | 1 | **50** | 3 | 38 s |
| 13 | 20 | 28 | 6 | 1 | **55** | 3 | 38 s |
| 14 **(palier)** | 22 | 31 | 6 | 1 | **60** | 3 | 44 s |
| 15 et suivantes | 22 | 31 | 6 | 1 | **60** | 3 | 44 s |

Les vagues 1 à 10 sont la partie principale, les vagues 11 et suivantes la Rallonge ([chapitre 1](01-la-partie.md)). Des vagues 12 à 14, les six Costauds **sont** l'escorte du Colosse.

| Grandeur | Valeur |
|---|---:|
| Zombies de la partie principale | 254 |
| dont Traînards / Sprinteurs / Costauds / Colosse | 144 / 85 / 24 / 1 |
| Pic de population, partie principale | 45 (vague 9) |
| Pic de population, palier de la Rallonge | 60 nominal, ≈ 55 observé |
| Plafond dur du budget de performance | 60 |
| Part de Sprinteurs, vague 10 | 34 % |
| Part de Sprinteurs, vague 14 | 52 % |
| Assaut de la vague 10 | ≈ 130 s |

### La fenêtre d'entrée

La fenêtre se calcule, et la table ne fait que la publier :

```
paquets = plafond( effectif hors escorte ÷ rues qui le portent ÷ 4 )
fenêtre = 6 s × (paquets − 1) + 8 s par rue supplémentaire
```

La rue du Colosse ne compte pas dans le décalage : elle démarre à la première seconde.

### Les fuites, et les 200 points de la mairie

Une **fuite** coûte le temps du retour du joueur : **6 secondes** depuis la place. Ce qu'une partie correctement jouée dépense, vague par vague :

| Vague | Ce que ça représente | Points |
|---:|---|---:|
| 1 à 3 | aucune fuite | **0** |
| 4 | 1 Sprinteur | **6** |
| 5 | 1 | **6** |
| 6 | 2 | **12** |
| 7 | 1 Costaud + 1 Traînard | **24** |
| 8 | 1 Costaud + 2 | **30** |
| 9 | 2 Costauds + 2 | **48** |
| 10 | 6 du menu fretin | **40** |
| | **cumul** | **166** |

Sur les **200 points de la mairie neuve** (chapitre 6), il reste **34 de marge**, et la vague 9 tient sous le repère de 50. Le **Colosse est budgété à zéro** : une partie correctement jouée l'arrête dans sa rue. Les lignes 4 à 9 valent exactement six secondes de fuite par zombie ; la ligne 10 est arrondie vers le haut.

Une fuite depuis le **fond d'une rue** coûte **15 secondes** au lieu de 6 : c'est le gradient du [chapitre 2](02-la-ville.md) appliqué aux dégâts, et il n'entre dans aucune ligne du barème — il est le prix du jeu en avant.

## Les interdits

- **Jamais un cinquième type de zombie** — quatre couleurs franches et trois tailles suffisent à identifier une menace en une demi-seconde ; un cinquième type demanderait une couleur, une silhouette, un barème, une entrée de glossaire, pour une difficulté que le nombre donne déjà.
- **Jamais un calcul de chemin** — ni A\*, ni navmesh, ni champ de flux : ils coûtent du CPU JavaScript, la ressource rare, pour résoudre un problème qui n'existe pas sur un décor figé, et ils peuvent échouer, coincer ou tourner en rond.
- **Jamais un zombie qui quitte son rail, jamais un zombie qui poursuit le joueur** — un zombie parti à la chasse peut se perdre, ce qui casse la garantie qu'un assaut se termine ; et l'enfant doit pouvoir dire « ils vont tous là-bas » d'un coup d'œil.
- **Jamais un avancement qui décroît** — c'est la garantie, et elle est formelle, pas statistique.
- **Jamais un zombie qui s'immobilise sur un canon au sol** — il redeviendrait une barricade, et un assaut pourrait caler devant un mur de canons.
- **Jamais un zombie qui disparaît en atteignant la mairie** — il reste une cible, donc le joueur peut toujours réparer sa négligence en courant.
- **Jamais un cadavre, jamais une trace au sol, jamais de sang** — la ville reste propre, le budget d'affichage intact, et la mort reste comique.
- **Jamais un paquet mixte** — 4 blocs/s contre 1,5, il se séparerait de lui-même en cinq secondes ; autant l'assumer : un paquet est une menace, et une réponse.
- **Jamais une cadence autre que 6 secondes** — à 4 s les paquets se collent à 6 blocs, la colonne devient un mur et le paquet perd sa lecture.
- **Jamais une rue tirée au sort** — à 8 ans, dépenser son argent et découvrir que le hasard l'a annulé est la pire sensation possible : un canon posé au bon endroit ne doit jamais devenir rétroactivement gaspillé.
- **Jamais deux Colosses à la fois** — 20 points de mairie par seconde couchent une mairie pleinement renforcée en 25 secondes, un pic que rien dans le bandeau ne rend lisible.
- **Jamais un Colosse qui sprinte** — le troisième filet l'exclut : il n'est jamais perdu, et un géant qui court casse le personnage sur lequel quatorze boîtes ont été investies.
- **Jamais une vitesse au-dessus de 4 blocs par seconde** — c'est le plafond du jeu, celui du Sprinteur ; au-dessus, rien ne se lit plus.
- **Jamais une statistique qui monte avec le numéro de vague** — c'est l'interdit central de la boucle ([chapitre 1](01-la-partie.md)), et il vaut pour les points de vie, les dégâts et la vitesse.
- **Jamais un garde-fou de population à l'exécution** — la table borne, un compteur ne borne pas ; un garde-fou masquerait une table cassée au lieu de la faire échouer au test.
- **Jamais une vague engendrée par formule** — la table est écrite en toutes lettres, donc lisible, testable et retouchable ligne à ligne.
- **Jamais un zombie rouge** — le rouge n'existe nulle part dans ce jeu, ni dans le monde ni dans le bandeau (chapitre 7).

## Pourquoi

**Pourquoi des rails, et pas un calcul de chemin.** Le décor est figé et les fronts bâtis sont infranchissables : il n'y a rien à calculer. Un zombie n'a donc qu'une variable, son avancement, et cette pauvreté est exactement ce qu'on veut — elle rend le déplacement **incassable** (on ne se coince pas sur une polyligne), **gratuit** en CPU, et surtout **chiffrable** : la traversée d'une rue vaut 53,3 secondes pour un Traînard, une fois pour toutes, donc la table des vagues se vérifie sur le papier et se rejoue au banc.

**Pourquoi le total d'une vague est le nombre de zombies vivants.** Une vague entre en 6 à 48 secondes, et un Traînard vit 61 secondes sur son rail : **la vague entre plus vite qu'elle ne se vide**. Le nombre de vivants ne peut donc pas dépasser le total de la vague, et ce total est dans la table. C'est ce qui rend inutile tout garde-fou à l'exécution, et c'est aussi ce qui donne à un assaut sa forme : non pas un goutte-à-goutte, mais une **colonne** étirée sur les 80 blocs de la rue.

**Pourquoi le plafond n'est plus tenu par la géométrie.** Une rue porte neuf paquets, soit 36 zombies ; deux rues en portent 72 et trois 108 — bien au-delà des 60 du budget de performance. Rien n'arrête donc plus physiquement un total trop grand : ce qui l'arrête est **la table elle-même**, et c'est pour cela qu'une assertion testée remplace la garantie perdue. Sans elle, une retouche d'équilibrage casserait le budget en silence.

**Pourquoi la cadence ne bouge d'aucune vague.** Six secondes valent neuf blocs entre deux paquets, et ces neuf blocs sont une constante de **lisibilité** accrochée à la vitesse du Traînard, pas à la longueur de la rue. Une rue plus longue ne rend pas la colonne plus dense, elle la rend plus longue — c'est exactement l'effet voulu. L'effectif d'une vague ne dit donc qu'une chose : combien de paquets, c'est-à-dire quelle longueur de colonne.

**Pourquoi les paquets sont homogènes, et pourquoi l'ordre est renversé.** Un paquet mixte se sépare tout seul, autant l'assumer. Et faire entrer du plus lent au plus rapide n'est pas une mise en scène, c'est une conséquence des vitesses qui travaille à trois titres : les Costauds prennent la tête puis se font doubler sous les yeux du joueur ; le profil d'arrivée à la mairie s'étale sur une trentaine de secondes au lieu de tout tomber d'un coup ; et le joueur finit sur le morceau le plus dur, l'épée déjà émoussée.

**Pourquoi 85 Sprinteurs, soit un tiers de la partie.** Un canon tire un boulet toutes les 2 secondes et un boulet tue un Traînard : sur les seize secondes qu'un Traînard passe dans une portée, il en encaisse huit. **Les canons broient les Traînards** — ce qui est très bien : le Traînard est le remplissage de la colonne et le portefeuille du joueur. La difficulté tardive doit donc se déplacer sur ce que les canons ne traitent pas : le **Sprinteur**, qui ne passe que six secondes dans une portée, soit trois boulets, et qu'il faut intercepter à l'épée ; et le **Costaud**, dont les 5 points de vie valent dix secondes du feu d'un canon.

**Pourquoi les vagues 4 et 7 sont en retrait, et la 10 plus légère que la 9.** Aux vagues 4 et 7 on introduit un type nouveau : on ne cumule pas les deux chocs, d'où +2 et +4 quand la tendance est à +6 ou +8. Et la vague 10 compte moins de monde que la 9 parce que sa difficulté vient du Colosse, pas de la foule.

**Pourquoi la vague 1 est déjà debout dans la rue.** Faire apparaître les quatre Traînards à mi-rail coûterait vingt-quatre secondes d'attente avant le premier coup d'épée, et l'apparition serait **en pleine vue** — la brume laisse voir le fond d'une rue, c'est même sa raison d'être. Ils sont donc là au lever de rideau : le jeu s'ouvre sur « ils descendent déjà ta rue », et le premier coup tombe vers la quatrième seconde.

**Pourquoi le Colosse entre en premier.** Le faire entrer en dernier — quand la moitié de la vague est morte — ajouterait cent quinze secondes de queue à la vague 10 : deux minutes et demie d'assaut dont la dernière serait un géant marchant seul dans une rue vide. Entré le premier, il est visible d'emblée, il descend pendant près de deux minutes, et pendant ce temps **on ne peut pas être aux deux endroits**. L'arbitrage final n'est plus subi, il est choisi : monter le tuer dans sa rue, ou tenir l'autre. La fenêtre de décision vaut cent secondes — assez pour faire un aller-retour et le regretter.

**Pourquoi le Colosse est budgété à zéro dans les 166 points.** Ses 25 points de vie valent cinquante secondes-canon, un canon le tient une trentaine de secondes dans sa portée : **deux canons sur sa rue l'arrêtent**, et il passe cent secondes sous le feu. Une partie correctement jouée ne le laisse donc jamais arriver. S'il arrive quand même, ses cent points restent dramatiques et non fatals — c'est le contrat.

**Pourquoi l'escorte n'est pas le danger qu'on croit.** La fauchée balaie un secteur de 120° sur 3 blocs, et les six Costauds massés y tiennent ensemble : deux secondes d'épée pour les six. Leur vrai coût est en points de vie du joueur, par contact (chapitre 4), et en boulets détournés — les canons qui tirent sur le Colosse les touchent aussi, et il faut choisir.

**Pourquoi les canons au sol s'usent, et pas ceux des toits.** Rien n'interdit d'aligner des canons en travers d'une rue, mais ils y fondent : un canon posé en pleine rue survit environ deux vagues, un canon posé à l'écart du rail ne s'use jamais, un canon de toit est éternel. L'arbitrage sol/toit devient franc et se **voit** — en bas, le ravitaillement est rapide mais le canon se paie ; en haut, il est intouchable mais chaque bombe coûte une montée.

**Pourquoi le troisième filet donne 4 blocs par seconde, et non le double de la vitesse.** Quatre blocs par seconde est la vitesse du Sprinteur : on ne crée aucune constante, on en réutilise une, et c'est le **plafond de vitesse du jeu** — rien ne dépassera jamais le Sprinteur, donc rien ne devient illisible. Doubler ferait courir un Traînard plus vite qu'un Sprinteur sous les yeux de l'enfant, et laisserait le Costaud traîner à 2 blocs par seconde, soit cinquante-trois secondes de rien. Uniforme, le filet s'explique en une phrase.

**Pourquoi trois filets et non un.** Un enfant qui cherche le dernier zombie pendant deux minutes s'ennuie et abandonne. Le compteur dit **combien**, la colonne de lumière dit **où**, et le troisième filet fait venir la fin de vague au joueur au lieu de la lui faire chercher.

**Pourquoi la rue active est annoncée, et jamais tirée au sort.** L'annonce ne révèle pas un tirage : elle **télégraphie** une décision déjà prise, et c'est tout son intérêt. Elle tombe dès la première seconde de la préparation, parce que signaler cinq secondes avant serait un compte à rebours déguisé — alors que la boucle a banni le chrono comme source d'urgence — et surtout parce que cela arriverait **après** que le joueur a dépensé son argent.

## D'où ça vient

[#7](https://github.com/ben-barbier/apocalypse-zombie/issues/7) pour le bestiaire et ses statistiques, les unités de dégâts, le rail à avancement monotone et ses garanties, ce que les zombies ciblent, l'usure des canons au sol, le comportement à la mairie, la mort en cubes, les filets de fin d'assaut et l'annonce des rues actives. [#26](https://github.com/ben-barbier/apocalypse-zombie/issues/26) pour la table des dix vagues, la cadence, les paquets homogènes, l'ordre d'entrée renversé, la vague 1 déjà en place, le Colosse qui entre en premier et possède sa rue, et le barème des 166 points. [#20](https://github.com/ben-barbier/apocalypse-zombie/issues/20) pour les quatre lignes de la Rallonge et le Colosse à rue tournante. [#35](https://github.com/ben-barbier/apocalypse-zombie/issues/35) pour les traversées sur un rail de 92 blocs, les neuf paquets d'une rue, le troisième filet à 4 blocs par seconde et l'assertion qui borne les totaux.
