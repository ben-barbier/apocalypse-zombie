# Les canons

Ce chapitre décide la seule chose que le joueur pose : les trois niveaux du canon, la pose et l'amélioration là où l'on se tient, le losange et le liseré qui les annoncent, le boulet en cloche et sa portée majorée par la hauteur, le jet de feu, la visée, l'usure d'un canon au sol — et pourquoi il n'y aura jamais une seconde construction. Le terrain sur lequel il se pose est au [chapitre 2](02-la-ville.md), ce qu'il vise au [chapitre 3](03-les-zombies.md), la main qui le pose et les bombes qui le nourrissent au [chapitre 4](04-le-joueur.md).

## Les règles

**Ce qu'est un canon**

1. Le canon est la **seule construction du jeu** : rien d'autre ne se pose, rien d'autre ne se bâtit, et cette décision est définitive pour la v1.
2. Il a **trois niveaux**, linéaires et sans embranchement : on n'y choisit jamais entre deux voies, et il n'y en aura jamais un quatrième.
3. Un canon porte **une arme au niveau 1, deux aux niveaux 2 et 3** : le **boulet** à tous les niveaux, le **jet de feu** à partir du niveau 2.
4. Le **niveau 3 est exactement le niveau 2, ravitaillé tout seul** par un tapis roulant ([chapitre 4](04-le-joueur.md)) : aucun bonus de portée, de cadence ni de dégâts — la récompense finale est le confort, pas la puissance.
5. Les trois niveaux se lisent à la **silhouette**, à distance et sans surimpression : petit et gris pierre à tube court, moyen en cuivre et orange dont la soute montre ses **trois cases** qui se vident, grand avec le **tapis** qui court jusqu'à la base.
6. Aucune statistique de canon ne dépend de la vague, du nombre de canons posés ni de l'endroit : les chiffres de ce chapitre valent de la vague 1 à la dernière vague de la Rallonge.

**Poser**

7. On pose un canon **là où l'on se tient**, sous les pieds du joueur, en **0,3 seconde** — sur un toit comme au sol, place et rues comprises.
8. Il n'existe **aucune liste d'emplacements autorisés** : les 87 toits le sont tous, et toute cellule de sol praticable aussi ([chapitre 2](02-la-ville.md)).
9. **Aucun état de jeu ne bloque la pose** : on pose en préparation comme en plein assaut, un zombie à côté.
10. Un canon posé au sol **ne bloque jamais le déplacement d'un zombie** : aucune collision, jamais de barricade ([chapitre 3](03-les-zombies.md)).
11. **Trois blocs d'écart au minimum entre deux canons** — sous cette distance, on n'obtient jamais un canon de plus.
12. Un canon ne se **revend pas**, ne se **déplace pas** et ne se **détruit jamais volontairement**.

**Améliorer**

13. À **moins de 3 blocs** d'un canon, le second bouton **améliore celui-là** au lieu d'en poser un neuf : la même distance sert aux deux règles, et il n'existe donc **aucune zone morte** où l'appui ne ferait rien.
14. Améliorer **remet le canon entièrement à neuf** : c'est une réparation sans bouton de réparation.
15. À moins de 3 blocs d'un canon, **le versement de bombes passe avant l'amélioration** — le second bouton verse tant que le joueur porte au moins une bombe et que la soute n'est pas pleine, et améliore sinon ([chapitre 4](04-le-joueur.md)).
16. Le passage au **niveau 3 n'est possible que dans le halo** ([chapitre 2](02-la-ville.md)) — neuf toits sur 87, plus le sol qu'il couvre : dehors, l'amélioration s'arrête au niveau 2, définitivement.

**Le losange et le liseré**

