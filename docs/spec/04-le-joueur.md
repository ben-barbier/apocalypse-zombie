# Le joueur

Ce chapitre décide le personnage que l'enfant dirige : son corps, sa course, son saut, ses échelles, la caméra qui le suit, l'épée et la fauchée, l'auto-ciblage, ce qu'il encaisse et ce qui arrive à zéro, le ravitaillement qu'il porte à ses canons, et les boutons qui font tout cela. Le terrain qu'il parcourt est au [chapitre 2](02-la-ville.md), ce qu'il affronte au [chapitre 3](03-les-zombies.md), ce qu'il construit au chapitre 5.

## Les règles

**Le corps**

1. Il n'y a **qu'un personnage dirigé**, suivi à la troisième personne : jamais un second, jamais un remplaçant, jamais un choix de personnage.
2. Il est bâti sur les **quatorze mêmes boîtes qu'un zombie** — c'est la grammaire commune à tous les personnages — plus l'**épée qu'il tient en main**, et il porte la tache comme eux (chapitre 7).
3. Il est **tunique bleue et acier clair** : les seules couleurs froides portées par un personnage, pour qu'il ne soit jamais confondu avec un assaillant.
4. **Le joueur est la constante du jeu** : ni ses points de vie, ni sa vitesse, ni son épée, ni sa portée ne montent jamais. C'est la ville qui se renforce.
5. **Le joueur ne meurt jamais** : la seule fin de partie est la chute de la mairie ([chapitre 1](01-la-partie.md)).

**Se déplacer**

6. La **course est la seule allure : 6 blocs par seconde**, toujours — ni marche, ni sprint, ni accélération, ni élan.
7. La vitesse **ne dépend jamais de ce qu'il porte** : chargé de trois bombes, il court exactement aussi vite.
8. Le déplacement se résout contre une **grille de hauteurs**, une cellule par bloc de la ville, engendrée au chargement depuis les règles du [chapitre 2](02-la-ville.md) : une cellule dit **à quelle hauteur on marche et si l'on a le droit d'y être**, et c'est la seule structure de collision du jeu.
9. Un toit n'est donc **pas un cas particulier** : c'est une cellule plus haute, et s'y tenir, y poser un canon ou en tomber se résout exactement comme au sol.
10. Le **saut** franchit **2 blocs de dénivelé et 2 blocs de vide, jamais plus**, sur un bouton dédié.
11. Le saut **ne monte jamais depuis le sol** — un toit fait au moins 4 blocs — et **ne sert jamais à descendre**.
12. On **descend d'un toit en marchant dans le vide**, et la chute ne coûte **rien, jamais**.
13. La **montée d'échelle est automatique** : marcher dessus en poussant vers le bâtiment suffit, elle prend **0,8 seconde**, l'épée se range, le joueur est **immunisé au contact** pendant la montée et ressort en haut prêt à frapper. La descente se fait de la même manière.
14. L'échelle est la **seule montée depuis le sol**, et il y en a une par bâtiment ([chapitre 2](02-la-ville.md)).

**La caméra**

15. La caméra est **derrière le joueur, à 6,5 blocs de recul et 5,5 blocs au-dessus de son sol**.
16. Elle est **assistée** : elle se replace derrière lui **dès qu'il court**, à 2,4 radians par seconde.
17. Elle n'est **jamais asservie à l'auto-ciblage** — le joueur pivote, elle non — et son recentrage est **gelé 1,2 seconde après chaque coup**.
18. Quand un bâtiment s'interpose, elle **grimpe** — jusqu'à 10 blocs plus haut — **avant** de se rapprocher, et ne descend **jamais sous 3,2 blocs** de recul.
19. Il n'existe **aucune commande de caméra, sur aucune plateforme** : le stick droit ne fait rien, et rien ne le remplace.
20. Le jeu **ne prend jamais la caméra au joueur** : aucune cinématique, aucun cadrage imposé, à aucun moment de la partie.

**L'épée**

