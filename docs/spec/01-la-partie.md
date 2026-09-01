# La partie

Ce chapitre décide le cadre : ce qu'est *Apocalypse Zombie*, sur quoi il se joue, la boucle en deux temps qui rythme une partie, la victoire à la vague 10, la défaite douce et la relance immédiate, et la Rallonge qui prolonge une victoire acquise. Le terrain est au [chapitre 2](02-la-ville.md), le contenu des vagues au chapitre 3.

## Les règles

**Le cadre**

1. *Apocalypse Zombie* est un **tower defense 3D en voxel, vu à la troisième personne**, joué en **solo strict** : aucun réseau, aucun compte, aucun second joueur.
2. Le jeu est **un seul build web** servi en statique, et il n'en existe pas d'autre — ni application native, ni variante par plateforme.
3. Il a **deux publics** : le PC **à la manette**, l'iPad **au tactile**. Le clavier n'existe que comme raccourci de test — jamais conçu, jamais équilibré, jamais montré au joueur.
4. Il n'y a **aucune souris**, donc **aucune visée libre** : rien dans le jeu ne se désigne à distance.
5. Le joueur est **un enfant de 8 ans** : rien d'effrayant, rien à lire pour jouer, aucune punition sèche.
6. La v1 tient dans **une seule ville, fixe et faite à la main**, et un seul mode de jeu.
7. **Rien ne survit à une partie** : ni record, ni médaille, ni progression, ni réglage. La seule chose que le jeu écrive sur l'appareil est l'Instantané, qui meurt avec la partie qu'il décrit (chapitre 8).
8. Une partie **vise 10 à 15 minutes** — une visée, jamais une garantie : la durée appartient au rythme du joueur.
9. Le style est **cubique et original** : textures de 16 × 16 pixels dessinées pour ce projet, filtrage `nearest`, et **aucun asset Minecraft** — on emprunte le langage visuel, jamais les fichiers (chapitre 7).

**La boucle**

10. Une partie est une suite de **vagues** numérotées à partir de 1 ; la partie principale en compte **dix**.
11. Une vague est un cycle en **deux temps** : un **assaut**, puis une **préparation**.
12. **Aucun chrono ne tourne pendant l'assaut** : il s'achève à la mort du dernier zombie, et rien d'autre ne l'achève.
13. Un assaut **se termine toujours** — les zombies avancent sur rails de façon monotone, et trois filets ramènent les derniers (chapitre 3).
14. La **préparation** est de durée fixe et s'écoule seule : aucun bouton ne la déclenche, ne l'allonge ni ne l'abrège, et il n'existe pas de bouton « prêt ».
15. Elle dure **25 secondes pour les vagues 1 à 3** et **30 secondes à partir de la vague 4**, Rallonge comprise.
16. La partie s'ouvre **sur l'assaut de la vague 1** : aucune préparation ne le précède, et une partie gagnée compte donc **dix assauts et neuf préparations**.
17. La préparation de la vague 10 n'a lieu **que si le joueur prend la Rallonge**.
18. Toute partie commence par un **appui dans le Sas** (chapitre 8) : rien ne démarre ni ne reprend jamais tout seul.
19. La **mairie ne se régénère jamais** : un point de vie perdu l'est définitivement, et seul le Renfort relève sa barre (chapitre 6).
20. L'urgence ne vient donc **jamais du temps, mais des dégâts** : traîner ne raccourcit aucune préparation, ça coûte des points de mairie, et ils ne reviennent pas.
21. La difficulté monte par le **nombre et la variété** — plus de zombies, des types nouveaux, une rue de plus — et **jamais par les statistiques** ; le calendrier est dans la table des vagues (chapitre 3).

**La première vague**

