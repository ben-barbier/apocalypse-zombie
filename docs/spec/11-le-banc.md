# Le banc d'équilibrage

Ce chapitre décide ce que le banc joue et à quoi on regarde le résultat : le pilote unique et ses cinq réglages, les trois profils, les huit indicateurs, la grille de seuils, les deux verdicts et les quatre balayages, ce que `npm run bench` imprime et le code qu'il rend, et la partie de référence gelée. L'outil lui-même — sa place dans l'arborescence, sa garde, son second générateur — est au [chapitre 10](10-l-architecture.md) ; les trois leviers qu'il autorise sont la table du [chapitre 3](03-les-zombies.md), les prix du [chapitre 6](06-l-argent.md) et la portée du [chapitre 5](05-les-canons.md).

## Les règles

**Ce que le banc fait, et ce qu'il ne fait pas**

1. Le banc joue des parties **entières et sans rendu**, à barème injecté et à hasard semé : une partie vaut environ 55 000 pas et une seconde de calcul, donc cent variantes en deux minutes.
2. Il **refuse, il ne corrige jamais** : il ne propose aucune valeur, il n'en ajuste aucune, il rend un verdict et des tableaux.
3. Un barème refusé se répare par **la table**, **les prix** ou **la portée**, et par rien d'autre : jamais un objet neuf, jamais une règle de plus.
4. Le banc **mesure** la visée de 10 à 15 minutes du [chapitre 1](01-la-partie.md), il ne la **fait pas respecter**.
5. Le banc ne dit **jamais** jusqu'où un enfant descend : il dit ce que **coûte** chaque profondeur, et c'est tout ce qu'une simulation peut dire.
6. `bench/` obéit à la même interdiction que `src/game/`, plus le seul droit d'en importer les fonctions ([chapitre 10](10-l-architecture.md)).
7. Le banc n'a **pas d'horloge** : il compte des pas de 1/60 de seconde, il n'en lit aucun.
8. Le pilote écrit la **même structure d'entrées** que `src/app/input.ts` — sinon le banc éprouve un autre jeu que celui que l'enfant joue, et tout ce qu'il mesure est faux d'un cran.
9. Le pilote tire son hasard d'un **second** générateur, semé à part de celui de `Game`, pour qu'une retouche de pilote ne décale jamais le tirage du monde.

**Le pilote et ses trois profils**

10. Il existe **un seul pilote** et **trois profils**, jamais plus : l'économie n'a que trois bornes à tenir — un plancher, une référence, un plafond.
11. Un profil est **cinq réglages** de ce pilote — `venture`, `spend`, `resupply`, `care`, `reflex` — et **jamais un script écrit à la main**.
12. Le **guetteur** ne quitte ni la place ni les toits qui la ferment, frappe ce qui vient à lui, pose un canon là où il se tient, ne ravitaille jamais, et rachète un Renfort dès que la barre de la mairie passe sous la moitié : il borne le **plancher**.
13. L'**enfant** descend au tiers d'une rue, pose sur les toits de 8 du premier tronçon, ne ravitaille que dans le halo et encaisse les contacts au lieu de les fuir : c'est le **profil de référence**, et **c'est lui que les seuils lient**.
14. Le **pressé** va au fond de la rue active, pose sur les tronçons profonds, ravitaille toujours et ne laisse rien passer : il borne le **plafond**.
15. Les trois profils tiennent les trois bornes de la masse monétaire du [chapitre 6](06-l-argent.md) — 584, 823 et 924 pièces —, et un quatrième n'ajouterait qu'un point entre deux bornes déjà tenues.

**Les huit indicateurs**

16. Une partie de banc rend **huit indicateurs**, et la liste est **fermée** : dégâts cumulés sur la mairie, durée, pic de zombies vivants, part tuée à l'épée, pièces gagnées, canons posés et leurs niveaux, écroulements, fuites. Ce qui ne s'y trouve pas ne se mesure pas.
17. Les **dégâts cumulés** se comptent en coups de Traînard sur les vagues 1 à 10 ([chapitre 3](03-les-zombies.md)).
18. Les **fuites** se rendent en trois nombres et jamais en un seul : le compte, la durée moyenne, la durée la plus longue.
19. Les **canons posés** se rendent avec leurs niveaux, jamais en un compte unique.

