# Le regard

Ce chapitre décide comment le jeu se voit : l'heure orange et sa lumière unique, la brume, le contraste de température qui sépare le décor de ce qui se joue, l'éclat comme seule primitive d'effet, les corps à quatorze boîtes et la tache qui les ancre, et la planche de treize tuiles avec le script qui l'engendre. La ville qu'il habille est au [chapitre 2](02-la-ville.md), les corps qu'il colore aux [chapitres 3](03-les-zombies.md) et [4](04-le-joueur.md), les effets qu'il déclenche aux [chapitres 5](05-les-canons.md) et [6](06-l-argent.md), le bandeau au chapitre 8, et le budget qui l'autorise au [chapitre 10](10-l-architecture.md).

## Les règles

**La lumière**

1. Le jeu n'a qu'une **seule heure**, et elle ne change jamais : ni entre deux vagues, ni pendant un assaut, ni en Rallonge ([chapitre 1](01-la-partie.md)).
2. Il n'existe qu'**une seule lumière directionnelle** — le soleil, fixe à **60° au-dessus de l'horizon** — doublée d'**une seule ambiante**, violette, qui remplit les faces à contre-jour.
3. **Aucune ombre portée n'existe** : le soleil n'est qu'une direction d'éclairement, et rien, jamais, ne projette d'ombre.
4. **Aucune lumière ponctuelle n'existe** : rien n'éclaire son voisinage — ni le jet de feu, ni un éclat, ni une pièce, ni un portique.
5. Le relief se lit donc à la **valeur des faces** : la face du dessus est neutre, les latérales s'assombrissent, et rien ne crame.
6. La **brume** est orange, épaissit avec la distance et efface l'extérieur au-delà des fronts bâtis — mais elle **laisse voir le fond d'une rue**, d'où sortent les zombies ([chapitre 3](03-les-zombies.md)).
7. Elle est **structurelle et non décorative** : c'est elle qui dispense de détailler ce qu'on ne joue pas.
8. **Les effets ne prennent pas la brume** : un canon lointain qui tire doit se voir tirer.

**Le contraste de température**

9. **La ville est chaude, ce qui se joue est froid** — ou franchement saturé. C'est le **contraste de température**, jamais un surcroît de saturation, qui fait ressortir un repère.
10. **La ville est texturée, ce qui bouge et ce qui se pose est uni** : un corps, un canon, un éclat, une pièce portent une **couleur d'exemplaire**, jamais une image.
11. **Aucun effet du jeu n'est orange** : l'orange appartient au décor, et un effet se lit sur les trois canaux dont le décor ne dispose pas — la **valeur**, le **mouvement**, la **température**.
12. Le **blanc pur** et le **noir mat** n'existent nulle part dans la ville : ce sont les deux couleurs de l'action.
13. **Le blanc dit « ça vient de se passer », le noir dit « ceci se ramasse, ou va tomber ici ».**
14. Ce qui **bouge se voit**, ce qui est **posé et statique se fond** : le mouvement est un canal de lecture à part entière, et le jeu s'en sert plutôt que d'ajouter une couleur.
15. **Le rouge n'existe nulle part** — ni dans le monde, ni dans le bandeau (chapitre 8).
16. Le **cerne** noir n'entoure que ce qui se ramasse — la pièce et la bombe de feu, rien d'autre ([chapitre 6](06-l-argent.md)).
17. **Tout est opaque** — tuiles, corps, canons, éclats, flammes : aucun objet du jeu n'est translucide, et c'est le **tampon de profondeur** qui range la scène, jamais un tri par objet.

**Les corps**

18. Tous les personnages — les quatre types de zombies et le joueur — sont bâtis sur les **mêmes quatorze boîtes** : torse, tête, mâchoire, deux épaules, deux bras, deux mains, ceinture, deux jambes, deux pieds.
19. Seules la **couleur, l'échelle, la vitesse et le comportement** distinguent un personnage d'un autre ; **jamais la silhouette** ([chapitre 3](03-les-zombies.md)).
20. Les corps sont animés **par le calcul**, jamais par un fichier d'animation, et il n'existe **aucun `SkinnedMesh`** — il coûterait un appel d'affichage par zombie, soit soixante ([chapitre 10](10-l-architecture.md)).
21. Toutes les boîtes de tous les corps tiennent dans **un seul `InstancedMesh` de cubes unitaires** à couleur par exemplaire : passer de six à quatorze boîtes ne coûte **aucun** appel d'affichage.
22. Chaque personnage porte une **tache** : un quad sombre posé à plat sous lui, et **tous les personnages n'en coûtent qu'un seul appel d'affichage**.
23. La tache **ne s'oriente pas, ne s'étire pas, et ne dépend ni du soleil ni de la hauteur** : ce n'est pas une ombre, c'est ce qui la remplace.
24. **Rien d'autre qu'un personnage ne porte de tache** — ni un canon, ni une pièce, ni un bâtiment.