22. Le joueur apparaît **sur la place devant la base, l'épée en main, tourné vers la rue 1** — non plus au contact du hangar mais **dégagé de lui** : quatre blocs au-delà de sa face et six au-delà de son flanc, soit **12 blocs sur l'axe de la rue 1 et 9 blocs de côté** ([chapitre 2](02-la-ville.md)), à **7,2 blocs du hangar**, l'ordre de grandeur du recul de la caméra ; ainsi posé, et tourné vers les vingt blocs de rue où se tiennent ses quatre Traînards ([chapitre 2](02-la-ville.md)), la caméra qui se place 6,5 blocs derrière lui tombe sur la place à plus de 3 blocs de tout bâti, **hors de l'emprise de la mairie comme de celle du hangar**, ouvre à sa hauteur nominale sans avoir à grimper ([chapitre 4](04-le-joueur.md)), et **ne cadre plus ni l'une ni l'autre** — leurs angles tombent tous hors des bords de l'image, quand le portique de la rue 1 y est ; c'est le premier écran d'une partie neuve, l'enfant doit y voir son personnage et la rue à descendre, et l'assaut de la vague 1 a déjà commencé : quatre Traînards descendent la rue 1, debout au lever de rideau.
23. Le premier coup d'épée tombe vers la **quatrième seconde**, la première pièce dans les **quinze premières secondes** : frapper, voir le zombie se désintégrer, ramasser une pièce enseigne le jeu entier en un geste.
24. Il n'y a **aucun tutoriel, aucun texte d'accueil, aucune séquence scriptée** : la vague 1 est le tutoriel, et c'est une vague comme les autres.

**La victoire**

25. Tenir jusqu'à la mort du dernier zombie de l'assaut de la vague 10, c'est **gagner** : la ville est sauvée et la partie s'arrête là.
26. La victoire est **acquise** : rien de ce qui suit ne la reprend, et la mairie peut tomber en Rallonge sans l'effacer.
27. Elle ouvre **deux suites et deux seulement** : prendre la **Rallonge**, d'un appui, ou **quitter la partie** — ce qui efface l'Instantané (chapitre 8).

**La défaite**

28. La partie s'achève quand **la mairie tombe à zéro**, et c'est la seule fin possible : le joueur, lui, ne meurt jamais (chapitre 4).
29. La fin est **douce** : un fondu de **moins de 3 secondes**, aucun texte d'échec, aucune musique triste, aucune progression perdue à annoncer.
30. Ce que la fin affiche est **le numéro de la vague atteinte**, et rien d'autre — un chiffre se lit sans savoir lire.
31. Le fondu s'ouvre sur le **Sas**, dont il ne reste que la porte *Nouvelle partie* : on **relance d'un appui**, sans confirmation, puisqu'il n'y a plus de partie à écraser (chapitre 8).

**La Rallonge**

32. La Rallonge se prend **d'un appui après la victoire** et enchaîne sur la préparation de la vague 11 ; ses vagues sont numérotées 11, 12, … et **n'ont plus de total**.
33. Elle **n'invente rien** : aucun type de zombie neuf, aucune statistique gonflée, aucune constante de rythme touchée, aucun asset à produire.
34. Elle dispose de **trois leviers, et trois seulement** : le nombre de rues actives (2 → 3), l'effectif d'une vague (45 → 60) et la composition.
35. La **troisième rue s'ouvre à la vague 11, à effectif inchangé** : la vague est franchement plus dure sans un zombie de plus, parce qu'on ne peut pas être aux trois endroits.
36. L'effectif monte ensuite jusqu'au **palier de la vague 14** — 60 zombies, trois rues —, et **la vague 14 se répète à l'identique**, indéfiniment.
37. À partir de la vague 12, il y a **un Colosse par vague et jamais deux**, entré le premier avec son escorte, et **sa rue change à chaque vague**.
38. Les **prix ne s'indexent jamais** sur le numéro de vague.
39. La Rallonge **ne garantit pas la chute de la mairie** : « jusqu'à la chute » dit quand la série s'arrête, pas qu'elle s'arrêtera.

## Les chiffres

### Une partie

| Grandeur | Valeur |
|---|---:|
| Vagues de la partie principale | 10 |
| Assauts d'une partie gagnée | 10 |
| Préparations d'une partie gagnée | 9 |
| Préparation, vagues 1 à 3 | 25 s |
| Préparation, vagues 4 et suivantes | 30 s |
| Préparations cumulées, partie gagnée | 255 s |
| Assauts cumulés, bien joué | ≈ 613 s |
| **Partie bien jouée** | **≈ 14,5 min** |
| Partie au pire, joueur passif | ≈ 18,3 min |
| *pour mémoire, la visée du cadre* | *10 à 15 min* |

### Les premières secondes, et les dernières

| Repère | Valeur |
|---|---:|
| Position d'ouverture, sur l'axe de la rue 1 puis de côté | 12 et 9 blocs |
| Distance du hangar à l'ouverture | 7,2 blocs |
| Traînards debout dans la rue 1 au lever de rideau | 4 |
| Premier coup d'épée | ≈ 4e seconde |
| Première pièce | < 15 s |
| Fondu de fin de partie | < 3 s |