21. L'épée est la **seule arme du joueur**. Elle ne s'achète pas, ne s'améliore pas, ne se remplace pas, et vaut **1 coup d'épée** du début à la fin de la partie.
22. Un coup balaie la **fauchée** : un secteur de **120° devant le joueur**, sur **3 blocs** mesurés jusqu'au bord de la boîte du zombie, haut de **1,5 bloc au-dessus et au-dessous de lui**.
23. **Tout ce qui s'y trouve est touché du même coup** : on ne frappe jamais une cible unique.
24. La cadence est de **2,5 coups par seconde** — un coup toutes les 0,4 seconde — et **le bouton maintenu frappe en boucle**. Aucun combo, aucune animation bloquante, aucune fenêtre à respecter.
25. **Fenêtre de grâce de 150 ms** : le coup touche ce qui était dans la fauchée à l'appui **ou** y entre dans les 150 millisecondes suivantes. Elle n'est ni annoncée ni visible.
26. La fauchée **ne monte ni ne descend de plus de 1,5 bloc** : depuis un toit, on ne touche rien dans la rue et rien ne nous touche — **le toit est un refuge intégral**.
27. L'épée **ne touche jamais la mairie, un canon ni un tapis roulant**, et le tir d'un canon ne touche jamais le joueur : il n'existe **aucun tir ami**, dans aucun sens et dans aucune situation.
28. **Frapper dans le vide ne coûte rien** : ni temps mort, ni pénalité, ni ralentissement — on réenchaîne aussitôt.

**L'auto-ciblage**

29. L'auto-ciblage **oriente le joueur à l'instant de l'appui** ; il ne désigne aucune victime, puisque le coup balaie.
30. Il vise le zombie **le plus proche du joueur**, départagé par l'**avancement le plus élevé** sur son rail.
31. **Hystérésis** : le zombie désigné le reste tant qu'il est dans la fauchée, pour que la vue ne pivote pas à chaque pas.
32. La règle **ne change jamais** — ni près de la mairie, ni face au Colosse — et l'orientation **ne suit pas** la cible après l'appui : le coup part où il a été lancé.

**Ce que le coup fait au zombie**

33. Un coup vaut **1 coup d'épée à chaque cible touchée**, sans partage et sans décroissance avec le nombre.
34. Le recul est **latéral, jamais en arrière** : l'avancement d'un zombie ne décroît jamais ([chapitre 3](03-les-zombies.md)).
35. Traînard et Sprinteur sont **décalés de 0,75 bloc** dans le sens du coup, avec **0,3 seconde de pause d'avancement** ; le Costaud n'est pas décalé et prend **0,15 seconde** de pause ; le **Colosse ne bronche pas**.
36. C'est le **seul ralentisseur du jeu**, et le décalage éloigne le zombie du joueur : frapper tôt, c'est ne pas être touché.

**Se faire toucher**

37. Le joueur a **5 points de vie**, et un **contact** lui en coûte **1, quel que soit le type** du zombie.
38. Le contact est la **seule chose qui coûte un point de vie** : ni la chute, ni le feu d'un canon, ni rien d'autre.
39. Au contact, le joueur est repoussé et **étourdi 1 seconde** — aucun coup possible —, puis **invulnérable 1 seconde** : il ne peut donc pas perdre plus d'**un point de vie toutes les 2 secondes**, soit **10 secondes de contact continu** avant de tomber.
40. Le zombie qui touche **ne s'arrête pas**, ne dévie pas, ne prend aucun dégât et ne lui prend jamais ce qu'il porte : ce n'est pas un combat, c'est un accident de circulation.
41. La régénération est le **seul mécanisme de soin** : **+1 point toutes les 6 secondes**, et **chaque contact remet ce compte à zéro**.
42. À zéro point de vie, le joueur **s'écroule** : il tombe **là où il est**, reste **3 secondes au sol**, puis se relève **au même endroit**, à pleins points de vie, avec **3 secondes d'invulnérabilité**.
43. La **brassée disparaît à l'écroulement**, et c'est la **seule perte de bombes du jeu**.
44. **Rien ne s'achète pour le joueur** et le plafond de 5 ne monte jamais.

**Le ravitaillement**