**L'éclat**

25. L'**éclat** — un petit cube d'**un quart de bloc** — est la **seule primitive d'effet** du jeu.
26. **Tout effet ponctuel est un nuage d'éclats** : aucun sprite, aucun billboard, aucun shader dédié, aucune transparence.
27. Un **seul `InstancedMesh`** les porte tous, sur un **pool fixe de 600** alloué au chargement, sans aucune allocation dans la boucle ([chapitre 10](10-l-architecture.md)).
28. Un éclat **s'efface en s'éclaircissant vers le blanc**, jamais en se dissolvant.
29. En cas de saturation du pool, la priorité est **mort > mire > traînée > décoratif**.
30. La **mort d'un zombie** éjecte la tête en tournoyant et disperse le corps en une dizaine d'éclats **à la couleur du type**, effacés en **0,6 s** ([chapitre 3](03-les-zombies.md)).
31. La **fauchée** est un **arc blanc** d'éclats opaques, effacé en **150 ms** ([chapitre 4](04-le-joueur.md)).
32. Le **boulet est un éclat noir** — la seule chose noire en vol : il n'a ni géométrie propre, ni appel d'affichage propre ([chapitre 5](05-les-canons.md)).
33. Sa **traînée** est faite de **4 éclats noirs** qui s'espacent derrière lui.
34. La **mire** est faite de **4 éclats noirs** posés à plat aux quatre coins du point de chute, qui **se resserrent** pendant la descente : c'est elle, et non le projectile, qui rend la cloche lisible.
35. La **pièce** est un éclat jaune **cerné de noir**, qui tourne avant d'être aspiré vers le joueur ([chapitre 6](06-l-argent.md)).
36. Tout ce qui **encaisse un coup** — un zombie, un bloc de la mairie, un canon — jette une **bouffée d'éclats blancs** et **s'éclaire en blanc pendant 80 ms**.
37. Le **versement de fin d'assaut** est une **gerbe d'éclats** depuis la mairie ([chapitre 6](06-l-argent.md)).

**Le jet de feu**

38. Le jet de feu est le **seul effet continu** du jeu, donc le seul qui ne soit pas fait d'éclats : un **cône instancié attaché au canon**, une instance par canon qui brûle, l'**échelle portant la longueur**.
39. Le feu de ce jeu est **toujours blanc-bleu** : son état se lit à la **longueur** de la flamme, jamais à sa couleur ([chapitre 5](05-les-canons.md)).

**Les trois dégâts, sans un mot**

40. La **mairie** : un cube détaché à chaque coup, un morceau tombé à chaque segment perdu, et l'éclair blanc de 80 ms sur le bloc touché ([chapitre 6](06-l-argent.md)).
41. Le **joueur touché** : un clignotement blanc à **2 Hz pendant 1 s**, puis le même **accéléré à 6 Hz** la seconde suivante — deux états, un seul signal ([chapitre 4](04-le-joueur.md)).
42. Le **canon au sol** perd des blocs, définitivement, et **ne clignote pas** : c'est sa silhouette qui dit son usure ([chapitre 5](05-les-canons.md)).

**La planche**

43. Le jeu ne charge qu'**une seule image** : la planche, `public/atlas.png`, **128 × 128 pixels** ([chapitre 10](10-l-architecture.md)).
44. Elle porte **treize tuiles de 16 × 16**, et **elles habillent toutes du bâti** : `street`, `square`, `halo`, `wall`, `cornice`, `ladder`, `roof4`, `roof6`, `roof8`, `townHall`, `townHallRoof`, `base`, `outskirts`.
45. **Ce qui n'y est pas ne sera jamais peint** : l'inventaire est clos.
46. La grille est de **4 × 4 cases de 32 pixels**, et chaque tuile est entourée d'une **marge de 8 pixels**.
47. La marge est **cyclique** : elle reprend le **bord opposé** de la tuile — les huit colonnes de droite deviennent la marge de gauche, et de même en haut et en bas.
48. Chaque bloc porte ses **propres coordonnées de 0 à 1 dans sa case** : la tuile se répète bloc par bloc, jamais en travers de plusieurs blocs.
49. Les **trois cases libres** sont peintes en **magenta franc**.
50. Le filtrage tient en **deux réglages distincts** : **`magFilter: nearest`** et **`minFilter: nearestMipmapLinear`**.
51. Une tuile **déclare son plan** : le **dégradé vertical** ne va qu'aux tuiles de façade ; les tuiles horizontales n'ont que le **grain**.
52. **Aucune tuile n'est cernée**, et aucune ne porte d'occlusion peinte.
53. Un **toit est une terrasse** — on y marche, on y pose un canon : quatre dalles de 8 × 8, joints creusés, gravier par-dessus, et jamais un motif de toiture en pente.
54. Les **trois tuiles de toit sont une rampe de valeur** — **77,6 / 102,7 / 134,9** pour 4, 6 et 8 blocs — et cette lecture tient à la **valeur seule, jamais à la teinte**.
55. Un **étage fait 2 blocs** : `wall` est l'allège, `cornice` porte la **fenêtre et la moulure qui la coiffe** — donc une fenêtre et une corniche par étage, jamais par bloc ([chapitre 2](02-la-ville.md)).
56. La **fenêtre est un trou sombre et chaud**, jamais un reflet du ciel.
57. La **mairie s'abîme en perdant des blocs**, jamais en changeant de tuile : il n'existe **aucune tuile de fissure**.

