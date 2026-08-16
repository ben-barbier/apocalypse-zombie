# Apocalypse Zombie

Tower defense 3D en style voxel, vue à la 3e personne, pour un enfant de 8 ans. Ce fichier est le **glossaire** du projet : le vocabulaire tranché, et lui seul. Les décisions vivent dans les tickets de la [carte de conception](https://github.com/ben-barbier/apocalypse-zombie/issues/1), pas ici.

Les termes s'y ajoutent **au fil des tickets**, quand ils sont réellement tranchés.

## Language

### La ville

**Ville** :
Le terrain de jeu entier, 64 × 64 blocs, fait à la main et figé. Une seule ville en v1.

**Place** :
L'esplanade centrale de 24 × 24 blocs, au milieu de la ville, où se dresse la mairie.
_Éviter_ : centre-ville, esplanade

**Anneau** :
La ceinture continue de bâtiments qui entoure la place. Indestructible et infranchissable.
_Éviter_ : mur, rempart, enceinte

**Route** :
Une des trois brèches qui percent l'anneau. Seul chemin par lequel un zombie entre dans la place.
_Éviter_ : rue, entrée, couloir

**Portique** :
L'arche de couleur fixe qui surmonte une route et l'identifie toute la partie. Allumé et pulsant quand la route est active, éteint et barré sinon.
_Éviter_ : arche, porte, balise

**Mairie** :
Le bâtiment à défendre, au centre de la place. Ses points de vie ne se régénèrent jamais ; à zéro, la partie s'achève.
_Éviter_ : QG, base, hôtel de ville

**Base** :
Le hangar du joueur, adossé à la mairie, où se prennent les bombes de feu. Distinct de la mairie.
_Éviter_ : dépôt, stock, entrepôt

**Extérieur** :
Le décor sommaire au-delà de l'anneau, d'où sortent les zombies. Non praticable par le joueur.

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
L'unique zombie géant doré de la vague 10, très lent et très résistant, escorté.
_Éviter_ : boss, chef, géant

**Rail** :
Le tracé fixe qu'un zombie suit, de son entrée jusqu'à la mairie. Un rail par route ; un zombie n'en sort jamais.
_Éviter_ : chemin, trajet, itinéraire

**Avancement** :
La progression d'un zombie le long de son rail. Elle ne décroît jamais — c'est la garantie qu'un assaut se termine toujours.

**Paquet** :
Le petit groupe de zombies qui entre d'un coup par une route. Un assaut est une suite de paquets, jamais un flot continu.
_Éviter_ : groupe, vague (réservé au cycle), salve

**Escorte** :
Les Costauds qui accompagnent le Colosse à la vague 10, ralentis à son pas et massés autour de lui.

### Le joueur

**Joueur** :
Le personnage dirigé par l'enfant, suivi à la troisième personne. Bâti sur les six mêmes boîtes qu'un zombie — c'est la grammaire commune à tous les personnages — plus l'épée qu'il tient en main. Tunique bleue et acier clair : les seules couleurs froides portées par un personnage, pour qu'il ne soit jamais confondu avec un assaillant.

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
L'arme de courte portée du canon, à partir du niveau 2. Un cône de flammes continu qui brûle tout ce qui s'y trouve. Sa portée ne grandit jamais avec la hauteur : le feu est l'arme du sol et des toits bas. Il ne s'éteint jamais — à sec, il faiblit.
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
Les pavés clairs peints au sol et sur les toits, qui marquent jusqu'où le tapis roulant porte depuis la base. Un canon posé dehors ne passera jamais au niveau 3.
_Éviter_ : zone, rayon, cercle

**Ravitaillement** :
Le fait d'apporter des bombes de feu de la base à un canon. Toujours un choix d'optimisation, jamais une obligation.
_Éviter_ : recharge, approvisionnement

### La lumière

**Heure orange** :
L'unique heure du jeu : un soleil couchant, rasant, qui ne bouge jamais — ni entre les vagues, ni pendant une partie. Elle pose la règle de couleur du jeu entier : **la ville est chaude, ce qui se joue est froid**. Un repère de jeu se distingue par sa température, jamais par un orange de plus.
_Éviter_ : coucher de soleil, golden hour, ambiance

**Soleil** :
La seule lumière qui projette une ombre. Une directionnelle rasante, doublée d'une ambiante violette qui remplit les faces à contre-jour. Aucune lumière ponctuelle n'existe : rien, dans ce jeu, n'éclaire son voisinage.
_Éviter_ : directionnelle, astre, lampe

**Brume** :
Le voile orange qui épaissit avec la distance et efface l'extérieur au-delà de l'anneau. Structurelle, pas décorative : c'est elle qui dispense de détailler ce qu'on ne joue pas.
_Éviter_ : brouillard, fog, halo (réservé au tapis roulant)

**Tuile** :
L'image de 16 × 16 pixels qui habille une face de bloc, filtrée en `nearest` et répétée à chaque bloc. Dégradé vertical et grain, jamais de cerne. Elle doit rester lisible à ×3 — ce qu'un bloc mesure à l'écran en jeu.
_Éviter_ : sprite, carreau, image

### L'argent

**Pièce** :
L'unité d'argent, et la seule. Elle tombe de chaque zombie tué, pour une valeur qui dépend de son type. Tout s'achète avec — canons, améliorations, bombes de feu, renforts de mairie — et rien d'autre ne les limite : on achète ce qu'on peut se payer.
_Éviter_ : or, argent (comme unité), score

**Prime de bravoure** :
Le supplément de pièces gagné en tuant un zombie à l'épée plutôt qu'en le laissant aux canons. C'est ce qui garde le corps-à-corps rentable jusqu'à la dernière vague.
_Éviter_ : bonus, multiplicateur, combo