### Le calendrier de la Rallonge

| Vague | Rues actives | Effectif | Ce qui change |
|---:|---:|---:|---|
| 11 | 3 | 45 | la troisième rue s'ouvre, sans un zombie de plus |
| 12 | 3 | 50 | un Colosse par vague, escorté, sa rue tourne |
| 13 | 3 | 55 | — |
| 14 | 3 | 60 | **palier** |
| 15 et suivantes | 3 | 60 | copie de la vague 14 |

La composition par type, la cadence d'entrée et les fenêtres sont au chapitre 3.

## Les interdits

- **Jamais un chrono pendant l'assaut** — l'urgence doit venir des dégâts de la mairie, définitifs, et non d'une horloge qui punit la lenteur puis efface la faute.
- **Jamais un bouton « prêt », jamais une préparation qu'on allonge ou qu'on abrège** — le seul rythme que le joueur contrôle est celui de son nettoyage.
- **Jamais une préparation sous 30 secondes à partir de la vague 4, Rallonge comprise** — dès qu'un canon est posé, la préparation n'est plus du temps mort : c'est le gradient de ravitaillement du [chapitre 2](02-la-ville.md), calibré au tiers de seconde près sur ces 30 s — le pied d'une rue à 10,9 s, le milieu à 19,8, le fond à 28,8 et le toit le plus lointain à 33,5. Rogner là ne rend pas les vagues plus dures, ça écrase le gradient sur le seul pied de rue et rend le jet de feu inutile. C'est un gonflage déguisé en horloge. **Avant** la vague 4, il n'y a rien à ravitailler : l'interdit ne protège rien et ne s'applique pas.
- **Jamais un jeu infini sans victoire** — à 8 ans, un jeu sans ligne d'arrivée garantit qu'on perd toujours ; c'est un mauvais contrat.
- **Jamais une difficulté qui monte par les statistiques** — un Traînard qui survit soudain à un coup ne se lit pas « le zombie est plus fort », il se lit « mon épée est cassée ».
- **Jamais un prix indexé sur le numéro de vague** — c'est le même gonflage, appliqué au portefeuille : invisible, illisible, ressenti comme une triche.
- **Jamais un cinquième type de zombie, jamais deux Colosses à la fois** — le premier est du contenu que seul un joueur ayant déjà gagné verrait ; les seconds font 20 points de mairie par seconde, une mort que rien dans le bandeau ne rend lisible.
- **Jamais une régénération de la mairie** — c'est elle qui fait de chaque seconde perdue une perte définitive, donc toute l'urgence du jeu.
- **Jamais un texte d'échec, jamais une musique triste** — on perd en trois secondes de fondu et on rejoue d'un appui.
- **Jamais un compteur de zombies écrasés à la fin de partie** — c'est un score, et ce jeu n'en a pas ; le numéro de la vague atteinte dit tout et clôt la série.
- **Jamais rien qui survive à une partie** — ni record, ni médaille, ni réglage, ni progression : la partie suivante repart exactement au même endroit que la première.
- **Jamais une ouverture au contact du hangar** — la caméra se place 6,5 blocs derrière le joueur, et de si près le hangar et la mairie prennent la moitié du premier écran ; c'est l'endroit où le joueur se tient qui cadre l'ouverture, jamais un mouvement de caméra.
- **Jamais un tutoriel** — la vague 1 en tient lieu, et elle se joue.
- **Jamais une souris, jamais une visée libre, jamais un clavier équilibré** — deux entrées sont conçues, la manette et le tactile, et rien d'autre ne l'est.
- **Jamais un asset Minecraft** — on emprunte le langage visuel, jamais les fichiers.

## Pourquoi

**Pourquoi on gagne, et pourquoi à la vague 10.** Un enfant de 8 ans doit voir la ligne d'arrivée : « vague 7 sur 10 » est un but, alors qu'un jeu infini garantit qu'on perd toujours. Dix vagues, c'est aussi ce qui tient dans la visée de 10 à 15 minutes une fois la table des vagues posée. Et la victoire est **acquise** parce que la Rallonge doit pouvoir se jouer sans rien risquer : on ne reprend pas à un enfant ce qu'il vient de gagner.