**Le script qui l'engendre**

58. La **source de vérité est le script versionné, pas le PNG** : `public/atlas.png` est un **produit de compilation**, engendré et commité pour que le jeu se serve seul, et **jamais retouché à la main**.
59. Le script **sème son hasard** — un générateur pseudo-aléatoire dont la graine est dérivée de l'identifiant de la tuile —, donc la planche est **reproductible à l'octet**.
60. Le **test de garde compare l'atlas engendré à celui qui est commité** ([chapitre 10](10-l-architecture.md)).
61. L'**ordre des tuiles dans la grille n'a aucune conséquence** tant que le script le tient : c'est lui qui donne à chaque tuile sa case.
62. **Aucun fichier d'image n'est importé** : ni texture, ni modèle, ni planche libre du web — le langage visuel s'emprunte, les fichiers jamais ([chapitre 1](01-la-partie.md)).

## Les chiffres

### La lumière

| Grandeur | Valeur |
|---|---:|
| Hauteur du soleil au-dessus de l'horizon | **60°** |
| Lumières directionnelles | **1**, fixe |
| Lumières d'ambiance | **1**, violette |
| Lumières ponctuelles | **0** |
| Ombres portées | **0** |
| Variations d'ambiance dans une partie | **0** |

### Les treize tuiles

| Identifiant | Ce qu'elle habille | Plan | Couleur de base |
|---|---|---|---|
| `street` | le sol des trois rues, sans trottoir | horizontal | sol de rue |
| `square` | le sol de la place | horizontal | sol de place |
| `halo` | le même pavé, **repeint** sur l'emprise du halo | horizontal | halo du tapis |
| `wall` | l'allège : le bloc plein de chaque étage | vertical | mur |
| `cornice` | le haut de l'étage : la fenêtre et sa moulure | vertical | mur |
| `ladder` | l'échelle, au milieu de la façade de rue | vertical | mur, montants en bois de la base |
| `roof4` | le toit d'un bâtiment de 4 blocs | horizontal | toit bas |
| `roof6` | le toit d'un bâtiment de 6 blocs | horizontal | toit moyen |
| `roof8` | le toit d'un bâtiment de 8 blocs | horizontal | toit haut |
| `townHall` | la pierre de la mairie | vertical | pierre de la mairie |
| `townHallRoof` | le toit de la mairie | horizontal | toit de la mairie |
| `base` | le bois du hangar de la base | vertical | bois de la base |
| `outskirts` | l'extérieur, au-delà des fronts bâtis | horizontal | extérieur |

Treize tuiles, **toutes du bâti** : ni un corps, ni un canon, ni une pièce n'en porte.

### La rampe de valeur des toits

| Tuile | Hauteur du bâtiment | Valeur moyenne | Portée du boulet |
|---|---:|---:|---:|
| `roof4` | 4 blocs | **77,6** | 15 |
| `roof6` | 6 blocs | **102,7** | 16,5 |
| `roof8` | 8 blocs | **134,9** | 18 |

C'est une **information de jeu** : sans ombre portée, rien d'autre que la tuile ne dit qu'un toit domine son voisin, donc qu'un canon y portera plus loin ([chapitre 5](05-les-canons.md)).

### La planche

| Grandeur | Valeur |
|---|---:|
| Images chargées par le jeu | **1** |
| Tuile | **16 × 16 px** |
| Grille | **4 × 4** cases |
| Case | **32 × 32 px** |
| Marge autour d'une tuile | **8 px**, cyclique |
| Planche | **128 × 128 px** |
| Tuiles peintes | **13** |
| Cases libres, en magenta franc | **3** |
| `magFilter` | `nearest` |
| `minFilter` | `nearestMipmapLinear` |
| Niveaux de mipmap que la marge de 8 couvre | **3** |
| Échelle de lisibilité de référence | **×3** — un bloc à l'écran en jeu |