17. Ce que fera le second bouton se lit sur un **losange posé au sol sous les pieds du joueur** : **blanc et large**, on pose ; **blanc, serré et pulsant**, on améliore ; **noir et élargi**, c'est impossible. Aucun mot, aucun chiffre.
18. Le losange est **noir** devant un canon de niveau 3, et devant un canon de niveau 2 hors du halo : il n'y a plus rien à améliorer.
19. Tant que le losange est sous les pieds du joueur, la **portée du boulet est peinte au sol en liseré**, de la couleur du losange.
20. Le losange et le liseré vivent **dans le monde et jamais dans le bandeau**, et ils disparaissent dès qu'on quitte l'emplacement : ce n'est pas l'état d'un canon, c'est la question qu'on est en train de se poser.

**Le boulet**

21. Le boulet est l'arme de **longue portée**, présente aux trois niveaux, à **munitions infinies** et sans aucun coût.
22. Sa portée vaut **12 blocs au sol**, majorée de **0,75 bloc par bloc de hauteur** du toit, et elle se mesure en **distance horizontale**.
23. Sa cadence est d'**un tir toutes les 2 secondes**, et elle ne change à aucun niveau.
24. Un boulet fait **1 coup d'épée** à **une seule cible** : il n'a **aucune zone d'effet**.
25. Le tir est **en cloche et le coup est garanti** : le boulet part vers la position anticipée de sa cible et le dégât s'applique à la date d'impact prévue, **0,6 seconde** après le départ, quelle que soit la distance.
26. Il n'existe **aucun test de collision ni aucun test de ligne de vue** sur un boulet en vol : c'est une interpolation entre deux points et une date.
27. Les dégâts **déjà en vol sont réservés** : un canon ne tire jamais sur un zombie que les boulets déjà partis vont tuer.
28. Si la cible meurt avant l'impact, **le boulet part quand même** et s'écrase au sol.
29. Il n'y a **aucune portée minimale** : un canon au sol qu'un zombie traverse tire à bout portant.

**Le jet de feu**

30. Le jet de feu est l'arme de **courte portée**, à partir du niveau 2 : un **cône de 60° sur 6 blocs**, orienté vers sa cible.
31. Sa portée se mesure en **distance réelle** et n'est **jamais majorée par la hauteur** : le feu est l'arme du sol et des toits bas.
32. Il est **continu** — ni projectile, ni tir, ni cadence : il brûle **tout** ce qui se trouve dans le cône, sans nombre maximum de cibles.
33. Il **ne s'allume qu'en présence d'un zombie dans son cône**, et il **ne consomme rien** tant qu'il ne brûle personne : une flamme allumée dit, à elle seule, qu'un zombie est là.
34. Alimenté, il fait **2 coups d'épée par seconde** ; à sec, **0,5** — et il **ne s'éteint jamais**.
35. Il consomme **1 bombe de feu toutes les 6 secondes** de jet alimenté ; la soute en tient trois, soit **18 secondes** ([chapitre 4](04-le-joueur.md)).
36. Son état se lit à la **longueur** de la flamme — courte à sec, longue alimentée —, **jamais à sa couleur** : le feu de ce jeu est toujours blanc-bleu.
37. **Aucun crachotement, aucun signal de panne** : un canon à sec n'est pas en avarie, c'est un canon qu'on n'a pas encore nourri.

**La visée**

38. Les deux armes visent le **zombie le plus avancé sur son rail** parmi ceux qui sont à leur portée, et rien d'autre.
39. L'avancement se compare **toutes rues confondues**, les trois rails mesurant les mêmes 92 blocs ([chapitre 2](02-la-ville.md)).
40. Les deux armes visent **indépendamment** : le boulet peut tirer au loin pendant que le jet brûle ce qui est au pied du canon.
41. Il n'y a **aucun ciblage par type** : le canon ne cherche jamais le Costaud plutôt que le Traînard.
42. La visée ne se règle pas, ne s'affiche pas et ne se commande pas : le joueur ne vise jamais un canon, il le place.
43. Un canon ne touche jamais le joueur, et le joueur n'abîme jamais un canon : il n'existe **aucun tir ami** ([chapitre 4](04-le-joueur.md)).

**L'usure au sol**