**Les seuils**

20. Un seuil est **un chiffre et une comparaison**, jamais un avis : c'est ce qui rend le banc utilisable par un agent.
21. Un seuil vaut toujours **pour un profil donné** — les mêmes deux cents points de dégâts louent le guetteur et condamnent le pressé.
22. Un seuil se juge sur la **pire des cinq graines**, jamais sur leur moyenne.
23. Le **Colosse arrivé à la mairie** est un seuil et non un indicateur : le [chapitre 3](03-les-zombies.md) le budgète à zéro, et ce seuil est ce qui vérifie ce zéro.
24. Le **guetteur qui survit à coups de Renforts est le seul test de la soupape** du [chapitre 6](06-l-argent.md) : lui seul a le droit de laisser le Colosse toucher la mairie, et il doit tenir quand même.
25. Les **écroulements ne sont pas un seuil de barème** mais un **garde-fou de pilote** : au-delà de **6 écroulements**, la **partie est nulle** — elle ne compte ni pour ni contre le barème.
26. **Aucun total de vague ne dépasse 60** : le seuil est identique pour les trois profils, l'assertion de `waves.ts` le tient déjà sur la table livrée, et il ne reprend du sens qu'en balayage.

**Les campagnes**

27. Une campagne a **deux formes et deux seulement** : le **verdict**, qui juge, et le **balayage**, qui explore.
28. Il existe **deux verdicts** — *le verdict* et *la Rallonge* — et **quatre balayages** — les prix, la portée, la table, le gradient.
29. **Le verdict** joue les **trois profils sur cinq graines**, vagues 1 à 10, et applique la grille d'acceptation.
30. **La Rallonge** joue **l'enfant et le pressé sur cinq graines**, jusqu'à la chute de la mairie ou la vague 30.
31. Elle refuse si l'enfant tombe **avant la vague 14**, s'il tient **au-delà de la vague 30**, ou si le pressé ne tient pas **au moins trois vagues de plus** que lui — sans quoi la Rallonge ne récompense pas le jeu.
32. Un balayage joue **un profil, une graine**, et fait varier **un seul axe** à la fois.
33. Un balayage **ne juge jamais** : il n'a aucun seuil, il rend un tableau, et il sort toujours 0.
34. Un balayage explore des valeurs que la spec refuse — une cadence de 4 secondes, une table gonflée : c'est son travail, et **il ne pose rien**.
35. Le **balayage du gradient** porte une **condition de lecture** et non un seuil : la mairie **tient à toutes les profondeurs**, et les dégâts cumulés ne font **aucune marche de plus de 40 points** entre deux profondeurs voisines.
36. Dans le **balayage de la table**, une variante dont un total dépasse 60 est **marquée** dans le tableau : le balayage ne la refuse pas, et il ne la cache pas.
37. Les graines sont **cinq, numérotées 1 à 5**, et les mêmes pour toutes les campagnes.

**Ce que le banc rend**

38. `npm run bench` imprime le **tableau** — une ligne par partie, huit colonnes — puis la ligne `VERDICT: ACCEPTÉ` ou `VERDICT: REFUSÉ`.
39. Un refus n'énumère que les **cases franchies**, chacune en **valeur contre seuil**, et jamais la grille entière.
40. Le **code de sortie est 0 ou 1**, et rien d'autre : le lecteur du banc est un agent, qui lit un code et une liste.
41. `bench/` porte **six modules** et pas un de plus — `run.ts`, `pilot.ts`, `profiles.ts`, `campaigns.ts`, `thresholds.ts`, `report.ts` —, plus la partie de référence et son test.

**La partie de référence**