**Pourquoi aucun chrono pendant l'assaut.** C'est la décision dont tout ce chapitre découle. Sans horloge, traîner ne raccourcit plus la préparation suivante : la seule chose que coûte la lenteur, ce sont les points de vie de la mairie — et ils ne reviennent pas. On **voit** la mairie s'abîmer, on comprend qu'il faut se dépêcher, et c'est une pression bien plus lisible qu'un compte à rebours pour quelqu'un qui ne lit pas encore vite.

**Ce que la boucle en deux temps garantit à l'économie.** Un assaut ne s'achevant qu'à la mort du dernier zombie, **jouer mal ne coûte aucun revenu** : tous les zombies de la table finissent par mourir, donc la masse monétaire d'une partie est indépendante du niveau du joueur. C'est ce qui rend le Renfort de la mairie toujours payable, et ce qui empêche la spirale — celui qui va mal garde exactement les moyens de s'en sortir (chapitre 6).

**Pourquoi 25 secondes puis 30, et pourquoi la plus courte est la première.** Les trois premières préparations avaient d'abord reçu 40 secondes, au motif que l'enfant y apprend à poser un canon, à monter une échelle et à revenir à la base. Le compte de l'argent dit que c'est le contraire qui se passe : la vague 1 rend 4 Traînards, soit 8 pièces à l'épée et 10 de prime, quand un canon en coûte 40 ([chapitre 6](06-l-argent.md)). Il n'y a **rien à acheter et rien à ravitailler** avant la troisième prime — ce sont les préparations les plus longues du jeu, et ce sont les seules qui soient vides. Elles tombent donc à 25 secondes, ce qui reste au-dessus des 19,8 s qu'un aller-retour au milieu d'une rue demande le jour où il devient possible. À partir de la vague 4 le joueur a un canon à nourrir, et les 30 secondes redeviennent ce que le gradient du [chapitre 2](02-la-ville.md) exige : elles ne bougent plus, Rallonge comprise.

**Pourquoi la durée n'est pas garantie, et pourquoi on accepte 15 minutes.** Depuis la boucle en deux temps, la durée appartient au rythme du joueur : elle ne peut plus être une promesse. Le compte complet — rails de 92 blocs, filet du dernier zombie à 4 blocs par seconde, Colosse à 115 secondes — donne environ 14,5 minutes bien jouée et 18,3 au pire. On l'accepte tel quel, sans compenser ailleurs : ce n'est pas la difficulté qui s'est allongée, c'est le trajet. Les trois leviers d'équilibrage — la table, les prix, la portée — resteraient tous à côté du sujet.

**Pourquoi la première vague est un tutoriel déguisé.** Rien n'apparaît au lever de rideau : quatre Traînards descendent déjà la rue, le joueur a l'épée en main sur la place, la caméra ouvre dégagée derrière lui et le portique de la rue 1 est dans le cadre, et la seule chose qu'il puisse faire est de frapper. Le zombie se désintègre, une pièce tombe, elle est aimantée : la boucle entière du jeu — frapper, gagner, acheter — est enseignée en un geste, sans une ligne de texte et sans qu'on ait rien scripté.

**Pourquoi l'ouverture s'écarte du hangar, et pourquoi de côté.** Le premier écran ne doit montrer que deux choses : le personnage et la rue à descendre. Au contact du hangar il en montrait une troisième, et elle prenait la moitié de l'image — la caméra se place 6,5 blocs derrière le joueur, et à un demi-bloc du hangar ces 6,5 blocs la posent au flanc des deux seuls bâtiments hauts de la place : le hangar au premier plan, la mairie derrière, le personnage à moitié caché. Cela ne se corrige pas à la caméra — aucun cadrage n'est jamais repris au joueur ([chapitre 4](04-le-joueur.md)) — mais à l'endroit où le joueur se tient. Six blocs au-delà du flanc du hangar suffisent : mairie et hangar sortent du champ, la caméra ouvre sur la place vide à 3,3 blocs de tout bâti, et **rien n'est perdu** — la bourse est vide au lever de rideau et les bombes se paient ([chapitre 4](04-le-joueur.md), [chapitre 6](06-l-argent.md)), donc il n'y a rien à prendre au hangar avant d'avoir tué. L'écart est **latéral** et jamais dans l'axe de la rue, parce que les deux directions ne coûtent pas la même chose : reculer dans l'axe rapproche des Traînards et fait tomber le premier coup **sous les trois secondes**, quand l'écart de côté les éloigne et le laisse à **3,6 secondes**, dans la quatrième seconde que demande la règle 23.