44. Un canon posé au sol vaut **20 coups de Traînard**, aux trois niveaux.
45. Un zombie qui passe à moins de **1,5 bloc** lui met **un coup au passage**, sans jamais s'immobiliser ([chapitre 3](03-les-zombies.md)).
46. Un canon posé sur un **toit est hors d'atteinte**, définitivement : il ne perd jamais un point de vie, donc ne perd jamais un bloc.
47. Il n'existe **aucune réparation, payante ou gratuite** : la seule remise à neuf est l'amélioration.
48. L'usure se lit **sur le canon lui-même** : une bouffée d'**éclats blancs** à chaque coup encaissé, et des **blocs qui tombent définitivement** à mesure que les points de vie descendent.
49. **Aucun clignotement, aucune couleur d'alerte, aucune surimpression** — un canon usé est visiblement plus petit et plus troué, et il le reste jusqu'à l'amélioration.
50. À zéro, le canon **disparaît** : sa soute est perdue, rien ne se ramasse, l'emplacement redevient libre immédiatement, et le tapis roulant qui le servait se rétracte vers la base en 1 seconde ([chapitre 4](04-le-joueur.md)).

**Le nombre**

51. Rien ne limite le nombre de canons **sauf le prix** : aucun plafond, aucun emplacement réservé, aucun compteur nulle part (chapitre 6).
52. Le pool est de **24 canons**, alloué au chargement : c'est une **borne technique** que l'économie rend inatteignable, jamais une règle de jeu, et le code n'a rien à défendre.
53. Le tir simultané de plusieurs canons ne produit jamais plus de **4 sons à la fois**, avec **60 ms** de garde entre deux (chapitre 9).

## Les chiffres

### Les trois niveaux

| Niveau | Boulet | Jet de feu | Ravitaillement | Ce qu'on voit |
|---:|---|---|---|---|
| **1** | oui | — | — | petit, gris pierre, tube court |
| **2** | oui | oui | à la main, depuis la base | moyen, cuivre et orange, trois cases de soute qui se vident |
| **3** | oui | oui | **automatique**, par tapis roulant | grand, le tapis court jusqu'à la base |

Les prix — 40 pièces le canon, 60 le passage au niveau 2, 120 le passage au niveau 3 — appartiennent au chapitre 6.

### Le boulet

| Grandeur | Valeur |
|---|---:|
| Portée, au sol | 12 blocs |
| Majoration | +0,75 bloc par bloc de hauteur |
| Mesure de la portée | distance horizontale |
| Cadence | 1 tir / 2 s |
| Temps de vol | 0,6 s, constant |
| Dégâts | 1 coup d'épée |
| Cibles par tir | 1 |
| Zone d'effet | aucune |
| Portée minimale | aucune |
| Munitions | infinies |

### La portée selon la hauteur

| Emplacement | Hauteur | Portée du boulet |
|---|---:|---:|
| Sol — rue ou place | 0 | **12 blocs** |
| Toit de 4 | 4 | **15** |
| Toit de 6 | 6 | **16,5** |
| Toit de 8 | 8 | **18** |

C'est ce cercle-là que le liseré peint au sol, et c'est en montant que l'enfant le voit grandir.

### Le jet de feu

| Grandeur | Valeur |
|---|---:|
| Ouverture du cône | 60° |
| Portée | 6 blocs |
| Mesure de la portée | distance réelle |
| Majoration par la hauteur | aucune |
| Dégâts, alimenté | 2 coups d'épée / s |
| Dégâts, à sec | 0,5 coup d'épée / s |
| Cibles | tout ce qui est dans le cône |
| Consommation | 1 bombe / 6 s de jet alimenté |
| Soute ([chapitre 4](04-le-joueur.md)) | 3 bombes, soit 18 s |

### Ce que le jet atteint depuis un toit

Le cône se mesure en distance réelle : depuis un toit, la hauteur est déjà consommée par le trajet vertical.

| Depuis | Hauteur | Rayon utile au sol |
|---|---:|---:|
| le sol | 0 | **6 blocs**, pleine efficacité |
| un toit de 4 | 4 | **4,5 blocs** — la rue en fait 6, le rail passe en son milieu |
| un toit de 6 | 6 | **0** — le sol est exactement à la limite |
| un toit de 8 | 8 | **hors de portée** |