### La palette de la ville — chaude, et seule à porter une tuile

| Rôle | Code |
|---|---|
| Sol de rue | `#6d5344` |
| Sol de place | `#a98761` |
| Halo du tapis | `#d9bb8c` |
| Mur | `#b17c52` |
| Toit bas | `#7a3a2e` |
| Toit moyen | `#a2553d` |
| Toit haut | `#c8804f` |
| Pierre de la mairie | `#e8cba0` |
| Toit de la mairie | `#3d2118` |
| Bois de la base | `#6e4526` |
| Extérieur | `#8a7c4a` |

### La palette de ce qui se joue — froide ou saturée, et unie

| Rôle | Code |
|---|---|
| Métal du canon | `#57616b` |
| Tunique du joueur | `#1f6fd8` |
| Peau du joueur | `#f4c79a` |
| Acier de l'épée | `#f2f6f9` |
| Traînard | `#7ec24a` |
| Sprinteur | `#b6ff3d` |
| Costaud | `#9b6bff` |
| Colosse | `#ffd24a` |
| Portique de la rue 1 | `#5fd8f2` |
| Portique de la rue 2 | `#f25fd8` |
| Portique de la rue 3 | `#e8f25f` |

Aucun rouge n'y figure, et il n'en existe pas ailleurs.

### Les éclats

| Grandeur | Valeur |
|---|---:|
| Taille d'un éclat | **¼ de bloc** |
| Pool, alloué au chargement | **600** |
| Pic calculé à la vague 10 | ≈ **370** |
| Priorité en cas de saturation | mort > mire > traînée > décoratif |
| Objets translucides | **0** |
| Systèmes instanciés d'effet | **2** — les éclats, les flammes |

### Ce que chaque effet consomme

| Effet | Éclats | Ce qui l'efface |
|---|---|---|
| Mort d'un zombie | ≈ 10, plus la tête éjectée | 0,6 s |
| Fauchée | l'arc | 150 ms |
| Boulet en vol | 1 | l'impact, après 0,6 s de vol |
| Traînée du boulet | 4 | l'impact |
| Mire au sol | 4 | l'impact |
| Pièce | 1 | le ramassage, ou la fin de l'assaut |
| Coup encaissé | une bouffée | 80 ms |
| Versement de fin d'assaut | une gerbe | — |
| **Jet de feu** | **aucun** — c'est un cône instancié | l'extinction |

### Les signaux blancs

| Ce qui se passe | Signal | Durée |
|---|---|---:|
| Un zombie encaisse sans mourir | éclair blanc sur ses boîtes | 80 ms |
| Un bloc de la mairie encaisse | éclair blanc sur le bloc | 80 ms |
| Un canon encaisse | bouffée d'éclats blancs | — |
| Le joueur est étourdi | clignotement blanc à **2 Hz** | 1 s |
| Le joueur est invulnérable | le même, à **6 Hz** | 1 s |

### Ce que les quatorze boîtes coûtent

| | Matrices écrites par image | Temps processeur | Part d'une image à 60 Hz |
|---|---:|---:|---:|
| 6 boîtes × 60 zombies | 360 | 0,053 ms | 0,3 % |
| 10 boîtes × 60 zombies | 600 | 0,105 ms | 0,6 % |
| **14 boîtes × 60 zombies** | **840** | **0,129 ms** | **0,8 %** |

Aucune de ces trois lignes ne coûte un appel d'affichage de plus : la différence est du **temps processeur**, et elle est négligeable.

### Le budget de la scène la plus chargée

| | Appels d'affichage |
|---|---:|
| Ville + 60 zombies + 24 canons, sans aucune ombre portée | 30 |
| La tache, tous personnages confondus | +1 |
| **Total** | **31** |
| *Budget* ([chapitre 10](10-l-architecture.md)) | *≤ 80* |

L'enrichissement des personnages n'en prend **aucun** ; la tache en prend **un**. C'est l'écart entre ce qui est gratuit et ce qui se paie qui a décidé du reste : seize types d'objets de décor auraient coûté dix-sept appels, trente-deux en auraient coûté trente-trois.

## Les interdits