45. Les bombes de feu **ne se prennent qu'à la base**, au contact du hangar, où le stock est infini.
46. Un appui y prend **le plein de ce qu'il peut porter**, payé automatiquement ; si l'argent manque, il prend ce qu'il peut payer. Aucun dosage, aucun menu.
47. La **brassée est de 3 bombes**, exactement une soute ; elle se lit **au-dessus de la tête du joueur**, un cube par bombe, et jamais dans le bandeau.
48. Le joueur **frappe à l'épée en portant** des bombes, et **une bombe portée ne tombe jamais**.
49. À **moins de 3 blocs d'un canon**, un appui **verse d'un coup tout ce qu'il porte**, dans la limite des cases libres, en **0,3 seconde**.
50. **Le versement passe avant l'amélioration** : le second bouton verse tant que le joueur porte au moins une bombe **et** que la soute n'est pas pleine, et améliore sinon (chapitre 5). C'est le seul endroit du jeu où deux gestes se rencontrent.
51. **Aucune reprise inverse** : ce qui est entré dans un canon y reste.
52. Le **tapis roulant** fait ce trajet à la place du joueur, et seulement pour les canons du **halo** ([chapitre 2](02-la-ville.md)).
53. Il **apparaît d'un coup à l'achat** : le joueur ne trace rien, ne pose rien, ne dirige rien.
54. Son débit est de **1 bombe toutes les 6 secondes**, exactement la consommation du jet à plein régime : un canon servi par un tapis **ne se vide jamais et ne déborde jamais**.
55. Les **livraisons sont gratuites**, définitivement, et le tapis est **indestructible** ; il se **rétracte vers la base en 1 seconde** si le canon qu'il sert meurt.

**Les commandes**

56. Deux entrées sont conçues, la **manette** et le **tactile** ; le clavier n'existe que comme raccourci de test ([chapitre 1](01-la-partie.md)).
57. Manette : le **stick gauche** déplace, **`A`** frappe, **`X`** agit, **`Y`** saute, **`Start`** ouvre le Sas. Le **stick droit ne fait rien**, et **`B` n'est jamais employé** — la navigation système d'iPadOS le capte.
58. Tactile : le **manche flottant** de la main gauche déplace ; trois cibles sous le pouce droit — frapper, sauter, agir —, la troisième n'apparaissant **que quand une action est possible** et portant le picto de ce qu'elle fera (chapitre 8).
59. **Le bouton d'attaque ne fait jamais rien d'autre que frapper**, où que se tienne le joueur.
60. Tout le reste — prendre des bombes, verser, poser un canon, l'améliorer, renforcer la mairie — passe par le **second bouton**, et **il n'a jamais qu'un seul sens à un endroit donné** : le losange au sol dit lequel (chapitre 5).

## Les chiffres

### Le corps et le déplacement

| Grandeur | Valeur |
|---|---:|
| Boîtes du corps, épée non comprise | 14 |
| Course, seule allure | 6 blocs/s |
| Saut, dénivelé franchi | 2 blocs |
| Saut, vide franchi | 2 blocs |
| Montée ou descente d'échelle | 0,8 s |
| Dégâts de chute | 0 |

### La caméra

| Grandeur | Valeur |
|---|---:|
| Recul nominal | 6,5 blocs |
| Hauteur au-dessus du sol du joueur | 5,5 blocs |
| Recul minimum, quoi qu'il arrive | 3,2 blocs |
| Montée maximale sur occlusion | +10 blocs |
| Vitesse de recentrage | 2,4 rad/s |
| Gel du recentrage après un coup | 1,2 s |

### La fauchée

| Grandeur | Valeur |
|---|---:|
| Ouverture | 120° |
| Portée, jusqu'au bord de la boîte du zombie | 3 blocs |
| Hauteur, au-dessus et au-dessous du joueur | 1,5 bloc |
| Cadence | 2,5 coups/s |
| Intervalle entre deux coups | 0,4 s |
| Dégâts, à chaque cible touchée | 1 coup d'épée |
| Fenêtre de grâce | 150 ms |

### À l'épée seule

| Type | Points de vie | Temps de mise à mort |
|---|---:|---:|
| Traînard | 1 coup d'épée | 0,4 s |
| Sprinteur | 1 coup d'épée | 0,4 s |
| Costaud | 5 coups d'épée | 2 s |
| Colosse | 25 coups d'épée | 10 s |

### Le recul, par type

| Type | Décalage latéral | Pause d'avancement |
|---|---:|---:|
| Traînard, Sprinteur | 0,75 bloc | 0,3 s |
| Costaud | — | 0,15 s |
| Colosse | — | — |

### Les points de vie

| Grandeur | Valeur |
|---|---:|
| Points de vie | 5 |
| Coût d'un contact, tous types | 1 |
| Étourdissement | 1 s |
| Invulnérabilité qui le suit | 1 s |
| Perte maximale | 1 point / 2 s |
| Contact continu avant l'écroulement | 10 s |
| Régénération | +1 / 6 s |
| Écroulement, au sol | 3 s |
| Invulnérabilité au relèvement | 3 s |
| Regagné pendant une préparation de 30 s | +5 |

Une préparation refait donc **le plein**, sans qu'une règle de remise à neuf entre les vagues ait à exister.

### Le ravitaillement