Un toit de 4 est donc le seul toit d'où le jet serve encore. Il y en a **huit par rue** — quatre par bord — et **les neuf du pourtour** de la place ([chapitre 2](02-la-ville.md)).

### La puissance d'un canon, cible dans les deux portées

| État | Coups d'épée par seconde |
|---|---:|
| Niveau 1 | **0,5** |
| Niveau 2 ou 3, à sec | **1,0** |
| Niveau 2 ou 3, alimenté | **2,5** |

Le ravitaillement multiplie la puissance par **2,5** sans jamais être obligatoire, et un canon de niveau 2 complètement à sec reste **deux fois** meilleur qu'un canon de niveau 1.

### L'usure au sol

| Grandeur | Valeur |
|---|---:|
| Points de vie, aux trois niveaux | 20 coups de Traînard |
| Distance du coup au passage | 1,5 bloc |
| Coup d'un Traînard / Sprinteur / Costaud / Colosse | 1 / 1 / 3 / 10 |
| Points de vie d'un canon de toit | sans objet — hors d'atteinte |
| Réparation | aucune |

Ce qu'un canon planté **sur le rail** encaisse en une vague, en supposant que toute la colonne le frôle — c'est la borne haute, et un canon posé à l'écart du rail ne s'use jamais :

| Vague | Rues actives | Ce qui descend une rue | Coups reçus |
|---:|---:|---|---:|
| 5 | 2 | 11 | **11** |
| 6 | 2 | 15 | **15** |
| 7 | 2 | 15 + 2 Costauds | **21** |
| 8 | 2 | 17 + 3 Costauds | **26** |
| 9 | 2 | 18 + 4 Costauds | **30** |
| 10 | 2 | 34, sans un seul Costaud | **34** |
| 10 | 2 | l'escorte et le Colosse, dans sa rue à lui | **28** |

Un canon planté sur le rail avant la vague 5 y encaisse onze coups et **meurt au milieu de la sixième** : deux vagues, la durée de vie visée. Le même, posé avant la neuvième, **ne passe pas une seule vague**. La fragilité augmente donc toute seule avec la difficulté, sans qu'aucun chiffre ne change avec le numéro de vague.

### Le nombre de canons

| Grandeur | Valeur |
|---|---:|
| Pool alloué au chargement | 24 |
| Plafond de jeu | aucun |
| Écart minimum entre deux canons | 3 blocs |
| Canons pour couvrir une rue ([chapitre 2](02-la-ville.md)) | 3 → 99 %, 4 → 100 % |
| Toits éligibles au niveau 3 ([chapitre 2](02-la-ville.md)) | 9 sur 87 |
| Projectiles en vol, 24 canons au rythme maximal | 7 sur 96 ([chapitre 10](10-l-architecture.md)) |

Le jet de feu **ne consomme aucun projectile** : c'est un cône et un test d'appartenance, pas un objet en vol.

## Les interdits