- **Jamais une ombre portée** — ni du soleil, ni d'un objet, ni sous un personnage : elles coûtaient 22 appels d'affichage sur 30, et sans elles le budget tombe de 65 % à 37 %. C'est le plus gros gain de performance du projet, et il est acquis par une décision de direction artistique.
- **Jamais une lumière ponctuelle** — chacune coûte six faces de carte d'ombre, et une ambiance faite de halos ne tiendrait pas dans le budget ([chapitre 10](10-l-architecture.md)).
- **Jamais une variation d'heure, de ciel ou de météo** — l'heure est unique et figée ; c'est le prix accepté de cette direction artistique, payé une fois pour toutes.
- **Jamais un effet orange** — sur une ville chaude noyée de brume chaude, l'orange est la couleur du décor : un effet orange serait invisible au moment précis où il doit se voir.
- **Jamais un rouge, nulle part** — il se noie sur des toits rouge-brun, et depuis que la barre de la mairie est marron le jeu n'en a plus aucun ; c'est la seule façon dont l'interdit tienne sans exception.
- **Jamais un cerne ailleurs que sur ce qui se ramasse** — un cerne noir veut dire « prends-moi », et il ne le dit que s'il n'entoure rien d'autre que la pièce et la bombe de feu.
- **Jamais une transparence** — le fragment est la ressource rare, un fondu translucide se mélange mal avec la brume, et l'opacité générale est ce qui laisse le tampon de profondeur ranger la scène tout seul.
- **Jamais un sprite, jamais un billboard, jamais un système de particules** — l'éclat est la primitive unique, et il est un cube comme le reste du jeu.
- **Jamais un objet de décor** — ni lampadaire, ni caisse, ni banc, ni auvent, ni jardinière, ni cheminée : le canon reste la seule chose qui s'ajoute à la ville ([chapitre 2](02-la-ville.md)).
- **Jamais une tuile sur un corps ou sur un canon** — ce qui bouge et ce qui se pose porte une couleur d'exemplaire, sans quoi la règle de température perd son autre moitié.
- **Jamais une occlusion peinte dans la tuile** — elle est partie avec le reste de l'enrichissement du décor ; la tuile n'a que son dégradé et son grain.
- **Jamais un dégradé vertical sur une tuile horizontale** — sur un sol il devient un dégradé *dans le plan* du sol, et la répétition en fait des bandes.
- **Jamais une variante de façade** — le mur est une tuile unique, et c'est le profil des hauteurs qui donne son rythme à une rue ([chapitre 2](02-la-ville.md)).
- **Jamais une tuile de fissure** — une silhouette qui s'effrite se lit du fond d'une rue, une fissure de 16 × 16 non.
- **Jamais une fenêtre froide** — 87 bâtiments de fenêtres qui reflètent le ciel dilueraient le seul repère de température du jeu.
- **Jamais un clignotement sur un canon** — un canon usé est visiblement plus petit et plus troué ([chapitre 5](05-les-canons.md)) ; un clignotement dirait « attention » là où la silhouette dit déjà « regarde-moi, je rétrécis ».
- **Jamais une hauteur de toit lue à la teinte** — la rampe est une rampe de **valeur**, pour qu'elle survive à une vision des couleurs atypique.
- **Jamais un `SkinnedMesh`, jamais un fichier d'animation** — l'un coûte un appel d'affichage par zombie, l'autre un asset à produire ; les corps s'animent par le calcul.
- **Jamais une planche dessinée à la main, jamais un PNG retouché** — le PNG est un produit de compilation, et c'est le script qui se relit, se compare et se rejoue.
- **Jamais un fichier d'image importé** — aucune planche libre du web ne contient une façade de ville cubique, un toit de niveau 8 ni un halo de rue ravitaillée, et la repeindre à notre palette reviendrait à l'avoir dessinée.
- **Jamais une case d'atlas laissée vide en noir ou en transparent** — elle est magenta franc : un oubli doit hurler.
- **Jamais une marge étirée** — elle reprend le bord opposé, sans quoi le raccord entre deux blocs voisins se verrait et une tuile baverait sur sa voisine au premier niveau de mipmap.
- **Jamais un `magFilter` linéaire, jamais un `minFilter` sans mipmap** — le premier flouterait le bloc sous le nez du joueur, le second ferait scintiller le fond d'une rue à chaque pas de caméra.
- **Jamais une quatorzième tuile ajoutée sans passer par ici** — l'inventaire est clos, et il se rouvre par une PR sur ce chapitre, jamais par un ajout au script.
- **Jamais un effet qui prenne la brume** — un canon lointain embrumé paraîtrait éteint ; l'entorse au réalisme est assumée, au service de la lecture.

## Pourquoi

**Pourquoi l'heure orange n'est plus une heure.** Elle a été retenue rasante, un soleil couchant à 30° et des ombres longues en travers de la place. Mesurée dans la ville, cette inclinaison mettait **toute la place à l'ombre de l'anneau** : les toits restaient chauds et le sol jouable devenait froid et violacé — exactement l'inverse du principe qui la justifiait. Le soleil est donc monté à **60°**, et il ne projette plus rien du tout. Ce qui reste d'elle est ce qui comptait : la palette chaude, la brume orange, l'ambiante violette et le contraste de température. Ce qui est parti est le soleil couchant, les ombres longues, et l'ombre comme repère de relief. Le nom lui reste de sa palette, pas d'une heure du jour.