42. `bench/reference.json` gèle les **huit indicateurs d'une seule partie** : l'enfant, graine 1.
43. `bench/reference.test.ts` la rejoue et compare ; toucher `balance.ts` casse ce test, et c'est voulu.
44. On le répare par `npm run bench -- --freeze`, **jamais à la main**.
45. Le **diff de `bench/reference.json` dans la PR est le compte rendu** de ce que la retouche a fait au jeu.
46. Ce test éprouve le **barème** ; le test de rejouabilité octet à octet du [chapitre 10](10-l-architecture.md) éprouve le **moteur**. Aucun des deux ne remplace l'autre.
47. Une retouche d'équilibrage touche **la spec, `balance.ts`, les tests et `bench/reference.json` dans la même PR**.

## Les chiffres

### Les cinq réglages du pilote

| Réglage | Ce qu'il règle | Le guetteur | L'enfant | Le pressé |
|---|---|---:|---:|---:|
| `venture` | la profondeur d'aventure, en fraction de rue | **0,05** | **0,35** | **0,95** |
| `spend` | l'ordre de préférence d'achat et la réserve gardée | *voir ci-dessous* | *voir ci-dessous* | *voir ci-dessous* |
| `resupply` | quand il va chercher des bombes | jamais | halo seul | toujours |
| `care` | les pastilles restantes à partir desquelles il se replie | 0 | 2 | 4 |
| `reflex` | son retard de réaction à un paquet neuf | 60 pas | 30 pas | 0 pas |

`venture` se lit sur les 80 blocs d'une rue ([chapitre 2](02-la-ville.md)) : 0,05 tient le guetteur à la bouche de la rue, dans le prolongement de la place ; 0,35 met l'enfant au tiers ; 0,95 mène le pressé au fond. `reflex` se compte en pas de 1/60 de seconde — 1 s, 0,5 s, rien.

### `spend`, profil par profil

| | Ordre de préférence | Réserve gardée |
|---|---|---:|
| **Le guetteur** | un Renfort dès que la mairie passe sous la moitié ; sinon un canon, là où il se tient | 50 |
| **L'enfant** | un canon jusqu'à en avoir un par rue active, puis le niveau 2, puis le niveau 3, puis un Renfort sous la moitié | 50 à partir de la vague 7 |
| **Le pressé** | un canon, son niveau 2 dès qu'il couvre deux paquets, le niveau 3 dans le halo, une brassée à chaque passage à la base — **jamais un Renfort** | 3 |

Les prix sont ceux du [chapitre 6](06-l-argent.md) ; la réserve du guetteur et de l'enfant est le prix du Renfort 1, celle du pressé le prix d'une brassée. L'ordre de l'enfant est celui qui redonne les repères de progression de la partie de référence : premier canon à la fin de l'assaut 2, canon de la deuxième rue en préparation 4, premier niveau 2 à la vague 6, premier niveau 3 à la vague 8.

### La grille d'acceptation

| | Le guetteur | L'enfant | Le pressé |
|---|---|---|---|
| Dégâts cumulés v1-10 | mairie debout à la v10 | **≤ 166** | ≤ 100 |
| Renforts achetés | libre | **≤ 1** | 0 |
| Durée v1-10 | ≤ 20 min | **12 à 18 min** | ≥ 11 min |
| Part tuée à l'épée | ≥ 15 % | **35 à 50 %** | ≥ 50 % |
| Pièces gagnées | ≥ 584 | **760 à 900** | ≤ 1 068 |
| Canons en fin de partie | ≥ 4 | **6 à 9** | ≤ 24 |
| Fuite la plus longue | — | **≤ 20 s** | ≤ 10 s |
| Le Colosse atteint la mairie | toléré | **refus** | refus |
| Total d'une vague | > 60 ⇒ refus | > 60 ⇒ refus | > 60 ⇒ refus |