- **Jamais une seconde construction** — il ne reste aucun lieu pour elle : le second bouton n'a qu'un seul sens à un endroit donné, et poser, améliorer et renforcer la mairie ont déjà pris les trois seuls endroits qui existent.
- **Jamais un ralentisseur achetable** — goudron, glu, barricade : un zombie 25 % plus lent ne se voit pas à 8 ans ; et il *donnerait* du temps d'épée au lieu de substituer, ce qui pousserait la masse monétaire vers son plafond arithmétique. **Le seul ralentisseur du jeu est le joueur.**
- **Jamais un quatrième niveau, jamais un embranchement au niveau 2** — le losange « améliorer » devrait demander *en quoi ?*, et c'est la définition d'un menu.
- **Jamais un canon qui bloque un zombie** — il redeviendrait une barricade, et un assaut pourrait caler devant un mur de canons.
- **Jamais une zone d'effet sur le boulet** — un tir à cible unique et à dégât garanti se compte : huit boulets par traversée de Traînard, trois par Sprinteur, dix secondes de feu par Costaud. Une gerbe rendrait toute la table des vagues invérifiable.
- **Jamais un test de ligne de vue, jamais un test de collision sur un projectile** — le CPU JavaScript est la ressource rare, et un boulet doit rester une interpolation et une date.
- **Jamais un canon qui rate** — un Sprinteur file à 4 blocs/s : sans anticipation, tous les canons le manqueraient à partir de la vague 4, et un canon qui rate est incompréhensible à 8 ans.
- **Jamais un boulet qui vire en l'air** — si la cible meurt avant l'impact, le boulet s'écrase au sol : les munitions sont infinies, il n'y a rien à économiser, et l'honnêteté visuelle vaut mieux.
- **Jamais un ciblage par type, jamais une visée réglable** — une règle qu'un enfant ne peut pas prédire ne vaut pas mieux qu'un tirage au sort, et il n'y a pas de souris dans ce jeu.
- **Jamais un jet de feu qui s'éteint** — à sec il faiblit, il ne disparaît pas : un canon tout neuf qui tire moins bien que l'ancien serait inexplicable, et améliorer doit toujours être un bon achat.
- **Jamais une flamme allumée sans zombie dedans** — la flamme est un signal de présence lisible depuis l'autre bout de la place, et c'est gratuit.
- **Jamais un jet orange, jamais un clignotement rouge, jamais une barre au-dessus d'un canon** — l'orange appartient au décor, le rouge n'existe nulle part, et l'état d'un canon se lit sur le canon.
- **Jamais une revente, jamais un déplacement, jamais une destruction volontaire** — toute action destructive imposerait une confirmation, donc du texte à lire.
- **Jamais une réparation** — le canon au sol est un consommable assumé, et l'amélioration est la seule remise à neuf. La leçon se tire toute seule, en regardant : sur les toits, c'est éternel.
- **Jamais un canon de toit qui s'abîme** — l'intouchabilité est la contrepartie exacte de la portée courte du jet là-haut et du coût de la montée.
- **Jamais une zone morte entre poser et améliorer** — un appui qui ne fait rien ne s'explique pas sans texte ; c'est pourquoi les deux règles partagent la même distance de 3 blocs.
- **Jamais un plafond au nombre de canons, jamais un prix qui monte avec leur nombre** — l'argent est la seule limite, et il l'est par une propriété plutôt que par un seuil.
- **Jamais un compteur de canons dans le bandeau** — il n'y a pas de plafond, donc rien à compter.
- **Jamais un objet neuf pour rattraper l'équilibrage** — si la vague 10 ne tient pas, les leviers sont **la table** ([chapitre 3](03-les-zombies.md)), **les prix** (chapitre 6) et **la portée** de ce chapitre, jamais une construction de plus.

## Pourquoi

**Pourquoi le niveau 2 ajoute une arme au lieu d'en changer.** Un canon qui échangerait son boulet contre du feu serait un canon qu'on améliore et qui devient moins bon à distance : à 8 ans, c'est un achat qu'on regrette sans savoir pourquoi. En ajoutant, on obtient la propriété qui tient tout le reste — **améliorer n'est jamais un mauvais achat**, même quand on ne ravitaille jamais. Un canon de niveau 2 à sec fait 1 coup d'épée par seconde contre 0,5 pour un niveau 1 ; nourri, il en fait 2,5.

**Pourquoi le niveau 3 n'apporte que du confort.** Une troisième colonne de chiffres aurait été trois portées, trois cadences et trois dégâts à équilibrer, pour une lecture illisible. Le tapis roulant, lui, se voit d'un coup d'œil et se comprend sans un mot. Et il n'est pas modeste pour autant : depuis que la soute ne fait plus que trois cases, un canon de niveau 2 passe les deux tiers d'un assaut à sec quand un canon de niveau 3 n'y passe jamais — **l'écart entre les deux est un facteur 2,5 permanent**. On ne l'achète pas avec des pièces mais avec du temps, et le halo ne l'offre qu'à neuf toits sur 87 ([chapitre 2](02-la-ville.md)).