**Pourquoi supprimer les ombres portées était le meilleur marché du projet.** La scène la plus chargée que le jeu produira — 60 zombies vivants, 24 canons posés — coûtait **52 appels d'affichage** avec les ombres et **30** sans, pour le double de triangles. Sur un budget de 80, on passe de 65 % à 37 %. Aucune optimisation de code n'aurait rendu cela, et il a suffi d'une décision de direction artistique. C'est aussi ce qui a rendu possible tout le reste du chapitre : les quatorze boîtes des corps, les 600 éclats, les 24 canons tiennent dans la marge que les ombres occupaient.

**Pourquoi la température, et non la saturation.** Un décor orange et saturé ne laisse aucune place à un repère plus saturé encore : la couleur est déjà pleine. Ce qui reste disponible est le **froid**, dont la ville ne dispose nulle part. Un portique cyan, une tunique bleue, un jet blanc-bleu se voient donc du fond d'une rue sans rien coûter, et l'enfant n'a rien à apprendre : ce qui est froid se joue, ce qui est chaud est du décor. La règle a une seconde moitié, arrivée avec la planche : **la ville est texturée, ce qui bouge et ce qui se pose est uni**. Un corps sans tuile ne peut pas se confondre avec un mur, même à la limite de la brume.

**Pourquoi le blanc, le noir et le mouvement.** L'interdit de l'orange laissait les effets sans couleur. Trois canaux restaient, et ce sont ceux dont le décor ne dispose pas : la **valeur**, parce que le blanc pur et le noir mat n'existent nulle part dans la ville ; le **mouvement**, parce que le décor est figé ; la **température**, déjà acquise. D'où la grammaire complète du jeu en une ligne : **le blanc dit « ça vient de se passer », le noir dit « ceci se ramasse, ou va tomber ici »** — et c'est vrai de l'éclair du zombie touché, de la bouffée du canon encaissant, du boulet en vol, de la mire au sol et du cerne de la pièce, sans qu'aucune de ces choses ait eu besoin d'une couleur à elle.

**Pourquoi le rouge n'existe nulle part.** L'argument n'est pas la réservation, c'est la lisibilité : le rouge se noie sur une ville de toits rouge-brun. Il n'a donc de valeur d'alerte nulle part dans le monde. Il aurait pu survivre dans le bandeau, qui a son propre fond — mais la barre de la mairie est passée au marron, et le jeu s'est retrouvé sans un seul rouge. Le Sprinteur, qui en portait un, est passé au **vert vif saturé** : il reste dans la famille verte du Traînard et s'en détache par la saturation et la taille, ce qui est précisément ce qui le caractérise. L'interdit tient enfin **sans exception**, ce qui est la seule forme sous laquelle un interdit s'applique tout seul.

**Pourquoi tout est opaque, et pourquoi ça ne se négocie pas.** Trois raisons se rejoignent. Le **fragment est la ressource rare** à `setPixelRatio(1)` en plein écran. Un fondu translucide **se mélange mal avec la brume**, qui est elle-même un fondu. Et surtout : l'opacité générale est ce qui laisse le **tampon de profondeur** ranger la scène à lui seul. L'alternative se connaît, et elle est piégeuse : dès qu'il faut ranger les objets soi-même, un tri sur `x + y + z` devient faux sitôt que deux boîtes n'ont pas la même taille, et un tri par objet fait ressortir la corniche de la mairie par-dessus son propre toit — entre deux boîtes d'un même objet, la relation « devant » boucle. Le jeu n'a pas ce problème parce qu'il ne range rien lui-même ; il ne range rien parce que rien n'est translucide. Un seul effet semi-transparent ramènerait le tri entier.

**Pourquoi quatorze boîtes, et pourquoi la ville reste nue.** Les deux décisions sont la même, prise devant trois densités de la même rue. On croyait que passer les personnages de six à dix boîtes coûterait quatre appels d'affichage : **il n'en coûte aucun**, ni à dix, ni à quatorze — toutes les boîtes de tous les corps tiennent dans un seul `InstancedMesh` à couleur par exemplaire. Le coût réel est du temps processeur, **0,129 ms par image pour 840 matrices**, soit 0,8 % d'une image à 60 Hz. Les objets de décor, eux, coûtent **un appel d'affichage par type** — dix-sept pour seize types, trente-trois pour trente-deux. Les personnages sont donc gratuits et le décor se paie : tout l'enrichissement est allé aux corps, et la ville n'a pas bougé d'un cran. Le vrai coût du décor n'était d'ailleurs pas le processeur graphique, c'était la **production** : chaque objet est un maillage à composer et une tuile à dessiner à la main, sans studio derrière. **La rue restera un couloir de blocs, et c'est assumé** — en échange, plus aucun objet décoratif ne peut se confondre avec une pièce, une bombe ou un Sprinteur, parce qu'il n'y en a aucun. Le charme viendra des corps, pas des rues.

