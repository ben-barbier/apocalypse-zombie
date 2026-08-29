# Le bandeau et le Sas

Ce chapitre décide ce que le jeu affiche par-dessus le monde et ce qu'il refuse d'afficher : la liste fermée des cinq affichages, les deux règles qui les placent, l'absence de carte et l'absence de menu de construction, les cibles tactiles et leurs marges, le Sas et ses deux portes, les deux reprises, l'Instantané et ce que le jeu écrit sur l'appareil. Les points de vie qu'il montre sont aux [chapitres 4](04-le-joueur.md) et [6](06-l-argent.md), les prix qu'il affiche au [chapitre 6](06-l-argent.md), les couleurs qu'il emprunte au [chapitre 7](07-le-regard.md), les rues qu'il pointe aux [chapitres 2](02-la-ville.md) et [3](03-les-zombies.md), et le stockage qui le sert au [chapitre 10](10-l-architecture.md).

## Les règles

**Le principe et la liste fermée**

1. **L'état se lit sur les objets, jamais en surimpression** ; le bandeau est la **liste d'exceptions** à ce principe, et elle est fermée.
2. Le bandeau affiche **cinq choses et rien d'autre** : la barre de la mairie, les cinq pastilles du joueur, la bourse, les flèches de rue, la bande de phase.
3. Un sixième affichage est une décision qui passe par ce chapitre, jamais un réflexe.
4. Le bandeau **ne duplique jamais** ce que le monde dit déjà : le canon à sec ([chapitre 5](05-les-canons.md)), le canon au sol qui meurt, les trois niveaux de canon, la brassée au-dessus de la tête du joueur, le halo, le losange, le liseré, le cerne et la mire.

**Les deux règles de placement**