**Pourquoi la portée du jet ne monte pas avec la hauteur.** C'est la décision qui fait exister l'arbitrage sol / toit, et elle se lit dans le monde sans une ligne de texte. Le boulet est majoré par la hauteur, le jet ne l'est pas : **chaque hauteur a donc son arme**. Un canon de niveau 2 posé au sol contre une rue est l'arme la plus dévastatrice du jeu et fond en deux vagues ; le même sur un toit de 8 est éternel et n'a que son boulet ; un toit de 4 est le seul endroit qui garde les deux, ce qui en fait l'emplacement le plus disputé de la ville. **La puissance du feu se paie en exposition.**

**Pourquoi +0,75 par bloc, et pas un autre chiffre.** La majoration est calée pour que les trois hauteurs de bâtiment donnent **15, 16,5 et 18** contre 12 au sol — les portées sur lesquelles la table des vagues est chiffrée, et notamment les huit boulets qu'un Traînard encaisse en traversant ([chapitre 3](03-les-zombies.md)). Ce n'est pas un réglage de puissance, c'est ce qui garde le liseré éloquent : à une majoration plus faible, l'enfant grimperait et le cercle ne bougerait presque pas — or c'est tout ce qu'il a pour apprendre que la hauteur porte.

**Pourquoi le boulet touche toujours.** Trois raisons, et la troisième est la plus lourde. Un Sprinteur à 4 blocs/s serait manqué systématiquement sans anticipation, et un canon qui rate est incompréhensible. La cloche justifie visuellement le tir par-dessus les fronts bâtis, que la portée horizontale autorise de toute façon. Et surtout : un coup garanti supprime **tout** calcul de collision et de ligne de vue sur les projectiles — un boulet devient deux points et une date, et le CPU JavaScript, ressource rare du budget de performance ([chapitre 10](10-l-architecture.md)), n'en paie rien.

**Pourquoi les dégâts en vol sont réservés.** Sans cette règle, quatre canons tirent ensemble sur le même Traînard à 1 point de vie et trois boulets sont perdus — sur une colonne, cela suffit à annuler la moitié d'une batterie. Le jet, continu, n'en a pas besoin : il ne « choisit » rien, il brûle ce qui entre dans le cône.

**Pourquoi on vise le plus avancé, et non le plus proche.** Le plus proche laisse filer le zombie qui est à deux pas de la mairie — c'est-à-dire précisément celui qui coûte des points. Le plus avancé est aussi la seule règle qu'un enfant peut prédire en regardant la rue, et elle est la même pour les deux armes : il n'y a qu'une phrase à comprendre.

**Pourquoi le canon au sol s'use, et pourquoi il n'y a pas de réparation.** Sans usure, rien n'empêcherait d'aligner une rangée de canons en travers d'une rue et le placement cesserait d'être un choix. Vingt coups de Traînard donnent au canon de rue une durée de vie qui **se dégrade toute seule** : deux vagues au milieu de la partie, moins d'une à partir de la neuvième, sans qu'aucun chiffre ne change avec le numéro de vague. Une réparation payante serait un cinquième poste de dépense et un cinquième sens du second bouton ; l'amélioration fait déjà le travail, et elle le fait en donnant quelque chose plutôt qu'en rachetant ce qu'on avait déjà.

**Pourquoi l'usure se lit à la silhouette.** Un clignotement rouge est disqualifié — le rouge n'existe nulle part dans ce jeu —, et un clignotement tout court dirait « attention » là où le canon dit déjà « regarde-moi, je rétrécis ». Les blocs qui tombent sont la grammaire de la mairie (chapitre 6), appliquée telle quelle : le blanc dit « ça vient de se passer », le manque dit « et ça ne reviendra pas ». C'est du mouvement et de la forme, les deux canaux dont le décor orange ne dispose pas (chapitre 7).