| Grandeur | Valeur |
|---|---:|
| Brassée | 3 bombes |
| Soute d'un canon | 3 bombes |
| Autonomie d'une soute pleine | 18 s de jet à plein régime |
| Consommation du jet alimenté | 1 bombe / 6 s |
| Débit du tapis roulant | 1 bombe / 6 s |
| Distance de versement | < 3 blocs |
| Durée d'un versement | 0,3 s |
| Rétraction du tapis | 1 s |
| Toits éligibles au tapis ([chapitre 2](02-la-ville.md)) | 9 sur 87 |

### Ce que coûte un trajet

| Depuis la base, jusqu'à… | Aller-retour |
|---|---:|
| le tiers du pied d'une rue | 10,9 s |
| le tiers du milieu | 19,8 s |
| le tiers du fond | 28,8 s |
| **le toit le plus lointain** | **33,5 s** |
| *pour mémoire, la préparation* | *30 s* |

Le gradient est celui du [chapitre 2](02-la-ville.md), lu ici comme un coût : au pied d'une rue le halo ravitaille tout seul, au milieu un trajet tient dans la préparation, au fond il **déborde sur l'assaut**.

### Ce qu'on voit et ce qu'on entend

| Moment | Retour |
|---|---|
| Chaque coup, touché ou non | l'arc blanc de la fauchée, déposé le long de la lame en 25 éclats, chacun effacé 150 ms après sa pose |
| Touche sans tuer | éclair blanc de 80 ms sur les boîtes du zombie, « tchac » sec, secousse de caméra minime |
| Coup fatal | figeage de l'image 60 ms, tête éjectée en vrille, « bloup », pièce aspirée |
| Coup dans le vide | l'arc se trace quand même, souffle sourd, aucune pénalité |
| Étourdi | clignotement blanc à 2 Hz pendant 1 s |
| Invulnérable | le même clignotement, accéléré à 6 Hz |

L'**état** est dans le bandeau — les cinq pastilles (chapitre 8) —, l'**événement** reste dans le monde.

### Les commandes

| Geste | Manette | Tactile |
|---|---|---|
| Se déplacer | stick gauche | manche flottant, moitié gauche |
| Frapper | `A` | cible en bas à droite, permanente |
| Sauter | `Y` | cible à gauche de l'attaque |
| Agir | `X` | cible au-dessus de l'attaque, présente seulement quand une action est possible |
| Ouvrir le Sas | `Start` | porte en haut au centre |

Le **stick droit** et le bouton **`B`** ne font rien, jamais. Les tailles, les positions et les marges de sécurité de ces cibles appartiennent au bandeau (chapitre 8).

## Les interdits