Six lignes portent sur un des huit indicateurs. Les trois autres — les Renforts achetés, le Colosse arrivé à la mairie, le total d'une vague — sont des **seuils sans indicateur** : ils se lisent sur l'état de la partie et n'ouvrent pas la liste fermée. Réciproquement, deux indicateurs ne portent **aucun** seuil de barème : le pic de zombies vivants, que l'assertion de `waves.ts` borne déjà, et les écroulements, qui sont un garde-fou de pilote.

### Les deux verdicts

| Campagne | Profils | Graines | Vagues | Parties | Durée |
|---|---|---:|---|---:|---:|
| **Le verdict** | les trois | 1 à 5 | 1 à 10 | 15 | ≈ 15 s |
| **La Rallonge** | l'enfant et le pressé | 1 à 5 | jusqu'à la chute ou la vague 30 | 10 | ≈ 45 s |

Les trois refus de la Rallonge :

| Condition | Ce qu'elle défend |
|---|---|
| L'enfant tombe **avant** la vague 14 | le palier du [chapitre 1](01-la-partie.md) doit être atteignable |
| L'enfant tient **au-delà** de la vague 30 | une Rallonge sans fin n'est plus une fin de partie |
| Le pressé ne tient pas **au moins 3 vagues de plus** que l'enfant | jouer mieux doit servir à quelque chose |

### Les quatre balayages

| Balayage | Axe | De … à … | Pas | Variantes |
|---|---|---|---:|---:|
| **Les prix** | le prix du canon — niveaux et Renforts suivent leurs rapports figés ([chapitre 6](06-l-argent.md)) | 30 → 60 pièces | 5 | 7 |
| **La portée** | la majoration par bloc de hauteur | 0,25 → 1,25 | 0,25 | 5 |
| | la portée de base au sol | 9 → 15 blocs | 1 bloc | 7 |
| **La table** | les totaux de la table des vagues | ×0,8 → ×1,2 | 0,05 | 9 |
| | la cadence entre deux paquets | 4 → 8 s | 0,5 s | 9 |
| **Le gradient** | `venture` | 0,05 → 0,95 | 0,1 | 10 |

Tous jouent **le profil de l'enfant** et **la graine 1**, un seul axe à la fois, et chacun tient en une vingtaine de secondes. Chaque intervalle contient la valeur livrée — 40 pièces, +0,75 par bloc, 12 blocs au sol, ×1,00, 6 secondes —, sans quoi le tableau n'aurait pas de point de comparaison.

### Les huit indicateurs, et leurs unités

| Indicateur | Unité |
|---|---|
| Dégâts cumulés sur la mairie | coups de Traînard, vagues 1 à 10 |
| Durée | minutes |
| Pic de zombies vivants | zombies |
| Part tuée à l'épée | pourcentage des mises à mort |
| Pièces gagnées | pièces |
| Canons posés | un compte par niveau |
| Écroulements | compte |
| Fuites | compte, durée moyenne, durée la plus longue |

### Les repères que le banc doit retrouver

| Repère | Valeur | D'où |
|---|---:|---|
| Dégâts cumulés v1-10, l'enfant | 166 sur 200 | [chapitre 3](03-les-zombies.md) |
| Pièces gagnées, l'enfant | 823 | [chapitre 6](06-l-argent.md) |
| Plancher garanti, le guetteur | 584 | [chapitre 6](06-l-argent.md) |
| Pire cas réel, le pressé | 924 | [chapitre 6](06-l-argent.md) |
| Durée d'une partie bien jouée | ≈ 14,5 min | [chapitre 1](01-la-partie.md) |
| Canons de la fin de partie type | 7 | [chapitre 6](06-l-argent.md) |
| Pic au palier de la Rallonge | ≈ 55 sur 60 | [chapitre 3](03-les-zombies.md) |
| Durée d'une fuite depuis la place | 6 s | [chapitre 3](03-les-zombies.md) |

Les 166 points reposent **entièrement** sur cette dernière ligne, et le banc est le seul endroit du projet où elle s'éprouve : c'est à cela que sert l'indicateur des fuites.

