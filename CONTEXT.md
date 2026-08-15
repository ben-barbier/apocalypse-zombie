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
Le carburant du jet de feu, à porter depuis la base. Le joueur touché la lâche.

**Soute** :
La réserve de bombes de feu d'un canon. Visible sur le canon lui-même, jamais dans le HUD.
_Éviter_ : stock, magasin, chargeur

**Tapis roulant** :
Le niveau 3 du canon, qui automatise le ravitaillement depuis la base. Il ne change rien d'autre : un canon de niveau 3 tire exactement comme un canon de niveau 2.
_Éviter_ : convoyeur, automatisation

**Ravitaillement** :
Le fait d'apporter des bombes de feu de la base à un canon. Toujours un choix d'optimisation, jamais une obligation.
_Éviter_ : recharge, approvisionnement

### L'argent

**Pièce** :
L'unité d'argent, et la seule. Elle tombe de chaque zombie tué, pour une valeur qui dépend de son type. Tout s'achète avec — canons, améliorations, bombes de feu, renforts de mairie — et rien d'autre ne les limite : on achète ce qu'on peut se payer.
_Éviter_ : or, argent (comme unité), score