- **Jamais une seconde allure** — ni marche, ni sprint, ni ralentissement en charge : une vitesse qui varie selon ce qu'on porte est illisible à 8 ans, et rendrait incalculable le gradient de trajets sur lequel repose tout le ravitaillement.
- **Jamais un dégât de chute** — punir la chute reviendrait à punir la seule manière de descendre d'un toit, et un enfant qui saute d'un toit pour aller plus vite fait exactement ce qu'on veut.
- **Jamais un saut qui monte du sol à un toit** — l'échelle est la seule montée, donc la seule chose que l'enfant ait à découvrir pour poser son premier canon.
- **Jamais une commande de caméra, sur aucune plateforme** — au tactile les deux pouces sont déjà pris, et la donner à la seule manette créerait deux jeux différents à équilibrer.
- **Jamais une caméra asservie à l'auto-ciblage** — le joueur pivote jusqu'à 2,5 fois par seconde : c'est le tournis garanti.
- **Jamais une cinématique, jamais un cadrage repris au joueur** — pas même à l'ouverture d'une rue.
- **Jamais une épée qui s'améliore, s'achète ou se remplace** — le coup d'épée est l'unité de dégâts de tout le jeu : la faire varier ferait bouger l'échelle sous les pieds de tous les autres chapitres, et rendrait le Costaud trivial alors qu'il existe pour forcer le passage aux canons.
- **Jamais un achat qui touche le joueur** — ni points de vie, ni vitesse, ni portée, ni armure : il concurrencerait les canons pour le même argent et diluerait la démonstration de la prime de bravoure.
- **Jamais une cible unique** — encerclé par cinq Traînards, un enfant qui doit frapper cinq fois pendant qu'un algorithme choisit pour lui vit une punition.
- **Jamais une priorité de cible « intelligente »** — préférer le Sprinteur au Costaud est illisible : on ne comprend pas pourquoi son personnage se tourne ailleurs.
- **Jamais un tir ami** — un enfant qui abîme sa propre défense en tapant sur un zombie collé au canon ne pardonnerait pas.
- **Jamais un recul qui fait reculer un zombie** — l'avancement ne décroît jamais, c'est la garantie qu'un assaut se termine.
- **Jamais une mort du joueur, jamais un relèvement ailleurs qu'à l'endroit de la chute** — se relever à la base ferait de l'écroulement le trajet de retour le plus rapide de la ville, et le meilleur mouvement défensif du jeu.
- **Jamais un dégât de contact qui varie selon le type** — un Colosse à 3 points ferait de la vague 10 une leçon d'arithmétique ; dix secondes, toujours, quel que soit ce qu'on affronte.
- **Jamais un soin autre que la régénération** — ni potion, ni ramassage, ni remise à neuf entre les vagues : la préparation fait déjà le plein.
- **Jamais une bombe qui tombe, jamais une bombe au sol à ramasser** — le coût du ravitaillement se paie en points de vie qu'on voit descendre, pas en objets perdus au hasard ; et c'est une entité de moins dans le budget d'affichage.
- **Jamais une reprise de bombes dans un canon** — siphonner ses canons pour nourrir le bon transformerait un jeu de trajets en jeu de comptabilité.
- **Jamais un tapis roulant qu'on trace, qu'on dirige ou qu'on détruit** — il n'y a pas de souris dans ce jeu, et faire tracer un chemin à la manette ou au doigt serait le pire geste du jeu.
- **Jamais un compteur de bombes dans le bandeau** — la brassée se lit sur la tête du joueur, la soute sur le canon.
- **Jamais un bouton polyvalent** — l'enfant appuie pour frapper et construit un canon par erreur : c'est le piège le plus coûteux à 8 ans.
- **Jamais un appui qui ne fait rien là où quelque chose est possible** — une zone morte inexplicable sans texte est inacceptable ici.
- **Jamais `B` sur manette** — la navigation système d'iPadOS le capte.

## Pourquoi

**Pourquoi 6 blocs par seconde, et pourquoi ça ne se sépare pas des rues de 80 blocs.** Les deux valeurs ont été décidées ensemble et chacune, seule, casse le gradient ([chapitre 2](02-la-ville.md)) : à 6 blocs/s sur des rues de 60, l'aller-retour le plus long retombe sous la préparation et ravitailler le fond d'une rue cesse de coûter quoi que ce soit ; à 5 blocs/s sur des rues de 80, la ville devient un couloir qu'on traverse à pied. À 6 sur 80, l'aller-retour le plus long vaut 33,5 s contre 30 s de préparation. Effet de bord qui compte autant : le joueur **distance le Sprinteur**, le plus rapide des zombies à 4 blocs par seconde. Rien ne le poursuit — les zombies ne quittent jamais leur rail ([chapitre 3](03-les-zombies.md)) —, mais rien ne le rattrape non plus quand il décroche.

**Pourquoi une seule allure.** Une vitesse variable demanderait un second geste et une seconde lecture, pour ne rien apporter : le jeu n'a pas de furtivité, pas d'endurance, pas de portage lourd. Et surtout, tout le calibrage du ravitaillement est un compte de secondes — trois lignes du tableau des trajets et la préparation qui les borne. Une allure qui varie rend ce compte incalculable, donc l'arbitrage central du jeu illisible.

**Pourquoi le saut, et ce qu'il ne fait pas.** Le saut fait des toits un **réseau** : on passe d'un toit de 4 à un toit de 6, d'un 6 à un 8, jamais d'un 4 à un 8, et une rue large de 6 blocs ne se saute pas. C'est ce qui donne leur sens aux tronçons du [chapitre 2](02-la-ville.md) — trois coupures par bord, aucun chemin haut du pied au fond — et ce qui rend le ravitaillement d'un canon avancé dangereux plutôt que seulement long. Ce qu'il ne fait pas est aussi important : il ne monte jamais du sol, donc l'échelle reste la seule montée, donc la seule chose à découvrir.

**Pourquoi la montée d'échelle coûte 0,8 seconde et non trois.** À trois secondes et une quarantaine de montées par partie, ce sont **deux minutes d'immobilité passive** sur une partie d'un quart d'heure — et surtout, la montée cesse d'être une fuite utilisable quand un zombie arrive. À 0,8 seconde, elle reste ce qu'elle doit être : un réflexe, pas une décision. C'est aussi la **part fixe** d'un aller-retour, celle que la course ne raccourcit pas.