### `bench/`

```
bench/
  run.ts              l'entrée de `npm run bench`, et le code de sortie
  pilot.ts            le pilote unique, ses cinq réglages, son générateur
  profiles.ts         les trois profils
  campaigns.ts        les deux verdicts et les quatre balayages
  thresholds.ts       la grille d'acceptation
  report.ts           le tableau, la ligne de verdict, les cases franchies
  reference.json      les huit indicateurs de l'enfant, graine 1
  reference.test.ts   le rejeu qui les compare
```

## Les interdits

- **Jamais un quatrième profil** — trois bornes économiques, trois profils ; un quatrième n'ajouterait qu'un point entre deux bornes déjà tenues, et une colonne de plus à la grille.
- **Jamais un script écrit à la main par profil** — il est infalsifiable et pourrit à la première retouche du jeu ; un profil est cinq nombres, et c'est ce qui le rend comparable aux deux autres.
- **Jamais un pilote qui écrive autre chose qu'un `InputState`** — s'il court-circuite les entrées, il éprouve un jeu que personne ne joue.
- **Jamais `Math.random()` ni une horloge dans `bench/`** — tout le banc repose sur le fait qu'une partie se rejoue à l'identique.
- **Jamais un seuil sur les écroulements** — leur nombre est une conséquence du réglage `care`, donc du profil : en faire un critère reviendrait à noter ce qu'on a soi-même programmé.
- **Jamais un seuil de durée à 15 minutes** — le cadre a lui-même dégarantie la durée depuis la boucle en deux temps : la durée est ce que le banc **relève**, jamais ce qu'il exige. Le compte du [chapitre 1](01-la-partie.md) est passé sous les 15 min en raccourcissant les trois premières préparations, mais il y passe de justesse et par le calcul : un seuil à 15 ferait juger le banc sur une marge de trente secondes qu'aucune mesure ne défend.
- **Jamais la moyenne des cinq graines** — une moyenne noie exactement le cas qu'on cherche.
- **Jamais un seuil sur un balayage, jamais un code de sortie autre que 0 pour un balayage** — il explore, il ne juge pas, et c'est ce qui le sépare du verdict.
- **Jamais un banc qui corrige un chiffre** — il refuse, un humain arbitre, et la retouche passe par une PR qui touche la spec, `balance.ts`, les tests et `reference.json` ensemble.
- **Jamais un barème qui ne tienne qu'à une profondeur** — un jeu qui ne marche que si l'on va au fond d'une rue est cassé pour un enfant timide.
- **Jamais un banc qui décide jusqu'où l'enfant descend** — c'est une observation sur un enfant réel, pas une simulation.
- **Jamais un `bench/reference.json` réparé à la main** — le fichier n'a de valeur que s'il est le rejeu exact du barème courant.
- **Jamais un réglage de difficulté** — la difficulté n'est un réglage de rien, ni du rendu ni du banc, et `difficulty` est un mot interdit dans le code.
- **Jamais un objet neuf pour rattraper l'équilibrage** — les leviers sont la table, les prix et la portée ([chapitre 5](05-les-canons.md)).

## Pourquoi

**Pourquoi trois profils, et pourquoi ceux-là.** Les trois masses monétaires du [chapitre 6](06-l-argent.md) — 584 acquises, 823 de référence, 924 au pire réel — étaient déjà trois profils déguisés : un joueur qui ne tue rien à l'épée, un joueur moyen, un joueur qui tue tout. Le banc les prend pour squelette parce que l'économie n'a que ces trois bornes à tenir. Un quatrième profil ne borne plus rien : il interpole.

**Pourquoi un pilote à cinq boutons plutôt que trois scripts.** Un script en dur par profil est du code qu'on ne peut pas réfuter : on ne sait pas dire en quoi le guetteur diffère de l'enfant autrement qu'en lisant deux cents lignes, et la première retouche du jeu en périme trois. Cinq réglages font des profils des points d'un même espace, comparables terme à terme — et c'est ce qui rend le balayage du gradient possible, puisqu'il ne fait que déplacer un de ces cinq nombres.

