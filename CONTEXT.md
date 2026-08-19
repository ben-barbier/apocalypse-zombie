# Apocalypse Zombie

Tower defense 3D en style voxel, vue à la 3e personne, pour un enfant de 8 ans. Ce fichier est le **glossaire** du projet : le vocabulaire tranché, et lui seul. Les décisions vivent dans les tickets de la [carte de conception](https://github.com/ben-barbier/apocalypse-zombie/issues/1), pas ici.

Les termes s'y ajoutent **au fil des tickets**, quand ils sont réellement tranchés.

## Language

### La ville

**Ville** :
Le terrain de jeu entier, 176 × 176 blocs, fait à la main et figé. Une seule ville en v1. Elle a la forme d'une **étoile à trois branches** : tout ce qui se joue tient dans les trois rues, sur la place, et sur les toits qui les bordent — le reste est un décor que la brume efface.

**Place** :
Le moyeu de l'étoile, 32 blocs de bord à bord, au milieu duquel se dresse la mairie. C'est le **seul passage d'une rue à l'autre** : il n'existe aucun raccourci.
_Éviter_ : centre-ville, esplanade

**Rue** :
Une des trois avenues droites de 60 blocs, larges de 6, qui rayonnent de la place à 120° l'une de l'autre. C'est le terrain de jeu du tower defense : un Traînard y passe 40 secondes sous le feu des canons posés sur les toits qui la bordent, un Costaud une minute.
_Éviter_ : route (ancien nom), avenue, couloir

**Front bâti** :
La double rangée de bâtiments qui borde une rue sur 8 blocs de profondeur, et qui ferme la place entre deux rues. Continu, indestructible et infranchissable : on n'entre jamais dans un bâtiment, on monte sur son toit.
_Éviter_ : anneau (ancien nom), mur, rempart, immeubles

**Portique** :
L'arche de couleur fixe qui se dresse à l'entrée d'une rue, **du côté de la place**, et l'identifie toute la partie. Allumé et pulsant quand la rue est active, éteint et barré sinon. Jamais au fond de la rue : c'est depuis la place qu'il doit s'annoncer.
_Éviter_ : arche, porte, balise

**Mairie** :
Le bâtiment à défendre, au centre de la place. Elle vaut **200 coups de Traînard**, soit dix canons au sol, et ses points de vie ne se régénèrent jamais : chacun est perdu définitivement, et seul un **renfort** les rend. À zéro, la partie s'achève. Elle offre au moins trois faces libres depuis la place, le hangar de la base n'en occupant qu'une.
_Éviter_ : QG, base, hôtel de ville

**Base** :
Le hangar du joueur, adossé à la mairie, où se prennent les bombes de feu. Distinct de la mairie.
_Éviter_ : dépôt, stock, entrepôt

**Échelle** :
L'accès extérieur qui relie le sol au toit d'un bâtiment ; il y en a une par bâtiment. On y monte **automatiquement** : marcher dessus en poussant vers le bâtiment suffit, l'épée se range, et on ressort en haut prêt à frapper — 0,8 seconde, rien à doser. Elle redescend de la même manière.
_Éviter_ : escalier, escalade, grimper

**Extérieur** :
Le décor sommaire au-delà des fronts bâtis, d'où sortent les zombies. Non praticable par le joueur.

### Le rythme

**Partie** :
Dix vagues. Les tenir toutes, c'est gagner.

**Vague** :
Un cycle en deux temps : un assaut, puis une préparation. Numérotée de 1 à 10.

**Assaut** :
La phase pendant laquelle les zombies entrent. **Aucun chrono n'y tourne** : elle s'achève à la mort du dernier zombie.
_Éviter_ : attaque, combat, manche

**Préparation** :
La phase entre deux assauts, de durée fixe, dont la barre s'écoule automatiquement. Aucun bouton ne la déclenche ni ne l'allonge.
_Éviter_ : pause, entracte, intervalle

**Sas** :
L'unique écran hors-jeu : accueil au chargement, pause d'interruption et pause voulue à la fois. La partie s'y fige et s'assombrit derrière deux tuiles sans un mot de texte — reprendre, d'un appui, ou recommencer, d'un appui **maintenu une seconde**. Rien ne reprend jamais tout seul : c'est l'appui qui sort du Sas qui rend la manette, le son et le verrou de veille.
_Éviter_ : pause, menu, accueil, écran-titre

**Instantané** :
La copie de l'état de partie écrite à chaque entrée en préparation, et à chaque achat de cette préparation. Elle décrit une **frontière de vague**, jamais un assaut : si la page meurt, on reprend au début de la préparation en cours, barre pleine, et jamais au milieu d'un combat. Elle ne conserve rien d'une partie à l'autre — elle disparaît avec la partie qu'elle décrit.
_Éviter_ : sauvegarde, checkpoint, état

### Les zombies

**Zombie** :
Un assaillant. Bête et comique, jamais effrayant. Tous les types partagent les six mêmes parties de corps ; seules la couleur, l'échelle, la vitesse et le comportement les distinguent.

**Traînard** :
Le zombie de base, vert pâle, lent, tué en un coup d'épée. Présent à toutes les vagues.
_Éviter_ : zombie normal, zombie de base, basique

**Sprinteur** :
Le zombie rapide, rouge vif et plus petit, apparu à la vague 4. Tué en un coup ; le danger vient de sa vitesse.
_Éviter_ : coureur, rapide

**Costaud** :
Le zombie résistant, bleu-violet et plus grand, apparu à la vague 7. C'est lui qui rend l'épée insuffisante.
_Éviter_ : tank, gros, blindé

**Colosse** :
L'unique zombie géant doré de la vague 10, très lent et très résistant, escorté. Il entre **en premier**, visible d'emblée au bout de sa rue, et met une minute et demie à la descendre.
_Éviter_ : boss, chef, géant

**Rail** :
Le tracé fixe qu'un zombie suit, de son entrée jusqu'à la mairie : tout droit, le long de sa rue. Un rail par rue ; un zombie n'en sort jamais, mais il s'en écarte latéralement pour que le paquet occupe la largeur de la rue.
_Éviter_ : chemin, trajet, itinéraire

**Avancement** :
La progression d'un zombie le long de son rail. Elle ne décroît jamais — c'est la garantie qu'un assaut se termine toujours.

**Paquet** :
Les **quatre zombies d'un même type** qui entrent d'un coup par une rue, occupant sa largeur. Un assaut est une suite de paquets, jamais un flot continu, et un paquet ne mélange jamais deux types : un paquet est une menace, et une réponse.
_Éviter_ : groupe, vague (réservé au cycle), salve

**Cadence** :
Le rythme d'entrée des paquets : **un paquet toutes les six secondes, dans chaque rue active**. Elle ne varie d'aucune vague — c'est l'effectif de la vague qui dit combien de paquets, donc quelle longueur de colonne. Six secondes valent neuf blocs entre deux paquets : sept paquets tiennent dans une rue.
_Éviter_ : débit, fréquence, spawn rate

**Colonne** :
La vague entière étirée le long de sa rue, du paquet de tête à celui qui entre encore. C'est la forme d'un assaut : la rue **est** pleine, parce qu'une vague entre plus vite qu'elle ne se vide — un Traînard met quarante-huit secondes à rejoindre la mairie, une vague en met trente-huit à entrer. Le nombre de zombies vivants ne peut donc jamais dépasser l'effectif de la vague.
_Éviter_ : file, flot, horde

**Fuite** :
Un zombie qui atteint la mairie et se met à frapper. Elle se compte en **points de vie de mairie**, jamais en zombies : sa durée est celle du retour du joueur — six secondes depuis la place, quatorze depuis le fond d'une rue. C'est le même gradient que le ravitaillement, appliqué aux dégâts : jouer en avant coûte plus cher quand ça passe.
_Éviter_ : passage, percée, leak

**Escorte** :
Les Costauds qui accompagnent le Colosse à la vague 10, ralentis à son pas et massés autour de lui. Ils entrent avec lui, dès la première seconde de l'assaut, et **occupent une rue à eux seuls** — tout le reste de la vague descend l'autre.

### Le joueur

**Joueur** :
Le personnage dirigé par l'enfant, suivi à la troisième personne. Bâti sur les six mêmes boîtes qu'un zombie — c'est la grammaire commune à tous les personnages — plus l'épée qu'il tient en main. Tunique bleue et acier clair : les seules couleurs froides portées par un personnage, pour qu'il ne soit jamais confondu avec un assaillant.

**Course** :
La seule allure du joueur : 5 blocs par seconde, toujours. Il n'y a ni marche, ni sprint, ni saut. C'est elle qui chiffre le ravitaillement, et elle en fait un **gradient** le long d'une rue : gratuit au pied (le halo y suffit), un aller-retour de la préparation au milieu, et un aller-retour qui déborde sur l'assaut au fond — 34 secondes pour le toit le plus lointain, quand la préparation en dure 30.
_Éviter_ : vitesse, marche, sprint

**Caméra** :
La vue de dos : 6,5 blocs derrière le joueur, 5,5 au-dessus de son sol. Elle se replace derrière lui dès qu'il court, et **grimpe** au-dessus du bâtiment qui s'interpose plutôt que de se coller à son dos — jamais moins de 3,2 blocs de recul. Elle ignore l'auto-ciblage : le joueur pivote, elle non.
_Éviter_ : vue, point de vue, angle

**Épée** :
L'arme de corps-à-corps du joueur, la seule qu'il porte. Elle ne s'achète pas, ne s'améliore pas et ne se remplace pas : elle vaut un coup d'épée du début à la fin de la partie.

**Fauchée** :
La zone qu'un coup d'épée balaie devant le joueur : un secteur de 120° sur 3 blocs, haut de 1,5 bloc au-dessus et au-dessous de lui. Tout ce qui s'y trouve est touché d'un seul coup — on ne frappe jamais une cible unique.
_Éviter_ : arc, cône (réservé au jet de feu), balayage

**Étourdissement** :
La seconde d'immobilité qui suit un contact avec un zombie, pendant laquelle le joueur ne frappe pas. Elle est suivie d'une seconde d'invulnérabilité : le joueur ne peut donc pas perdre plus d'un point de vie toutes les deux secondes.
_Éviter_ : stun, KO, assommé

### Les défenses

**Coup d'épée** :
L'unité de dégâts infligés aux zombies. Les points de vie d'un zombie se comptent en coups d'épée de base ; toute autre source de dégâts s'exprime dans cette unité.

**Coup de Traînard** :
L'unité de dégâts infligés aux constructions. Les points de vie de la mairie et des canons au sol se comptent en coups de Traînard.

**Canon** :
Une tourelle achetée avec l'argent gagné, posée là où le joueur se tient — sur un toit ou au sol. Trois niveaux. Au sol, elle ne bloque pas les zombies mais s'use sous leurs coups ; sur un toit, elle est intouchable.
_Éviter_ : tourelle, tour, défense

**Boulet** :
L'arme de longue portée du canon, à tous les niveaux. Tir en cloche, munitions infinies, une cible à la fois. Sa portée grandit avec la hauteur du toit.

**Jet de feu** :
L'arme de courte portée du canon, à partir du niveau 2. Un cône de flammes qui brûle tout ce qui s'y trouve. Sa portée ne grandit jamais avec la hauteur : le feu est l'arme du sol et des toits bas. Il ne consomme rien pour fonctionner et **ne s'allume qu'en présence d'un zombie dans son cône** — une flamme allumée signale donc, à elle seule, qu'un zombie est là. Il est toujours blanc-bleu : son état se lit à la longueur de la flamme, courte sans bombes et longue quand il est nourri, jamais à sa couleur.
_Éviter_ : lance-flamme, flammes, souffle

**Bombe de feu** :
Le carburant du jet de feu, acheté à la pièce et porté depuis la base. Une bombe brûle six secondes de jet à pleine puissance. Elle ne tombe jamais : le joueur touché la garde.

**Brassée** :
Les bombes de feu que le joueur porte sur lui — trois au plus, soit exactement une soute. Visible au-dessus de sa tête, jamais dans le HUD.
_Éviter_ : inventaire, sac, chargement

**Soute** :
La réserve de bombes de feu d'un canon : trois cases, ce qu'un seul trajet suffit à remplir. Visible sur le canon lui-même, jamais dans le HUD.
_Éviter_ : stock, magasin, chargeur

**Tapis roulant** :
Le niveau 3 du canon, qui automatise le ravitaillement depuis la base. Il ne change rien d'autre : un canon de niveau 3 tire exactement comme un canon de niveau 2. Il apparaît d'un coup à l'achat, ne se trace pas, ne se détruit pas, et n'atteint que les canons posés dans le halo.
_Éviter_ : convoyeur, automatisation

**Halo** :
Les pavés clairs peints au sol et sur les toits, qui marquent jusqu'où le tapis roulant porte depuis la base. Un canon posé dehors ne passera jamais au niveau 3. Depuis une base au moyeu, ses 16 blocs couvrent la place et le **pied** des rues, jamais leur fond : un canon avancé se ravitaille à pied pour toute la partie, et celui du fond d'une rue se ravitaille sous le feu.
_Éviter_ : zone, rayon, cercle

**Ravitaillement** :
Le fait d'apporter des bombes de feu de la base à un canon. Toujours un choix d'optimisation, jamais une obligation.
_Éviter_ : recharge, approvisionnement

**Renfort** :
Le seul achat qui porte sur la mairie. Il la remet **entièrement à neuf** et monte son plafond de points de vie — c'est la règle du canon qu'on améliore, appliquée au bâtiment : il n'existe ni réparation séparée, ni armure. Trois paliers, puis un rachat qui ne fait plus que remettre à neuf, indéfiniment. Son prix ne bouge pas, sa valeur si : elle se lit dans la barre, pas dans un tableau. S'achète en plein assaut, contre la mairie, comme on améliore un canon.
_Éviter_ : réparation, amélioration de mairie, armure, bouclier

### La lumière

**Heure orange** :
L'unique lumière du jeu : un soleil haut de 60° qui ne bouge jamais — ni entre les vagues, ni pendant une partie. Elle pose la règle de couleur du jeu entier : **la ville est chaude, ce qui se joue est froid**. Un repère de jeu se distingue par sa température, jamais par un orange de plus. Le nom lui reste de sa palette et de sa brume, pas d'une heure du jour : à 30°, l'anneau mettait la place entière à l'ombre et le sol jouable devenait froid.
_Éviter_ : coucher de soleil, golden hour, heure rasante, ambiance

**Soleil** :
La direction d'où vient la lumière, et rien de plus : **aucune ombre portée n'existe dans ce jeu**. Une directionnelle à 60°, doublée d'une ambiante violette qui remplit les faces à contre-jour. Aucune lumière ponctuelle n'existe non plus : rien, ici, n'éclaire son voisinage. Le relief se lit donc à la valeur des faces et à la brume — jamais à une ombre.
_Éviter_ : directionnelle, astre, lampe, ombre portée

**Brume** :
Le voile orange qui épaissit avec la distance et efface l'extérieur au-delà des fronts bâtis. Elle laisse voir le fond d'une rue — c'est de là que sortent les zombies, il faut les voir venir. Structurelle, pas décorative : c'est elle qui dispense de détailler ce qu'on ne joue pas.
_Éviter_ : brouillard, fog, halo (réservé au tapis roulant)

**Éclat** :
Le petit cube d'un quart de bloc, seule primitive d'effet du jeu. Tout ce qui est ponctuel et éphémère en est fait : les débris d'un zombie qui meurt, l'arc de la fauchée, le boulet et sa traînée, la pièce, la mire. Jamais transparent, jamais remplacé par une image : il s'efface en s'éclaircissant vers le blanc.
_Éviter_ : particule, débris, sprite

**Mire** :
Les quatre éclats noirs posés à plat qui marquent où un boulet va tomber, et qui se resserrent pendant sa chute. C'est elle qui rend la trajectoire en cloche lisible, sans que l'enfant ait à suivre le boulet des yeux.
_Éviter_ : viseur, réticule, cible

**Cerne** :
Le liseré noir qui entoure ce qui se ramasse — la pièce et la bombe de feu, rien d'autre. Seule exception au principe « aucune tuile n'est cernée » : un cerne noir veut dire « prends-moi ».
_Éviter_ : contour, bordure, outline

**Losange** :
Le repère posé au sol sous les pieds du joueur, qui dit ce que fera le bouton d'action : blanc et large, on pose un canon ; blanc, serré et pulsant, on améliore celui qui est là ; noir et élargi, c'est impossible. Il vit dans le monde, jamais dans le HUD.
_Éviter_ : curseur, indicateur, marqueur

**Tuile** :
L'image de 16 × 16 pixels qui habille une face de bloc, filtrée en `nearest` et répétée à chaque bloc. Dégradé vertical et grain, jamais de cerne. Elle doit rester lisible à ×3 — ce qu'un bloc mesure à l'écran en jeu.
_Éviter_ : sprite, carreau, image

### L'argent

**Pièce** :
L'unité d'argent, et la seule. Il en tombe **une par zombie tué**, dont la **taille dit la valeur** — un Costaud en lâche une plus grosse qu'un Traînard, et un zombie tué à l'épée une plus grosse encore. Elle est **aimantée** : à moins de 4 blocs, elle file vers le joueur. Elle **ne périme jamais** — courir la chercher, c'est l'avoir tout de suite, donc pouvoir acheter en plein assaut ; ne pas courir ne coûte rien, la prime de fin d'assaut la ramassera. Tout s'achète avec — canons, améliorations, bombes de feu, renforts de mairie — et rien d'autre ne les limite : on achète ce qu'on peut se payer, à n'importe quel moment.
_Éviter_ : or, argent (comme unité), score

**Prime de bravoure** :
Le **doublement** de la valeur d'un zombie tué à l'épée plutôt que laissé aux canons. Elle ne s'affiche nulle part : elle se lit à la **taille de la pièce**, plus grosse, et c'est tout son enseignement. C'est ce qui garde le corps-à-corps rentable jusqu'à la dernière vague — et, parce qu'elle **substitue au lieu d'ajouter** (c'est le même zombie), c'est aussi elle qui empêche la ville de se couvrir de canons : chaque canon posé vole des kills à l'épée et rabote le revenu qui achèterait le suivant.
_Éviter_ : bonus, multiplicateur, combo

**Prime de fin d'assaut** :
Les pièces que la mairie verse à la mort du dernier zombie, avec tout ce qui traîne encore au sol, crédité sans rien avoir à ramasser. C'est la **seule ponctuation d'un assaut**, qui n'a aucun chrono : rien d'autre ne dit « tu as tenu ». Fixe d'une vague à l'autre, donc énorme à la vague 1 et négligeable à la vague 10 — elle finance le premier canon et disparaît d'elle-même ensuite.
_Éviter_ : bonus de vague, récompense, score