**Pourquoi une grille de hauteurs, et pas une géométrie.** Le décor est figé et le plan est une règle ([chapitre 2](02-la-ville.md)) : une cellule par bloc suffit à dire où l'on marche, et elle se calcule au chargement au lieu d'être stockée. Tout le reste en découle — un toit n'est plus un cas particulier mais une cellule plus haute, poser un canon se résout identiquement en haut et en bas, et il n'y a **aucun test d'intersection** à faire contre 87 bâtiments à chaque pas. C'est aussi ce qui rend la marche dans le vide gratuite à écrire : on tombe quand la cellule d'à côté est plus basse.

**Pourquoi la caméra est assistée, et sans aucune commande.** Une caméra libre demande à un enfant de 8 ans de gérer deux choses à la fois ; une caméra à crans casse le lien entre la direction du stick et ce qu'on voit dès qu'on court en diagonale. La caméra assistée ne demande rien : elle se replace quand on court, et c'est tout. C'est la décision la plus exposée de la spec — elle a été **confirmée par un playtest**, où l'enfant s'est déplacé sans jamais la combattre. Elle rend possible le refus de toute commande de caméra, et ce refus rend possible l'égalité entre la manette et le tactile.

**Pourquoi la caméra grimpe au lieu de se rapprocher.** Se coller au dos du joueur, c'est ne plus rien voir. Grimper garde le champ et n'a aucun coût de lisibilité, puisqu'un toit se regarde de haut aussi bien que de face. Depuis que les bâtiments plafonnent à 8 blocs et que la place fait 32 blocs bord à bord, l'occlusion est devenue rare — la règle sert alors les quelques cas qui restent, au lieu d'être l'état normal.

**Pourquoi on balaie au lieu de cibler.** L'épée est **l'arme du nombre**, le canon celle de la résistance. Un coup qui touche tout le secteur donne à l'épée un rôle que le canon n'aura jamais : contre un paquet de quatre Traînards qui arrive, rien d'autre ne suit. L'arbitrage que la conception redoutait — un Costaud à 1 bloc/s et un Sprinteur à 4 dans la même fauchée — se dissout de lui-même : **les deux prennent le coup**.

**Pourquoi l'auto-ciblage oriente et ne désigne pas.** Puisque le coup balaie, il ne reste rien à choisir : tourner le joueur du bon côté suffit. C'est ce qui permet à la règle d'être invariable, donc explicable en une phrase — « il se tourne vers le plus proche » —, alors qu'une priorité intelligente produirait des pivots que l'enfant subirait sans les comprendre.

**Pourquoi une fenêtre de grâce de 150 millisecondes.** Un Sprinteur traverse les 3 blocs de la fauchée en moins d'une seconde : sans tolérance, la moitié des coups « qui étaient dessus » ratent. Elle n'est ni annoncée ni visible parce qu'elle ne s'apprend pas — elle rend simplement vrai ce que le joueur croyait déjà voir. En revanche l'orientation ne suit pas la cible après l'appui : le coup part où il a été lancé, sinon le personnage courrait après les zombies.

**Pourquoi le recul est latéral, et pourquoi le Colosse ne bronche pas.** L'avancement d'un zombie ne décroît jamais — c'est la garantie formelle qu'un assaut se termine —, donc un recul ne peut être qu'un décalage plus une pause. Il en sort une parade gratuite : le décalage **éloigne** le zombie, donc frapper tôt, c'est ne pas être touché, et la défense s'apprend sans jamais être enseignée. Que le Colosse ne bronche pas est la lecture visuelle immédiate de « celui-là, l'épée n'y suffit pas », dite par le corps du zombie plutôt que par un chiffre.

**Pourquoi le toit est un refuge intégral, et pourquoi ce n'est pas une faille.** La fauchée ne dépasse pas 1,5 bloc en hauteur et un toit en fait au moins 4 : depuis un toit, on ne touche rien et rien ne nous touche. On peut donc passer un assaut entier en haut sans être touché — mais les canons tuent lentement, un boulet toutes les deux secondes, donc attendre allonge l'assaut et **laisse la mairie encaisser**, définitivement. Le toit est un refuge qui coûte cher : c'est l'infirmerie du jeu, et rien d'autre.