**Pourquoi rien ne limite le nombre de canons.** Un plafond dur aurait été un mur artificiel, un compteur de plus dans le bandeau et une frustration inexplicable. Ce qui régule à sa place n'est pas l'argent mais **le temps du joueur** : dix canons de niveau 2 qu'on ne nourrit jamais valent dix canons de niveau 1, et le gradient de ravitaillement du [chapitre 2](02-la-ville.md) fait qu'un aller-retour au fond d'une rue déborde sur l'assaut. La décision « où poser mon canon » devient « lequel je nourris », qui est la même décision sous un autre nom.

**Pourquoi le pool de 24 n'est pas une règle de jeu.** C'est le budget de performance ([chapitre 10](10-l-architecture.md)), et il est hors d'atteinte par construction — non par un plancher de prix, mais par une propriété de l'économie : **la prime de bravoure substitue au lieu d'ajouter**. Un zombie tué à l'épée rapporte le double d'un zombie tué par un canon, mais c'est le *même* zombie : chaque canon posé vole des kills à l'épée et rabote le revenu qui achèterait le suivant. Le pire cas réel — les canons prennent tous les Traînards, l'épée prend tout le reste — plafonne à 23,1 canons, et seulement pour un joueur qui n'achèterait aucune amélioration, aucune bombe et aucun renfort. **Le code n'a rien à défendre.**

**Pourquoi le canon est la seule construction, et pourquoi c'est définitif.** Ce n'est pas une affaire de budget — on pourrait toujours reprendre des pièces aux canons. Trois murs déjà posés ailleurs l'interdisent, et il faudrait les rouvrir un à un. **Il ne reste aucun lieu** : les trois sens du second bouton se distinguent par le seul endroit où l'on se tient, et une quatrième construction posée « là où l'on se tient » entrerait en collision avec le canon partout. **La bourse est une liste fermée de quatre vignettes** — canon, jet de feu, tapis roulant, renfort (chapitre 8). **Et la substitution ne survit pas à un tueur de plus** : toute construction qui tue sans passer par elle, ou qui rapporte, casse la démonstration qui tient le budget de performance.

**Pourquoi les trois « trous » d'un canon n'en sont pas.** Qu'il ne ralentisse rien est la garantie qu'un assaut se termine, et c'est ce qui rend les durées de traversée exactes, donc la table vérifiable au banc. Qu'il ne traite ni le Sprinteur ni le Costaud est l'énoncé du jeu : 43 % des zombies sont réservés à l'épée, et la prime de bravoure est le prix payé pour les y garder. Qu'il ne protège pas le joueur est ce qui garde ses points de vie dans leur rôle de convertisseur ([chapitre 4](04-le-joueur.md)) — et le refuge existe déjà, gratuit : le toit.

## D'où ça vient

[#8](https://github.com/ben-barbier/apocalypse-zombie/issues/8) pour les trois niveaux et les deux armes, tous les chiffres du boulet et du jet, la visée au plus avancé, la réservation des dégâts en vol, le tir en cloche garanti, la pose là où l'on se tient, l'amélioration qui remet à neuf, les 3 blocs d'écart, les 20 coups de Traînard d'un canon au sol, l'absence de plafond et les trois silhouettes. [#28](https://github.com/ben-barbier/apocalypse-zombie/issues/28) pour le canon comme seule construction, les trois murs qui le démontrent, le ralentisseur écarté, les trois niveaux sans embranchement et le corollaire d'équilibrage. [#14](https://github.com/ben-barbier/apocalypse-zombie/issues/14) pour l'amélioration à 3 blocs et la suppression de la zone morte, et pour le losange. [#15](https://github.com/ben-barbier/apocalypse-zombie/issues/15) pour la majoration de portée à 0,75, le liseré, et la bourse fermée à quatre vignettes. [#16](https://github.com/ben-barbier/apocalypse-zombie/issues/16) pour la grammaire des dégâts d'une construction, reprise ici telle quelle. [#23](https://github.com/ben-barbier/apocalypse-zombie/issues/23) pour le jet qui ne s'allume qu'en présence d'un zombie, sa couleur unique et la lecture par la longueur. [#11](https://github.com/ben-barbier/apocalypse-zombie/issues/11) pour la substitution qui tient les 24 canons.