**Pourquoi la tache, seul enrichissement non-personnage retenu.** Sans ombre portée, un corps à quatorze boîtes **flotte**. La tache est retenue parce qu'elle appartient au personnage, pas au décor : elle coûte **un** appel d'affichage pour tous, elle ne s'oriente pas, elle ne dépend ni du soleil ni de la hauteur. Ce n'est pas une ombre — c'est ce qui la remplace, et rien d'autre qu'un personnage n'en porte, faute de quoi elle redeviendrait un système d'ombres à budgéter.

**Pourquoi treize tuiles, et pas les douze de la première planche.** Trois sont sorties — le métal du canon, la peau du Traînard et l'or du Colosse — le jour où tous les corps et le canon sont passés dans un seul `InstancedMesh` : ils portent une couleur d'exemplaire, pas une image. Une est entrée, et elle n'était pas négociable : la **corniche**. Il en faut une tous les 2 blocs pour compter la hauteur d'un bâtiment depuis la rue ; si la tuile de mur la portait, il y en aurait une par bloc. Deux tuiles alternées coûtent une case et règlent la question — `wall` est l'allège, `cornice` porte la fenêtre et la moulure qui la coiffe, et l'étage devient lisible.

**Pourquoi la rampe de valeur des toits est une information de jeu et non un choix esthétique.** La hauteur d'un toit est la mécanique centrale du canon : elle majore la portée du boulet et met le canon hors d'atteinte. Sans aucune ombre portée, **rien d'autre que la tuile** ne peut dire qu'un toit domine son voisin. D'où les trois valeurs moyennes — 77,6, 102,7, 134,9 — croissantes avec la hauteur, et le fait que la lecture tienne à la valeur **seule** : un enfant qui distingue mal les teintes lit quand même la rampe, et un joueur sur un toit de 6 voit d'un coup d'œil lesquels de ses voisins sont à 4 et lesquels à 8.

**Pourquoi un toit est une terrasse.** La première planche donnait aux toits un motif de rangs décalés — celui d'une toiture *en pente vue de côté*. Appliqué à une surface sur laquelle on marche et on pose un canon, il en faisait un mur de brique posé à plat, et la ville entière se lisait comme un empilement de façades. Quatre dalles de 8 × 8, joints creusés et gravier par-dessus : la terrasse redevient une terrasse, et le gravier est ce qui l'empêche de faire carrelage à ×3. C'est le genre d'erreur qu'on ne voit qu'en appliquant les tuiles sur une rue, jamais en les regardant côte à côte.

**Pourquoi une tuile déclare son plan.** Le dégradé vertical n'a de sens que sur une **façade**, où il imite la lumière qui décroît vers le sol. Sur un sol, c'est un dégradé *dans le plan* du sol : répété d'un bloc à l'autre, il fait des bandes, et la rue entière devient une tapisserie. Chaque tuile porte donc son plan, et les horizontales n'ont que le grain.

**Pourquoi la marge est cyclique, et pourquoi elle fait huit pixels.** Une marge qui étire le bord règle le bleeding et casse le raccord ; une marge qui **reprend le bord opposé** règle les deux d'un coup. Comme chaque bloc porte ses propres coordonnées de 0 à 1 dans sa case, le raccord entre deux blocs voisins devient invisible, *et* une tuile ne peut plus baver sur sa voisine quand le mipmap descend. Huit pixels tiennent jusqu'au **troisième niveau de mipmap** — bien au-delà de ce qu'un bloc atteint au fond d'une rue de 80.

**Pourquoi deux filtrages distincts.** `magFilter: nearest` garde franc le bloc sous le nez du joueur, ce qui est tout le style. Mais sans mipmap, une tuile qui couvre trois pixels au fond d'une rue **scintille à chaque pas de caméra** — d'où `minFilter: nearestMipmapLinear`. Les deux réglages ne se déduisent pas l'un de l'autre et il fallait écrire les deux ; c'est la marge cyclique qui rend le second inoffensif.

**Pourquoi la source de vérité est le script.** Un PNG ne se relit pas, ne se compare pas, et se périme au premier retouchage. Un script semé est **reproductible à l'octet**, donc vérifiable par un test : le test de garde compare l'atlas engendré à celui qui est commité, et un PNG modifié à la main devient une erreur rouge. C'est aussi ce qui permet de reprendre la planche entière devant l'enfant et de la revoir en secondes — treize tuiles de 16 × 16 font 2 560 pixels en tout, le coût n'est pas dans le dessin mais dans les décisions de couleur, et celles-là sont prises.