**Pourquoi frapper encore, une fois la ville hérissée de canons.** Quatre faits, dont le dernier est une mécanique : l'épée est **gratuite et immédiate** là où un canon se paie et se place à l'avance ; c'est la **seule arme à forte cadence** — 2,5 coups par seconde sur plusieurs cibles, contre 1 dégât toutes les 2 secondes ; l'assaut ne finit qu'à la mort du dernier zombie, donc laisser faire les canons revient à laisser la mairie encaisser ; et la **prime de bravoure** double la valeur d'un zombie tué à l'épée. L'enfant voit une pièce visiblement plus grosse, sans un multiplicateur affiché nulle part. Le barème est au chapitre 6 ; ce qui est décidé ici est le principe — **le corps-à-corps reste rentable jusqu'à la dernière vague**, et il l'est parce qu'il paie double.

**Pourquoi cinq points de vie, et pourquoi le contact vaut toujours un.** Le plafond de perte — un point toutes les deux secondes, tenu par l'étourdissement et l'invulnérabilité qui le suit — donne aux cinq points leur vraie unité : **dix secondes de contact continu**. Uniforme, ce chiffre se lit sans rien apprendre. Un dégât qui varierait selon le type transformerait chaque paquet en calcul, alors que l'enfant a déjà tout ce qu'il lui faut : il voit ses pastilles descendre à un rythme constant.

**Pourquoi les points de vie ne sont pas une seconde barre de défaite.** Le joueur ne meurt pas : il **perd du temps**. Et le temps du joueur a déjà un prix chiffré — la fuite du [chapitre 3](03-les-zombies.md), qui coûte des points de mairie tant qu'on n'est pas revenu. Les points de vie sont donc un **convertisseur** : ils transforment les erreurs du joueur en points de mairie, la seule barre dont la chute finit la partie. La chaîne va toujours dans le même sens — *je me fais toucher → je m'écroule → je ne tue plus → la mairie encaisse* —, et toute règle qui inverse cette flèche est fausse. Sur le budget de 166 points dépensés sur 200, deux ou trois écroulements passent dans la marge, dix la font tomber.

**Pourquoi l'écroulement se fait sur place.** C'est la flèche ci-dessus qui l'impose. Se relever à la base coûterait 3 secondes là où le retour à pied en coûte quinze depuis le fond d'une rue : s'écrouler deviendrait le moyen de transport le plus rapide du jeu, la sanction prévue — perdre sa brassée — ne coûtant rien à qui l'a déjà vidée. Pire, en défense, perdre ses points de vie **rapporterait** des points de mairie. Sur place, le coût d'un écroulement redevient croissant avec l'éloignement : trois secondes au sol **plus** le trajet qu'on devait faire de toute façon, pendant que la colonne continue de descendre. Les trois secondes d'invulnérabilité au relèvement sont la seule exception à la seconde d'usage : sans elles, on se relèverait dans le paquet qui vient de vous abattre, en boucle.

**Pourquoi une seule régénération, et pourquoi six secondes.** Six secondes dépassent les deux secondes du plafond de perte : on ne régénère donc **jamais** au corps-à-corps, il faut décrocher. Et comme la fauchée ne monte pas, décrocher veut dire monter — le toit est l'infirmerie, et il se paie déjà en revenu, un joueur perché ne touchant pas la prime de bravoure. Le même chiffre couvre le second besoin sans seconde règle : trente secondes de préparation valent cinq points, donc le plein.

**Pourquoi les points de vie sont la seule chose du joueur qui vive dans le bandeau.** Tout le reste de son état se lit sur lui ou sur le monde — la brassée au-dessus de sa tête, la soute sur le canon, le losange sous ses pieds. Ses points de vie résistent à ce traitement : il est petit à l'écran, souvent de dos, et la caméra grimpe au-dessus des bâtiments qui s'interposent, si bien que le seul moment où il faut lire ses points de vie est précisément celui où on le voit le plus mal. D'où le partage : l'**état** dans le bandeau, cinq pastilles en unités discrètes qui reviennent — contre la barre continue de la mairie, qui s'effrite et ne revient pas —, et l'**événement** dans le monde, le clignotement et les éclats du contact.

**Pourquoi la brassée fait trois, et la soute aussi.** Un trajet remplit une soute vide — jamais deux voyages pour un canon, jamais un demi-canon rempli. Mais trois bombes ne valent que **dix-huit secondes** de jet à plein régime, quand l'assaut de la vague 10 en dure cent trente : tenir un canon alimenté sur une partie d'assaut coûte donc **plusieurs trajets**, et le second se fait forcément sous le feu. La bombe cesse d'être un réservoir qu'on remplit une fois par vague pour devenir un **coup de fouet** qu'on donne au bon moment. Rallonger la bombe pour retrouver de l'autonomie a été écarté : ça n'aurait fait que renommer la même chose.