**Pourquoi le pilote passe par la structure d'entrées.** C'est la règle qui décide si le banc mesure quelque chose. Un pilote qui téléporterait le joueur ou poserait un canon sans passer par le bouton d'action éprouverait un jeu voisin du vrai — et le décalage serait invisible, donc jamais corrigé. En passant par `InputState`, il paie le temps de course, la montée d'échelle, la portée de la fauchée et l'appui du bouton d'action exactement comme l'enfant.

**Pourquoi un second générateur.** Si le pilote et le monde tiraient au même générateur, changer une virgule dans le pilote décalerait toute la suite des tirages du monde : deux barèmes ne seraient plus comparables, et le diff de `reference.json` cesserait de vouloir dire quoi que ce soit. Semés à part, ils sont indépendants — on peut retoucher le pilote et lire ce que ça change, ou retoucher le barème et lire ce que ça change, jamais les deux mélangés.

**Pourquoi le banc ne fait pas respecter les 10 à 15 minutes.** La visée est un but de conception, pas une garantie : depuis la boucle en deux temps, la durée appartient au rythme du joueur. Le compte complet du [chapitre 1](01-la-partie.md) donnait 15,2 minutes bien jouée et en donne 14,5 depuis que les trois premières préparations sont tombées à 25 secondes — la partie de référence, elle, en mesure **14,49**, ce qui est la première fois que le calcul du chapitre 1 et le relevé du banc tombent l'un sur l'autre au centième. Le chiffre rentre donc dans la visée, mais il n'y rentre que de trente secondes. Accrocher un seuil à 15 reviendrait à faire juger le banc sur cette marge-là. On mesure donc, et on regarde : 12 à 18 minutes est la fenêtre dans laquelle la partie reste celle qu'on a écrite.

**Pourquoi le seuil de profondeur se retourne.** Le banc ne saura jamais jusqu'où un enfant de 8 ans descend dans une rue : ça se relève sur un enfant, pas dans une simulation. La question utile n'est donc pas « descend-il assez loin ? » mais **le barème est-il acceptable à toutes les profondeurs ?** Ainsi posée, elle est mesurable, elle se refuse, et elle protège l'enfant timide autant que le téméraire. Les 40 points de marche entre deux profondeurs voisines en sont la traduction chiffrée : c'est la définition réfutable de « c'est un gradient et pas un mur ».

**Pourquoi la pire des graines et pas la moyenne.** Le hasard de ce jeu est mince — le décalage latéral d'un zombie dans son paquet, pour l'essentiel ([chapitre 3](03-les-zombies.md)) : cinq graines suffisent à en sortir un pire cas, et c'est ce pire cas qui décide si un enfant vit la partie qu'on a écrite. Une moyenne le dilue dans quatre parties tranquilles, et un barème qui casse une fois sur cinq passerait.

**Pourquoi les écroulements sont un garde-fou et pas un seuil.** Combien de fois le pilote s'écroule dépend de `care`, un nombre qu'on a choisi soi-même : un seuil là-dessus noterait la programmation du pilote, pas le barème. Ce qu'un écroulement coûte, en revanche, est déjà compté ailleurs — trois secondes au sol plus le trajet de retour, pris sur les 34 points de marge de la mairie ([chapitre 4](04-le-joueur.md) pour les trois secondes, [chapitre 3](03-les-zombies.md) pour la marge) —, et c'est cela que les dégâts cumulés mesurent. Au-delà de six, le pilote ne joue plus le jeu qu'on a conçu : la partie est écartée, et c'est le profil qu'on répare, pas le barème.