5. **Le haut regarde, le bas agit** : les cinq affichages tiennent dans une bande en haut de l'écran, et le bas appartient entièrement aux deux pouces — **aucun affichage ne passe jamais sous un doigt**.
6. **Gauche, c'est la ville ; droite, c'est toi** : la barre de la mairie en haut à gauche, les pastilles et la bourse en haut à droite.
7. Le bandeau est **ancré à l'écran, jamais au monde** : la caméra se recentre et grimpe sans arrêt ([chapitre 4](04-le-joueur.md)), et rien de ce qu'il porte ne bouge avec elle.
8. Il se dispose selon le **ratio de la fenêtre**, jamais selon l'orientation de l'appareil : deux dispositions et deux seulement — **large** (ratio ≥ 1) et **étroite** (ratio < 1, la bande du haut s'empile).
9. Un **redimensionnement ordinaire ne met jamais en pause** — Split View, Stage Manager, rotation : le bandeau se re-dispose à la volée.
10. Toutes les tailles sont en **pourcentage de la plus petite dimension de la fenêtre**, bornées en pixels.
11. Le bandeau est en **DOM/CSS au-dessus du canevas**, jamais dessiné en WebGL : il ne coûte **aucun appel d'affichage** sur les 80 du budget ([chapitre 10](10-l-architecture.md)).
12. `render/hud.ts` écrit dans le DOM **sur événement** — le tampon d'événements, plus une poignée de scalaires comparés — et **jamais à chaque image**.

**La barre de la mairie**

13. Elle porte **dix segments quel que soit le palier de Renfort** : un segment vaut un dixième du plafond, et l'événement visuel reste constant du début à la fin de la partie ([chapitre 6](06-l-argent.md)).
14. Elle est **marron**, du début à la fin de la partie : son identité ne bouge pas.
15. Un **picto de mairie** à son extrémité gauche lui tient lieu de nom, et son **matériau change à chaque Renfort** — bois, barricades, pierre, créneaux : c'est ainsi que le palier se lit, **jamais par un chiffre**.
16. Coup encaissé : **éclair blanc de 80 ms** sur le segment entamé.
17. Renfort acheté : **remplissage blanc de gauche à droite en 400 ms**.
18. Les segments perdus sont **presque noirs**, et ils ne reviennent que par un Renfort.
19. **Aucun rouge nulle part** — ni sur cette barre, ni ailleurs dans le bandeau ([chapitre 7](07-le-regard.md)).

**Les pastilles**

20. Les points de vie du joueur sont **cinq carrés bleu-acier**, à la couleur de sa tunique, en haut à droite.
21. Une pastille perdue devient **creuse et sombre**, et **revient avec un flash blanc**.
22. **Unités discrètes qui reviennent** contre la **barre continue qui s'effrite** : la forme, la couleur et le coin disent, à eux seuls, laquelle des deux jauges finit la partie ([chapitre 4](04-le-joueur.md)).

**La bourse**

23. La bourse porte le **nombre de pièces en chiffres**, et sous lui **quatre vignettes dans un ordre fixe** : canon, jet de feu, tapis roulant, Renfort.
24. Chaque vignette porte **son prix en chiffres**, **allumée** quand la dépense est payable et **éteinte** sinon.
25. Une vignette qui s'allume **flashe en blanc pendant 400 ms**.
26. La vignette du Renfort porte le prix du **palier suivant** ([chapitre 6](06-l-argent.md)).
27. La **brassée de bombes n'a pas de vignette** : à 3 pièces elle est payable dès le premier zombie tué, et elle n'enseignerait rien.
28. **Deux questions, deux réponses, aucun recouvrement** : la vignette dit « puis-je payer ? », le losange au sol dit « puis-je ici ? ».
29. Les **prix s'écrivent en chiffres** : « il me faut 40, j'en ai 34 » est une lecture, pas une devinette.
30. **Aucun multiplicateur, aucun chiffre flottant, aucun combo, aucun compteur de canons** : un prix est une étiquette, pas un score.

**Les flèches de rue**

31. Il y a **une flèche par rue active, toujours présente**, et elle ne disparaît jamais tant que la rue est active.
32. Elle est **plaquée au bord de l'écran** quand la rue est hors champ, **posée au-dessus de son portique** quand la rue est à l'écran.
33. Elle porte la **couleur du portique** de sa rue ([chapitre 2](02-la-ville.md)).
34. Elle **porte une jauge** : elle se remplit de sa couleur à mesure que la tête de colonne descend la rue — vide, ils viennent d'entrer ; pleine, ils frappent la mairie.
35. Elle vit dans les **deux tiers hauts de l'écran** et jamais plus bas.
36. Le bandeau porte **trois flèches au maximum**, en Rallonge ([chapitre 1](01-la-partie.md)).

**La bande de phase**

37. Elle est **au centre** de la bande haute, et porte en permanence le **numéro de vague**, petit, au-dessus.
38. Le numéro de vague **n'a jamais de total** : ni « sur 10 » en partie principale, ni plafond en Rallonge.
39. Sous lui, une **hauteur réservée** qui ne porte **jamais deux choses à la fois** : en préparation, une **barre qui s'écoule** ; en assaut, le **grand chiffre des zombies restants**.
40. Le grand chiffre **passe au blanc et pulse sous 3 zombies restants** — raccord avec les colonnes de lumière du [chapitre 3](03-les-zombies.md).

**Ce que le bandeau refuse**

41. **Il n'y a pas de carte** : ni minicarte, ni radar, ni vue de dessus, à aucun moment de la partie — les flèches sont la **seule vue du hors-champ**.
42. **Il n'y a pas de menu de construction** : aucun écran, aucun mode, aucune sélection d'emplacement, aucune mise en pause pour acheter.
43. Le bandeau n'a **aucun signal d'alarme** : jamais de tremblement d'écran, jamais de flash plein écran, jamais un carton, jamais un message.
44. Une vague qui arrive, c'est **une barre qui finit de s'écouler**, rien de plus.
45. **Le jeu ne prend jamais la caméra au joueur** : aucune cinématique, à aucun moment.

**Les cibles tactiles**

46. Le **manche** est flottant : il naît là où le pouce se pose, dans la **moitié gauche sous la mi-hauteur**, et un **anneau fantôme au repos** le montre jusqu'au premier usage.
47. Trois cibles sous le pouce droit, **en triangle** — le pouce pivote, il ne se déplace pas : **frapper** en bas à droite, **sauter** à sa gauche à la même hauteur, **agir** au-dessus.
48. La cible d'action n'est présente **que quand une action est possible**, et porte le **picto de ce qu'elle fera** ([chapitre 4](04-le-joueur.md)).
49. **Aucune cible tactile sous 44 px**, et **aucune à moins de `env(safe-area-inset-*) + 32 px` d'un bord** : les gestes système ne sont pas bloquables depuis le web, on s'en éloigne.
50. Les **affichages**, qui ne se touchent pas, se contentent de `env(safe-area-inset-*) + 16 px`.
51. `pointercancel` se traite **exactement comme** `pointerup`.

**Le Sas**

52. Le **Sas** est l'unique écran hors-jeu : accueil au chargement, pause d'interruption, pause voulue et fin de partie à la fois.
53. **Il n'existe pas d'écran « Appuie sur un bouton » séparé** : c'est le Sas, et l'appui qui l'ouvre fait le triple travail — **exposer la manette** à Safari, **redémarrer l'`AudioContext`**, **reprendre le verrou de veille**.
54. Le Sas **interroge les manettes à chaque image** : sans ce sondage, `gamepadconnected` ne part jamais.
55. La partie se **fige et s'assombrit derrière lui**, et il ne porte **pas une ligne de texte**.
56. Il a **deux portes**. *Reprendre* — la mairie et le numéro de vague en gros chiffre —, d'un **appui simple** ou de n'importe quel bouton de manette sauf `B`, mise en avant par défaut. *Nouvelle partie* — la ville et une flèche circulaire —, d'un **appui maintenu 1 s** pendant qu'un anneau se remplit dans le sens horaire, et se vide en **200 ms** si l'on relâche ; sur manette, maintien de `A`.
57. Quand il n'y a **rien à reprendre**, *Nouvelle partie* est **seule, centrée**, et un appui simple suffit.
58. L'**appui maintenu remplace toute confirmation écrite**, et il rend inutile un bouton « abandonner » dans le bandeau : c'est par là qu'on quitte une partie mal engagée.
59. On ouvre le Sas à la demande par une **petite porte en haut au centre, sous la bande de phase**, d'un appui simple ; sur manette, `Start`. C'est une **cible et non un affichage** — le haut de l'écran est le seul endroit qu'aucun pouce ne visite, donc aucun appui accidentel n'y est possible.
60. Le Sas n'a **aucun réglage** — ni volume, ni qualité, ni langue.
61. **Rien ne reprend jamais tout seul** : aucune reprise n'est automatique, et c'est toujours un appui qui sort du Sas.

**Ce qui ouvre le Sas**

62. Le Sas s'ouvre au **chargement de la page**, sur **`visibilitychange` vers `hidden`**, sur **`pagehide`**, à la **perte du contexte WebGL**, sur **`gamepaddisconnected`** si la manette était la dernière entrée employée, et **sous 400 points de large** jusqu'à ce que la fenêtre s'élargisse.
63. À la **chute de la mairie**, le bandeau s'efface en **1 s**, la mairie s'écroule dans le monde, le fondu ne porte que le **numéro de la vague atteinte**, et le Sas s'ouvre avec la **seule porte *Nouvelle partie*** ([chapitre 1](01-la-partie.md)).

**Les deux reprises**

64. Il y a **deux reprises, jamais une seule**, et elles ne répondent pas au même accident.
65. **La mémoire a survécu** — bascule d'application, écran verrouillé, geste système, retour depuis le cache de page : reprise **à l'identique**, et la barre de préparation repart **où elle s'était arrêtée**.
66. **La page est morte** — purge mémoire de Safari, rechargement, contexte WebGL définitivement perdu : reprise **au début de la préparation de la vague en cours**, depuis l'Instantané, **barre pleine**.
67. **Repartir de zéro n'existe pas** : perdre la vague 7 d'un enfant de 8 ans est la punition sèche que le cadre interdit ([chapitre 1](01-la-partie.md)).
68. **Le temps ne traverse jamais rien** : le Sas fige tout, rien ne s'écoule derrière lui, et l'écart entre deux images est borné à 100 ms ([chapitre 10](10-l-architecture.md)).

**L'Instantané**

69. L'Instantané décrit une **frontière de vague**, et **jamais un assaut**.
70. Il porte **dix champs et pas un de plus** : la version de format, la vague, le drapeau *victoire acquise*, les points de vie de la mairie et leur plafond, les pièces, les canons, les points de vie du joueur, la brassée, les rues actives et l'état du générateur.
71. La **position du joueur n'y est pas** : à la reprise, il se tient à la base, là où commence une préparation.
72. Il s'écrit à chaque **entrée en préparation**, et à chaque **achat fait pendant cette préparation** — canon posé, canon amélioré, bombes prises, Renfort : ce sont les seuls événements qui le changent hors combat.
73. **Aucune écriture pendant l'assaut**, et **aucune dans un gestionnaire d'interruption** : aux moments où le navigateur ne promet plus rien, le disque est déjà à jour.
74. Un **achat fait en plein assaut** puis suivi d'une purge mémoire est **perdu** — et l'argent revient dans la poche.
75. L'Instantané **n'expire jamais**.
76. Il est effacé **à la sortie de la partie** — chute de la mairie ou lancement d'une nouvelle partie — et **jamais à la victoire** : la Rallonge se joue avec le même filet que le reste ([chapitre 1](01-la-partie.md)).
77. Il continue de s'écrire à chaque frontière de vague **en Rallonge**, et son numéro de vague n'a **pas de plafond**.
78. Un instantané **illisible, d'une autre version ou à champ manquant** est **effacé sans bruit** : le Sas n'ouvre plus que *Nouvelle partie*, sans message et sans écran d'erreur.

**Ce que le jeu écrit sur l'appareil**

79. L'Instantané est la **seule chose** que le jeu écrive : ni record, ni médaille, ni palier de qualité, ni notion de premier lancement ([chapitre 1](01-la-partie.md)).
80. Il vit sous **une clé et une seule**, gelée, et la mécanique du stockage est au [chapitre 10](10-l-architecture.md).
81. **Quand le stockage n'existe pas** — un Safari réglé sur « bloquer tous les cookies » fait lever la **lecture même** de `window.localStorage` — le jeu **joue sans filet, en silence** : une lecture qui échoue vaut « pas d'instantané », une écriture qui échoue ne fait rien du tout, et **la partie n'est jamais interrompue**.

**Le son**

82. `navigator.audioSession.type = 'playback'` est posé au démarrage, sans quoi le bouton silencieux de l'iPad coupe tout le jeu.
83. `ctx.resume()` n'est appelé **que dans le gestionnaire de l'appui qui quitte le Sas**, jamais sur `visibilitychange`.
84. Si le son ne revient pas malgré tout, **le jeu continue muet**, sans message ni écran.

**Les trois moments à faire comprendre sans texte**

85. **L'ouverture d'une rue** — la deuxième à la vague 5, la troisième à la vague 11 : dès la première seconde de la préparation qui la précède, **la flèche de la rue naît en blanc, grandit ×2 pendant 2 s**, prend sa couleur, et **pulse pendant toute la préparation**.
86. Elle apparaît **même si la rue est déjà à l'écran**, et le monde l'accompagne — le portique s'illumine, les barrières tombent ([chapitre 3](03-les-zombies.md)).
87. **Apprendre qu'on monte sur les toits** : à la fin de l'assaut 2, quand le versement porte la bourse à 43 pièces, **la vignette du canon s'allume en blanc** *et* **toutes les échelles de la ville se mettent à pulser en blanc**.
88. Cette pulsation est une **pulsation de matériau**, jamais une lumière ponctuelle ([chapitre 7](07-le-regard.md)), et elle **s'arrête définitivement à la pose du premier canon**.
89. **Le versement de fin d'assaut** se voit dans le monde — la gerbe d'éclats depuis la mairie ([chapitre 6](06-l-argent.md)) ; le bandeau n'y contribue que par le **chiffre de la bourse qui monte** et les **vignettes qui s'allument**.

## Les chiffres

### Les cinq affichages

| | Affichage | Coin | Ce qu'il dit |
|---|---|---|---|
| 1 | Barre de la mairie | haut gauche | dix segments marron, le picto qui dit le palier |
| 2 | Pastilles | haut droite | cinq carrés bleu-acier |
| 3 | Bourse | haut droite, sous les pastilles | le chiffre des pièces, et quatre vignettes |
| 4 | Flèches de rue | bord d'écran, deux tiers hauts | une par rue active, à jauge |
| 5 | Bande de phase | haut centre | le numéro de vague, puis la barre **ou** le grand chiffre |

Cinq, et **la liste est fermée**.

### Les tailles

| Élément | Part de la plus petite dimension de la fenêtre | Bornes |
|---|---:|---:|
| Grand chiffre des zombies restants | 12 % | 48 – 96 px |
| Flèche de rue | 8 % | 32 – 64 px |
| Vignette | 6 % | 28 – 56 px |
| Pastille | 3,5 % | 14 – 28 px |
| Barre de la mairie | 40 % de la **largeur** | 200 – 420 px |

### Les cibles tactiles

| Cible | Position | Taille | Présence |
|---|---|---|---|
| **Frapper** | bas droite | 22 % de la plus petite dimension, borné 96 – 160 px | permanente |
| **Sauter** | à gauche de frapper, même hauteur | 70 % de la cible de frappe, min 64 px | permanente |
| **Agir** | au-dessus de frapper | 70 % de la cible de frappe, min 64 px | **seulement quand une action est possible** |
| **Manche** | moitié gauche, sous la mi-hauteur | flottante | naît sous le pouce |
| **Porte de Sas** | haut centre, sous la bande de phase | — | permanente |

| Marge | Valeur |
|---|---|
| Cible tactile, taille minimale | **44 px** |
| Cible tactile, distance à un bord | `env(safe-area-inset-*)` **+ 32 px** |
| Affichage, distance à un bord | `env(safe-area-inset-*)` **+ 16 px** |

### Les quatre vignettes

| Ordre | Vignette | Prix affiché |
|---:|---|---:|
| 1 | Canon | **40** |
| 2 | Jet de feu — le niveau 2 | **60** |
| 3 | Tapis roulant — le niveau 3 | **120** |
| 4 | Renfort — le palier suivant | **50**, puis **80**, puis **120** indéfiniment |

La **brassée de bombes de feu** — 3 pièces — n'a pas de vignette. Les prix sont ceux du [chapitre 6](06-l-argent.md), et ce chapitre ne fait que les afficher.

### Les deux dispositions

| Ratio de la fenêtre | Disposition |
|---|---|
| ≥ 1 | **large** — la bande du haut sur une ligne |
| < 1 | **étroite** — la bande du haut s'empile |
| largeur < **400 points** | **le Sas s'ouvre**, jusqu'à ce qu'elle s'élargisse |

L'orientation de l'appareil n'entre dans aucune de ces lignes : elle n'est pas verrouillable sur iPad, et Split View comme Stage Manager donnent n'importe quelle proportion.

### Les deux reprises

| | La mémoire a survécu | La page est morte |
|---|---|---|
| Cas | bascule d'application, écran verrouillé, geste système, retour depuis le cache de page | purge mémoire, rechargement, contexte WebGL perdu |
| Reprise | **à l'identique**, tout repart où c'en était | **au début de la préparation de la vague en cours**, depuis l'Instantané |
| Barre de préparation | repart **où elle s'était arrêtée** | repart **pleine** |
| Coût | **nul** | au plus une préparation et l'assaut qui la suivait |

### Ce que porte l'Instantané

| Champ | Contenu |
|---|---|
| Version de format | un entier |
| Vague | 1 et au-delà, **sans plafond** |
| Victoire acquise | un drapeau |
| Mairie | points de vie et plafond, en coups de Traînard |
| Pièces | un entier |
| Canons | par canon : position, hauteur, niveau, contenu de la soute |
| Joueur | ses points de vie |
| Brassée | 0 à 3 |
| Rues actives | 1 à 3 |
| Générateur | son état — graine et compteur de tirages |

Environ **1 Kio de JSON**, écrit **synchronement**. Sans l'état du générateur, la vague reprise ne serait pas celle qui avait commencé.

### Quand il s'écrit, quand il s'efface

| Moment | Ce qui se passe |
|---|---|
| Entrée en préparation | **écriture** |
| Achat pendant une préparation | **écriture** |
| Pendant un assaut | **rien** |
| `visibilitychange`, `pagehide` | **rien** — le disque est déjà à jour |
| Chute de la mairie | **effacement** |
| Lancement d'une nouvelle partie | **effacement** |
| Victoire à la vague 10 | **rien** — la Rallonge garde son filet |
| Version ou format invalide | **effacement silencieux** |

Soit une **trentaine d'écritures d'1 Kio par partie**.

### Les interruptions, et ce que le jeu en fait

| Interruption | Signal | Réponse |
|---|---|---|
| Bascule d'application, écran verrouillé | `visibilitychange` → `hidden` | Sas ; reprise à l'identique |
| Navigation sortante | `pagehide` | Sas ; à l'identique si la page est mise en cache, sinon depuis l'Instantané |
| Purge mémoire | aucun signal, puis chargement neuf | Sas au chargement ; reprise depuis l'Instantané |
| Perte du contexte WebGL | `webglcontextlost` | Sas ; rechargement au bout de **3 s** si rien ne revient ([chapitre 10](10-l-architecture.md)) |
| Manette déconnectée ou focus perdu | `gamepaddisconnected` | Sas, si la manette était la dernière entrée employée |
| Split View, Stage Manager, rotation | `resize`, `visualViewport.resize` | **pas de pause** : on se re-dispose à la volée |
| Fenêtre sous 400 points de large | idem | Sas, jusqu'à ce qu'elle s'élargisse |

Le **verrou de veille** est relâché par le navigateur à chaque passage en arrière-plan, et **ré-acquis à la sortie du Sas**, dans le même gestionnaire d'appui que `ctx.resume()`.

## Les interdits

- **Jamais un sixième affichage** — la liste des cinq est la liste d'exceptions au principe « l'état se lit sur les objets » ; l'allonger par réflexe, c'est perdre le principe.
- **Jamais un affichage qui répète le monde** — le canon à sec, la soute, la brassée, le halo, le losange, le liseré, la mire et le cerne sont déjà lisibles d'un panoramique ; les doubler apprendrait à l'enfant à regarder l'écran plutôt que sa ville.
- **Jamais une carte, une minicarte, un radar ni une vue de dessus** — elles diraient le hors-champ à la place des flèches, et rendraient du même coup indéfendable le refus de toute commande de caméra.
- **Jamais un menu de construction, un magasin, un inventaire ni une mise en pause pour acheter** — le second bouton n'a qu'un sens à un endroit donné, donc il n'y a rien à arbitrer.
- **Jamais un affichage sous un doigt** — le bas de l'écran appartient aux deux pouces, et un chiffre qu'on cache en jouant ne se lit jamais au moment où il compte.
- **Jamais un rouge, ni sur la barre de la mairie ni ailleurs** — le jeu n'en a plus aucun, et c'est la seule forme sous laquelle l'interdit s'applique tout seul ([chapitre 7](07-le-regard.md)).
- **Jamais un multiplicateur, un chiffre flottant, un combo ni un « +2 » qui monte d'une dépouille** — la prime de bravoure se lit à la taille de la pièce, et un prix est une étiquette, pas un score ([chapitre 6](06-l-argent.md)).
- **Jamais un compteur de canons** — il n'existe aucun plafond, donc rien à compter.
- **Jamais un signal d'alarme** — ni tremblement d'écran, ni flash plein écran, ni carton, ni message : une vague qui arrive est une barre qui finit de s'écouler.
- **Jamais une cinématique, jamais une caméra reprise au joueur** — même à l'ouverture d'une rue, qui est pourtant le moment le plus important de la partie.
- **Jamais un texte à lire pour jouer** — ni tutoriel, ni carton « Tourne ta tablette », ni écran d'erreur : l'orientation ne s'impose pas, et une panne ne se raconte pas à un enfant de 8 ans.
- **Jamais une mise en page décidée par l'orientation de l'appareil** — elle n'est pas verrouillable sur iPad, ni par API ni par manifeste ; c'est le ratio de la fenêtre qui décide.
- **Jamais une pause sur redimensionnement** — Split View, Stage Manager et rotation sont des cas ordinaires, pas des interruptions.
- **Jamais un bandeau dessiné en WebGL** — il coûterait des appels d'affichage, et son texte serait flou à `setPixelRatio(1)`.
- **Jamais une écriture du bandeau à chaque image** — il écrit sur événement, et rien d'autre ne le réveille.
- **Jamais une reprise automatique** — Safari exige un appui pour ré-exposer la manette, et l'`AudioContext` ne redémarre de façon fiable que dans un geste utilisateur.
- **Jamais un réglage dans le Sas** — ni volume, ni qualité, ni langue : la qualité de rendu est automatique et ne touche jamais la simulation ([chapitre 10](10-l-architecture.md)), et le son revient ou le jeu se joue muet.
- **Jamais un second écran hors-jeu** — pas d'écran « Appuie sur un bouton », pas d'écran-titre, pas d'écran d'accueil : le Sas est tout cela à la fois.
- **Jamais une nouvelle partie lancée d'un appui simple quand une partie est en cours** — deux grandes portes devant un enfant de 8 ans, un doigt qui glisse, et une vague 8 disparaîtrait.
- **Jamais un instantané qui décrive un assaut** — soixante zombies sur rail, les boulets en cloche déjà partis, les mires posées, les cônes de feu allumés : ce format casserait à chaque retouche d'équilibrage.
- **Jamais une écriture pendant un assaut ni dans un gestionnaire d'interruption** ([chapitre 10](10-l-architecture.md)).
- **Jamais un effacement de l'Instantané à la victoire** — la Rallonge se jouerait sans filet, ce qui est exactement l'accident que l'Instantané existe pour couvrir.
- **Jamais une migration de format, jamais un message d'erreur de sauvegarde** — on jette et on repart au Sas.
- **Jamais un second octet écrit sur l'appareil** — ni record, ni médaille, ni palier de qualité, ni marqueur de premier lancement.
- **Jamais une sonde de stockage au démarrage** — elle exigerait une seconde clé, et s'en passer répare tout seul le cas où le stockage redevient disponible.
- **Jamais le bouton `B`** — la navigation système d'iPadOS le capte ([chapitre 4](04-le-joueur.md)).
- **Jamais une cible tactile près d'un bord** — les gestes système sont inarrêtables depuis le web ; le seul contournement est de s'en éloigner.

## Pourquoi

**Pourquoi la liste des cinq est fermée.** Le principe du jeu était posé avant ce chapitre : l'état se lit sur les objets. Le ravitaillement en est la démonstration complète — les bombes portées sont la brassée au-dessus de la tête, les bombes d'un canon sont les cases de sa soute, un canon à sec a une flamme courte, la portée du tapis est peinte au sol. Aucune de ces choses n'a besoin du bandeau. Ce qui reste, ce sont les cinq exceptions : quatre parce qu'elles n'ont pas d'objet à habiter (l'argent, le temps de préparation, le nombre de zombies encore vivants, ce qui se passe dans une rue où l'on n'est pas), et une parce que l'objet qui la porterait est trop petit et trop souvent de dos — les points de vie du joueur. Écrite comme une liste plutôt que comme un principe, cette exception se referme d'elle-même : ajouter un sixième affichage devient une décision qui se voit, au lieu d'un réflexe qui s'accumule.

**Pourquoi il n'y a pas de carte, et pourquoi c'est structurant.** Les trois rues rayonnent d'une place, il y en a toujours au moins deux hors champ, et il n'existe aucun raccourci : quitter une rue coûte un retour par la place. Le besoin est donc réel — il faut dire ce qui se passe là où l'on n'est pas. Une minicarte y répondrait, et elle coûterait deux choses. Elle apprendrait à l'enfant à jouer en regardant un plan plutôt que sa ville. Et surtout, elle rendrait indéfendable l'autre refus, celui de toute commande de caméra : un joueur qui a une carte veut tourner la tête. Les flèches à jauge répondent à la même question sans jamais dessiner la ville — la couleur dit **laquelle**, le remplissage dit **où en est la colonne**, et deux flèches pleines des deux côtés se lisent d'un coup d'œil.

**Pourquoi il n'y a pas de menu de construction, et pourquoi le problème s'est résolu par suppression.** Un menu existe pour arbitrer entre plusieurs achats qui se disputent le même geste. Ici, aucun ne se les dispute : on pose un canon là où l'on se tient, on améliore celui qui est sous ses pieds, on prend des bombes contre le hangar, on renforce contre la mairie — et le hangar occupe précisément la seule face de la mairie qui ne déclenche pas le Renfort. **Le second bouton n'a jamais qu'un seul sens à un endroit donné**, donc il n'y a rien à arbitrer, donc il n'y a pas de menu. Ce qui restait à décider n'était pas un écran, c'était comment le joueur sait **en courant** ce qu'il peut se payer : c'est la bourse, et c'est tout.

**Pourquoi les prix s'écrivent en chiffres.** « Faire comprendre un prix sans lire un seul mot » est une contrainte mal posée : à 8 ans on lit et on calcule, et s'en priver remplacerait un nombre par une devinette. Ce qui doit rester illisible, c'est le **texte** — pas les chiffres. « Il me faut 40, j'en ai 34 » est une lecture ; une vignette éteinte sans prix ne dit que « non », sans dire combien il manque ni combien de temps il faudra. Le refus du texte reste entier partout ailleurs : le Sas n'a pas un mot, la barre n'a pas de nom, les vignettes ont des pictos.

**Pourquoi deux formes pour les deux jauges.** La mairie et le joueur ont tous deux des points de vie, et une seule des deux barres finit la partie. Si les deux se ressemblaient, l'enfant apprendrait la différence en perdant. Elles sont donc opposées sur trois axes à la fois — **coin** (gauche contre droite), **couleur** (marron contre bleu-acier), **forme** (une barre continue qui s'effrite contre cinq unités discrètes qui reviennent). La règle de placement en découle et vaut pour tout le reste : **gauche, c'est la ville ; droite, c'est toi**.

**Pourquoi la barre de la mairie est marron.** Le rouge lui était réservé, sous l'argument que le rouge est interdit dans le monde mais permis dans le bandeau, qui a son propre fond. L'exception était vraie et coûteuse : tant qu'un rouge subsistait quelque part, l'interdit demandait à être rappelé à chaque décision. En passant la barre au marron, le jeu se retrouve **sans un seul rouge**, et l'interdit s'applique tout seul — c'est la seule forme sous laquelle un interdit se tient sans surveillance.

**Pourquoi le picto de mairie change de matériau au lieu d'afficher le palier.** Un palier de Renfort est un chiffre de 1 à 3 qui ne veut rien dire pour un enfant. Le matériau, lui, se compare — le bois, les barricades, la pierre, les créneaux vont clairement du plus fragile au plus solide — et il **répète ce que le bâtiment fait déjà dans le monde**, ce qui est la seule duplication que ce chapitre autorise : elle apprend le lien entre les deux plutôt que d'ajouter une information.

**Pourquoi deux reprises et jamais une seule.** Reprendre exactement où l'on en était est **gratuit** quand la mémoire est là : il n'y a rien à sérialiser, il suffit de ne pas faire avancer le temps. C'est le cas courant — un enfant qui part dix secondes regarder une notification. Reprendre depuis un instantané coûte un format à écrire et à maintenir, et c'est pour cela qu'il ne décrit **jamais un assaut** : soixante zombies avec leur avancement, les boulets en cloche déjà partis, les mires, les cônes de feu et les soutes formeraient un format qui casserait à chaque retouche d'équilibrage, pour un cas rare. Une frontière de vague, elle, tient en dix champs et ne bouge plus. Le prix de ce choix est écrit et assumé : une purge mémoire en plein assaut coûte au plus une préparation et l'assaut qui la suivait.

**Pourquoi le jeu n'écrit jamais au moment de l'interruption.** C'est la propriété qu'on cherchait, et elle est plus solide qu'un gestionnaire bien écrit : `pagehide` ne garantit aucun `await`, `visibilitychange` ne part pas toujours sur WebKit, et une purge mémoire n'émet rien du tout. Puisque l'Instantané ne décrit qu'une frontière de vague et que les seuls événements qui le changent sont l'entrée en préparation et les achats de cette préparation, **le disque est déjà à jour** aux moments précis où le navigateur ne promet plus rien. Il n'y a rien à sauver dans l'urgence parce qu'il n'y a jamais rien en retard.

**Pourquoi le Sas est un écran et non trois.** Safari **exige** un appui bouton avant de ré-exposer une manette, et l'`AudioContext` ne redémarre de façon fiable que dans un geste utilisateur : un écran « Appuie sur un bouton » était donc obligatoire au démarrage et après chaque retour d'arrière-plan. Plutôt que trois écrans qui se ressemblent — accueil, pause, reprise —, il y en a **un**, et son appui de sortie fait le triple travail : la manette, le son, le verrou de veille. Une brique de moins à dessiner, un comportement de moins à tenir, et une place naturelle pour la fin de partie.

**Pourquoi l'appui maintenu plutôt qu'une confirmation.** Deux grandes portes devant un enfant de 8 ans, un doigt qui glisse, et une partie de la vague 8 disparaît. Une confirmation écrite est exclue — le Sas n'a pas un mot. Un anneau qui se remplit en une seconde dit la même chose sans texte, se comprend au premier essai, et s'annule en relâchant. Il produit un gain de côté : **le bandeau n'a plus besoin d'un bouton « abandonner »**, puisque quitter une partie mal engagée passe par là.

**Pourquoi l'Instantané survit à la victoire.** Il était d'abord effacé « à la victoire, à la chute de la mairie ou au lancement d'une nouvelle partie ». La Rallonge continue la partie *après* la victoire : pris à la lettre, un joueur qui enchaîne jouerait donc **sans filet**, et une purge mémoire à la vague 14 lui coûterait tout — précisément l'accident que l'Instantané existe pour couvrir. Il est donc effacé **à la sortie de la partie**, et le drapeau *victoire acquise* est ce qui permet de reprendre en Rallonge sans avoir à regagner la vague 10. Coût : un booléen dans 1 Kio.

**Pourquoi aucune migration de format.** Rien n'est conservé d'une partie à l'autre : perdre un instantané ne coûte jamais rien de durable. Une migration serait donc du code jamais testé, écrit pour un gain nul, et qu'il faudrait tenir toute la vie du projet. Un entier de version, un effacement silencieux, et le Sas qui n'ouvre plus que *Nouvelle partie* : le cas est réglé une fois.

**Pourquoi rien d'autre ne s'écrit sur l'appareil.** Trois candidats ont été refusés en connaissance de cause. Un **record** ne descend jamais, donc la plupart des parties finiraient en dessous de lui, et l'écran de fin cesserait d'être doux pour devenir une comparaison avec le meilleur jour ; sur un iPad de famille, le 17 d'un grand frère deviendrait le plafond du petit. Une **médaille** — un seul bit, « tu as déjà gagné une fois » — échappe à toutes ces objections, et c'est pour cela qu'elle mérite un refus motivé : il lui faudrait un endroit, or le Sas n'a ni texte ni réglage, et surtout **elle dépenserait la victoire**, la deuxième devenant « déjà eue ». Un **palier de qualité** persisté serait faux aussi souvent que juste — Split View, économie d'énergie, échauffement — et l'échelle converge d'elle-même en quelques secondes : un réglage de rendu se retrouve à chaque lancement, il ne se retient pas.

**Pourquoi le jeu ne dit rien quand le stockage manque.** Un Safari réglé sur « bloquer tous les cookies » fait lever une exception à la **lecture même** de `window.localStorage`. La posture est la même que pour le son : un jeu sans filet reste jouable, un jeu bloqué sur une erreur ne l'est pas — et une icône d'avertissement ne servirait qu'à inquiéter un enfant qui n'y peut rien. Si des écritures échouent en cours de partie, le dernier instantané réussi reste bon : on reprend une vague plus tôt, ce qui vaut mieux que rien.

**Pourquoi le bandeau est en DOM et non en WebGL.** Trois gains d'un coup : **zéro appel d'affichage** sur les 80 du budget, un **texte net** malgré `setPixelRatio(1)` — les prix sont des chiffres, il faut qu'ils se lisent —, et `env(safe-area-inset-*)` comme la re-disposition offerts par le navigateur. Le prix à payer est de ne jamais écrire dans le DOM à chaque image, ce qui tombe bien : le tampon d'événements dit déjà ce qui vient de se passer, et le reste tient en une poignée de scalaires comparés.

**Pourquoi la mise en page suit le ratio et non l'orientation.** L'orientation n'est pas verrouillable sur iPad, ni par API ni par manifeste, et la fenêtre peut prendre n'importe quelle proportion en Split View ou en Stage Manager. « Portrait » et « paysage » ne décrivent donc pas ce qu'il faut savoir. Deux dispositions suffisent — large et étroite —, et un seul seuil met en pause : **sous 400 points de large, les commandes tactiles ne tiennent plus**, et le Sas est la seule réponse honnête.

**Pourquoi les échelles se mettent à pulser à la fin de l'assaut 2.** C'était la question ouverte de tout le projet : le losange dit « tu peux poser » une fois qu'on est en haut, mais rien ne disait de monter. Le moment est choisi par l'économie et non par un calendrier — c'est à la fin de l'assaut 2 que le versement porte la bourse à 43 pièces, soit le premier canon payable. Deux signaux partent alors ensemble, et ils disent deux choses différentes : la vignette qui s'allume dit **« tu peux acheter »**, les échelles qui pulsent disent **« monte »**. Elles s'arrêtent définitivement à la pose du premier canon, parce qu'un signal permanent n'est plus un signal. Sur le toit, le losange et le liseré prennent le relais, et l'enfant apprend en grimpant que le cercle grandit.

**Pourquoi l'ouverture d'une rue se joue dans le bandeau plutôt qu'avec la caméra.** C'est le moment le plus important de la partie à faire comprendre sans texte, et la tentation serait de montrer la rue en reprenant la caméra. Le jeu ne la reprend jamais : à 8 ans, perdre le contrôle de son personnage pendant qu'une vague se prépare est une punition, pas une annonce. La flèche fait le travail depuis l'écran — elle **naît en blanc**, ce qui est le mot du jeu pour « ça vient de se passer », grandit deux fois, puis prend la couleur qu'elle gardera toute la partie. Elle apparaît même si la rue est déjà à l'écran, parce que c'est **la naissance de la flèche** qui est le message, pas la position de la rue.

## D'où ça vient

[#15](https://github.com/ben-barbier/apocalypse-zombie/issues/15) pour l'essentiel : la liste fermée des cinq affichages, les deux règles de placement, le refus de la carte et celui du menu de construction, les flèches à jauge et leurs trois couleurs, la barre de la mairie passée au marron avec son picto à matériau, les cinq pastilles, la bourse et ses quatre vignettes chiffrées, la bande de phase et son grand chiffre, les cibles tactiles avec leurs tailles et leurs marges, le bandeau en DOM écrit sur événement, les deux dispositions par ratio, les trois moments à faire comprendre sans texte, et l'absence de tout signal d'alarme. [#17](https://github.com/ben-barbier/apocalypse-zombie/issues/17) pour le Sas comme unique écran hors-jeu et ses deux portes, les deux reprises, le format de l'Instantané et sa discipline d'écriture, l'effacement silencieux d'un format invalide, le refus de toute migration, la conduite à tenir sur perte de contexte WebGL, la table des interruptions, et les trois règles du son. [#42](https://github.com/ben-barbier/apocalypse-zombie/issues/42) pour le refus motivé du record, de la médaille et du palier de qualité persisté, la clé unique et gelée, et le comportement silencieux quand le stockage n'existe pas. [#13](https://github.com/ben-barbier/apocalypse-zombie/issues/13) pour l'état du générateur dans l'Instantané et la borne de 100 ms. [#20](https://github.com/ben-barbier/apocalypse-zombie/issues/20) pour l'Instantané qui survit à la victoire, le drapeau *victoire acquise*, le numéro de vague sans plafond et la troisième flèche. [#11](https://github.com/ben-barbier/apocalypse-zombie/issues/11) pour les prix affichés et les trois interdits de la bourse. [#16](https://github.com/ben-barbier/apocalypse-zombie/issues/16) pour les dix segments quel que soit le palier. [#22](https://github.com/ben-barbier/apocalypse-zombie/issues/22) pour les cinq points de vie et la contrainte de lecture entre les deux jauges. [#9](https://github.com/ben-barbier/apocalypse-zombie/issues/9) pour tout ce que le ravitaillement interdit d'afficher. [#7](https://github.com/ben-barbier/apocalypse-zombie/issues/7) pour le compteur de zombies restants et l'annonce des rues actives. [#23](https://github.com/ben-barbier/apocalypse-zombie/issues/23) pour le vocabulaire du blanc et du noir. [#3](https://github.com/ben-barbier/apocalypse-zombie/issues/3) pour l'orientation non verrouillable, les gestes système inarrêtables et l'appui bouton qu'exige Safari.