**Pourquoi le versement passe avant l'amélioration.** C'est le seul endroit du jeu où deux gestes se disputent un lieu, et la règle *le second bouton n'a qu'un seul sens à un endroit donné* exige qu'on tranche plutôt qu'on ouvre un menu. L'ordre retenu est celui de l'évidence : **on ne monte pas des bombes pour repartir avec**. La condition de soute non pleine est ce qui garantit qu'aucun appui ne reste sans effet — soute pleine, ou brassée vide, et le bouton améliore. Les deux états sont lisibles dans le monde, la brassée au-dessus de la tête et la soute sur le canon, et le picto du bouton d'action dit lequel des deux va se produire.

**Pourquoi le tapis roulant ne se trace pas, et pourquoi il coûte si cher.** Il n'y a pas de souris dans ce jeu : faire tracer un chemin à la manette ou au doigt serait le pire geste imaginable. Le niveau 3 est le confort total ou il n'est rien — il apparaît, il livre exactement la consommation du jet, gratuitement et pour toujours. Ce qui le rend désirable sans le rendre évident, c'est son prix : 120 pièces (chapitre 6) valent 120 bombes, soit **quarante allers-retours**, soit plus de temps de course qu'une partie n'en contient. On ne l'achète pas avec des pièces, on l'achète avec du temps — et comme le halo ne couvre que neuf toits sur 87, on l'achète pour un endroit précis.

**Pourquoi les points de vie décident de la masse monétaire.** La prime de bravoure ne crée pas d'argent, elle en **substitue** : c'est le même zombie, tué autrement. Ce qui décide de la masse monétaire d'une partie est donc le partage des mises à mort entre l'épée et les canons — et ce partage n'est pas décidé par le joueur, il est décidé par **ce que ses points de vie lui permettent d'encaisser**. Le barème est pris en tenaille par les deux bouts : trop de points de vie et tout se tue à l'épée, la masse file vers son plafond et le nombre de canons cesse d'être borné par le prix ; trop peu et le joueur n'ose plus s'approcher, tombe au plancher et ne peut plus s'offrir les canons dont la vague 10 a besoin — il perd par pauvreté, la pire façon de perdre à 8 ans. Cinq points, un par contact, dix secondes de contact continu : c'est le réglage qui rend jouable la courbe visée, environ 40 % des zombies tués à l'épée sur l'ensemble d'une partie (chapitre 11).

## D'où ça vient

[#14](https://github.com/ben-barbier/apocalypse-zombie/issues/14) pour la caméra assistée et ses six constantes, la course, la montée d'échelle automatique, la grille de hauteurs, le losange sans zone morte et le bouton d'action contextuel. [#10](https://github.com/ben-barbier/apocalypse-zombie/issues/10) pour la fauchée et tous ses chiffres, l'auto-ciblage qui oriente, la fenêtre de grâce, le recul par type, le toit comme refuge intégral, l'épée qui ne change jamais, l'absence de tir ami, la séquence du contact, la prime de bravoure et la règle « `A` ne fait que frapper ». [#22](https://github.com/ben-barbier/apocalypse-zombie/issues/22) pour les cinq points de vie, le contact uniforme, la régénération, l'écroulement sur place, l'absence de dégât de chute et le rôle de convertisseur. [#9](https://github.com/ben-barbier/apocalypse-zombie/issues/9) pour le ravitaillement entier : la prise à la base, la brassée de trois, la soute de trois, le versement, l'absence de reprise inverse et le tapis roulant. [#24](https://github.com/ben-barbier/apocalypse-zombie/issues/24) pour la confirmation par playtest de la caméra assistée, de la course, de la montée d'échelle et du saut. [#15](https://github.com/ben-barbier/apocalypse-zombie/issues/15) pour le saut et sa borne de 2 blocs, le refus de toute commande de caméra, et la table des commandes. [#11](https://github.com/ben-barbier/apocalypse-zombie/issues/11) pour le prix du tapis roulant et ce que la prime de bravoure substitue. [#23](https://github.com/ben-barbier/apocalypse-zombie/issues/23) pour les retours visuels — l'arc en éclats et les deux clignotements. [#29](https://github.com/ben-barbier/apocalypse-zombie/issues/29) pour les quatorze boîtes du corps.