**Pourquoi la difficulté ne monte jamais par les statistiques.** L'épée est l'unité de dégâts du jeu et elle ne s'améliore jamais (chapitre 4). Tout le barème se lit en coups d'épée : gonfler les points de vie d'un type revient à casser l'unité de mesure sous les pieds du joueur, qui ne dira pas « ce zombie est plus fort » mais « mon épée ne marche plus ». Le nombre, les types et les rues suffisent — ils sont, eux, visibles.

**Pourquoi la Rallonge n'invente rien.** Elle est gratuite à produire : la troisième rue est déjà dessinée dans le plan en étoile, les 60 vivants sont déjà mesurés par le budget de performance, et la rotation du Colosse est une ligne de table. Tout ce qu'elle aurait pu ajouter — un cinquième type, une cadence plus serrée, une préparation plus courte — est soit du contenu que seul un vainqueur verrait, soit un gonflage déguisé.

**Pourquoi un palier, et pas une courbe qui monte indéfiniment.** Une montée sans fin n'existe pas physiquement : à trois rues et 60 vivants simultanés, les trois leviers sont épuisés, et « continuer à monter » n'aurait plus d'autre carburant que les statistiques. Mieux vaut un palier assumé, répété à l'identique, que la lente trahison de l'interdit central du jeu.

**Pourquoi la troisième rue est le saut de la vague 11.** Ce n'est pas une affaire de géométrie : deux rues de 80 blocs portent 72 zombies, bien au-delà du plafond de 60 — rien n'oblige physiquement à ouvrir une troisième rue. Ce qui tient le calendrier, c'est l'**ubiquité** : les sept canons d'une fin de partie type couvrent deux rues, la troisième est vierge, et le coût d'une rue de plus est de ne pas pouvoir être partout. Le palier de la vague 14, lui, est fixé par le plafond dur de 60 zombies vivants du budget de performance ([chapitre 10](10-l-architecture.md)).

**Pourquoi la Rallonge ne garantit pas la chute.** Une vague de palier rapporte de quoi acheter près de deux Renforts : l'argent n'est donc pas ce qui arrête le joueur. Ce qui l'arrête, c'est le temps et l'ubiquité — le Renfort s'achète au contact de la mairie, trois rues coulent en même temps, et le Colosse change de rue. Un enfant qui tiendrait vingt vagues aurait gagné deux fois, et ce n'est pas un défaut de conception. C'est la seule hypothèse de ce chapitre qui ne se vérifie pas sur le papier : elle s'éprouve au banc (chapitre 11).

**Pourquoi rien ne persiste entre deux parties.** Un record survivant à la partie transformerait la fin en bilan, donc la défaite en punition — exactement ce que la fin douce évite. Il obligerait aussi à écrire une seconde chose sur l'appareil, alors que l'Instantané est la seule, sous une clé unique et gelée (chapitre 8). La partie suivante repart au même endroit que la première : c'est ce qui rend la relance immédiate honnête.

**Pourquoi la fin de partie n'affiche qu'un chiffre.** « Tu as tenu jusqu'à la vague 14 » se lit sans savoir lire, se compare de tête, et clôt la série. Tout le reste — zombies écrasés, pièces gagnées, canons posés — serait un score, un mot que ce projet n'emploie ni dans le jeu ni dans le code.

## D'où ça vient

[#5](https://github.com/ben-barbier/apocalypse-zombie/issues/5) pour la structure d'une partie : dix vagues et on gagne, le cycle en deux temps, l'assaut sans chrono, les 40 puis 30 secondes de préparation, la mairie qui ne se régénère jamais, la première vague comme tutoriel, la difficulté par le nombre et la variété, la fin douce et la relance immédiate. [#20](https://github.com/ben-barbier/apocalypse-zombie/issues/20) pour la Rallonge : son contrat, ses trois leviers, la troisième rue à la vague 11, le palier de la vague 14, le Colosse à rue tournante, la victoire acquise et ce qui s'affiche quand la mairie tombe. [#35](https://github.com/ben-barbier/apocalypse-zombie/issues/35) pour ce que les rues de 80 blocs font à la durée d'une partie et pour la justification du calendrier de la Rallonge, l'ubiquité et le plafond de performance ayant remplacé la saturation géométrique. Les neuf premières règles viennent du cadre verrouillé de la [carte #1](https://github.com/ben-barbier/apocalypse-zombie/issues/1).