**Pourquoi aucune planche libre du web n'aurait convenu.** La question a été cherchée pour de vrai. Quatre faits l'ont fermée. L'**inventaire à peindre n'existe nulle part** : les planches libres sont des planches de monde naturel — pierre, terre, bois, sable —, et aucune ne contient une façade de ville cubique, un toit de niveau 8 ni un halo de rue ravitaillée. La **palette reteindrait chaque pixel importé**, puisque le contraste chaud/froid est une règle de jeu et non un filtre : reteinter une planche étrangère jusque-là, c'est l'avoir repeinte sans avoir gagné de temps. **Ce qui fait le joli de ce jeu n'est pas dans les tuiles** mais dans sa lumière — pas d'ombre portée, soleil fixe, ambiante violette, brume, tache —, et de belles tuiles étrangères y apporteraient chacune leur propre lumière peinte, en désaccord avec la seule du jeu. Et la **voie du script était déjà éprouvée** sur ce dépôt. Ce qui s'emprunte, en revanche, est une **discipline de palette** : les rampes chaudes et froides des palettes de référence du pixel art ont servi à caler les nôtres, sans qu'un seul pixel en soit repris.

**Pourquoi les trois cases libres sont magenta.** Une case oubliée doit **hurler**. En noir ou en transparent, une tuile manquante ressemble à une ombre ou à un trou de lumière — c'est-à-dire à quelque chose que ce jeu pourrait vouloir. En magenta franc, elle ne ressemble à rien de ce jeu, et l'erreur se voit à la première image.

**Pourquoi le canon ne clignote pas alors que le joueur clignote.** Les deux signaux diraient la même chose et ne servent pas au même moment. Le joueur touché a besoin d'un **événement** : c'est arrivé, maintenant, et il faut le voir en une fraction de seconde même quand il est petit à l'écran et de dos. Un canon usé porte un **état** durable, et un état se lit mieux sur la forme : il est visiblement plus petit et plus troué, et il le reste jusqu'à l'amélioration. Un clignotement permanent sur un canon dirait « attention » en continu, ce qui ne se distingue plus d'un décor.

## D'où ça vient

[#12](https://github.com/ben-barbier/apocalypse-zombie/issues/12) pour l'heure orange retenue contre le plein jour voilé et le ciel bas — la palette chaude, l'ambiante violette, la brume structurelle, le contraste de température, le dégradé vertical et le grain sans cerne, la lisibilité à ×3, et l'exigence d'aucun asset copié. [#14](https://github.com/ben-barbier/apocalypse-zombie/issues/14) pour ce qui la rectifie : le **soleil à 60°** et la **disparition de toute ombre portée**, avec les 30 appels d'affichage qui en sortent. [#23](https://github.com/ben-barbier/apocalypse-zombie/issues/23) pour la règle « l'orange appartient au décor », les trois canaux de lecture, le blanc et le noir de l'action, l'**éclat** comme primitive unique et son pool de 600 avec sa priorité, le boulet-éclat, la traînée, la mire, la pièce cernée, l'arc de la fauchée, le refus de toute transparence, le jet de feu blanc-bleu en cône instancié, les effets qui ne prennent pas la brume, et le rouge disqualifié dans le monde. [#29](https://github.com/ben-barbier/apocalypse-zombie/issues/29) pour la ville restée à la densité 1 et les personnages passés à **quatorze boîtes**, le coût mesuré des boîtes et des objets de décor, la **tache**, le Sprinteur au vert vif saturé, et le refus de l'occlusion peinte. [#38](https://github.com/ben-barbier/apocalypse-zombie/issues/38) pour l'inventaire clos des treize tuiles, la grille 4 × 4 à marge cyclique de 8, la planche de 128 × 128, les deux filtrages, la rampe de valeur des toits, le toit-terrasse, la fenêtre sombre et chaude, le plan déclaré par la tuile, les trois cases magenta, le script versionné comme source de vérité et l'enquête sur les planches libres du web. [#15](https://github.com/ben-barbier/apocalypse-zombie/issues/15) pour les trois tuiles de toit et la corniche tous les 2 blocs, exigées parce qu'elles portent une information de jeu, et pour la barre de la mairie passée au marron qui achève le rouge. [#27](https://github.com/ben-barbier/apocalypse-zombie/issues/27) pour le mur en tuile unique et la rue sans trottoir. [#7](https://github.com/ben-barbier/apocalypse-zombie/issues/7) pour la désintégration en cubes et la pièce qui jaillit. [#4](https://github.com/ben-barbier/apocalypse-zombie/issues/4) pour l'interdiction des lumières ponctuelles et le budget qui l'impose. [#13](https://github.com/ben-barbier/apocalypse-zombie/issues/13) pour la planche unique en `public/atlas.png` et les deux systèmes instanciés d'effet.