**Pourquoi le Colosse est un seuil et le guetteur son exception.** Ses 10 coups de Traînard par seconde couchent les 200 points d'une mairie neuve en vingt secondes : s'il touche la mairie chez l'enfant, les 166 points du [chapitre 3](03-les-zombies.md) sont faux d'un coup, et ce seuil est ce qui vérifie le zéro que le chapitre 3 lui budgète. Le guetteur, lui, a le droit de le laisser passer — parce que c'est le **seul endroit de la spec où la soupape du Renfort s'éprouve**. Un joueur qui ne quitte pas la place, encaisse tout et rachète des Renforts doit tenir jusqu'à la vague 10 : si cela ne marche pas, ce n'est pas le guetteur qui est mal réglé, c'est le rachat indéfini à 120 pièces qui ne remplit pas son office.

**Pourquoi un code de sortie plutôt qu'un tableau.** Le lecteur du banc est un agent. Un tableau de quinze lignes et huit colonnes demande une interprétation, et une interprétation se négocie ; un code de sortie et une liste de cases franchies en *valeur contre seuil* ne se négocient pas. Le tableau reste imprimé, pour l'humain qui veut comprendre — mais ce n'est pas lui qui prononce.

**Pourquoi une partie de référence gelée.** C'est le meilleur usage du déterminisme. Le fichier n'est pas un test de plus : c'est le **compte rendu lisible d'une retouche d'équilibrage**. Baisser le prix du canon de 40 à 35 fait bouger huit nombres, et ces huit nombres sont dans le diff de la PR — la durée, les pièces, la part à l'épée, les dégâts encaissés. Sans lui, une retouche de barème se relit en cherchant ce qu'elle a bien pu changer.

**Pourquoi le plafond de 60 n'est pas un vrai seuil du verdict.** Le [chapitre 3](03-les-zombies.md) en a fait une propriété de la table, tenue par une assertion testée dans `waves.ts` : le pic observé ne peut structurellement pas dépasser le total de sa vague, donc le pool ne peut pas déborder. Sur la table livrée, ce que le banc mesure là est du confort — environ 55 vivants sur 60. La ligne reste dans la grille parce qu'elle reprend du sens en balayage, où une table gonflée à ×1,2 sort du clou : c'est exactement le moment où l'on veut que le tableau le dise.

## D'où ça vient

[#41](https://github.com/ben-barbier/apocalypse-zombie/issues/41) pour l'ensemble : les trois profils et le pilote à cinq réglages, les huit indicateurs, la grille d'acceptation, les deux verdicts et les quatre balayages, les cinq graines et la pire d'entre elles, le garde-fou des écroulements, le tableau suivi du code de sortie, les six fichiers de `bench/` et la partie de référence gelée. [#13](https://github.com/ben-barbier/apocalypse-zombie/issues/13) pour le banc lui-même — la partie sans rendu en une seconde, le barème injecté, le hasard semé — et pour les trois politiques esquissées dont sortent les trois profils. [#11](https://github.com/ben-barbier/apocalypse-zombie/issues/11) pour les trois bornes de la masse monétaire. [#26](https://github.com/ben-barbier/apocalypse-zombie/issues/26) pour les 166 points et le Colosse budgété à zéro. [#16](https://github.com/ben-barbier/apocalypse-zombie/issues/16) pour la soupape que le guetteur éprouve. [#20](https://github.com/ben-barbier/apocalypse-zombie/issues/20) pour la Rallonge et son hypothèse d'ubiquité. [#35](https://github.com/ben-barbier/apocalypse-zombie/issues/35) pour l'assertion qui borne les totaux et pour les 15,2 minutes. [#25](https://github.com/ben-barbier/apocalypse-zombie/issues/25) pour le gradient et [#24](https://github.com/ben-barbier/apocalypse-zombie/issues/24) pour son relevé manquant, que le balayage du gradient referme. [#28](https://github.com/ben-barbier/apocalypse-zombie/issues/28) pour les trois leviers. [ADR-0001](../adr/0001-logique-de-jeu-sans-moteur-3d.md) pour la garde de `bench/` et le second générateur, [ADR-0002](../adr/0002-code-en-anglais-conception-en-francais.md) pour les douze termes du banc et leurs mots interdits.
