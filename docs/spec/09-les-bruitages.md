# Les bruitages

Ce chapitre décide ce que le jeu fait entendre : les dix-sept bruitages et leur unique musique, l'événement qui déclenche chacun, les paramètres de synthèse de tous — oscillateurs, bruit, enveloppes, filtres —, les six bus et leurs plafonds de voix, l'esquive de l'unique alarme, et ce que le son refuse de dire. Le graphe se construit à la sortie du Sas ([chapitre 8](08-le-bandeau-et-le-sas.md)), il lit le tampon d'événements du [chapitre 10](10-l-architecture.md), et les faits qu'il sonorise sont aux [chapitres 3](03-les-zombies.md), [4](04-le-joueur.md), [5](05-les-canons.md) et [6](06-l-argent.md).

## Les règles

**Le principe**

1. Le son est **entièrement synthétisé en WebAudio** — oscillateurs, bruit, enveloppes, filtres : le jeu ne charge **aucun fichier audio**, n'embarque **aucune banque de sons** et n'ajoute **aucune dépendance d'exécution**.
2. L'audio **réagit au tampon d'événements**, il n'observe jamais l'état : un bruitage part parce que la simulation a dit ce qu'elle venait de faire, jamais parce que deux images diffèrent ([chapitre 10](10-l-architecture.md)).
3. Le son ne dit **que ce que l'image ne dit pas** : il double une action du joueur pour la rendre franche, et il n'annonce un fait hors champ que dans un seul cas, la mairie qui encaisse.
4. La liste des **dix-sept bruitages** et de la **seule musique** est fermée : un dix-huitième est une décision qui passe par ce chapitre, jamais un réflexe.
5. Rien n'est effrayant : les zombies **gémissent, ils ne rugissent pas**, et la mort d'un zombie est comique — un « bloup », jamais un bruit de chair.
6. Le son ne touche **jamais** la simulation : aucun bruitage ne change un chiffre, ne consomme le générateur du monde, ni n'entre dans l'Instantané.

**Le graphe**

7. Il existe **un seul `AudioContext`**, créé avec `latencyHint: 'interactive'`, construit **dans le gestionnaire de l'appui qui quitte le Sas** et jamais ailleurs ([chapitre 8](08-le-bandeau-et-le-sas.md)).
8. Le graphe est fixe et tient en trois étages : chaque voix se branche sur le **gain de son bus**, les six bus se branchent sur le **maître**, le maître passe par un **compresseur** unique avant la sortie.
9. Le **compresseur est toujours en service** : il n'existe aucun contournement, aucun réglage, aucun mode.
10. Le **bruit** est un tampon mono de **2 secondes**, rempli une fois à la construction de valeurs uniformes dans `[-1, 1[`, lu **en boucle depuis un décalage tiré au hasard** — un seul tampon pour tout le jeu.
11. Toutes les enveloppes sont **exponentielles** et s'écrivent de la même façon : `setValueAtTime(0,0001)` au départ, montée à la **crête** au bout de l'**attaque**, retour à `0,0001` au bout de la **chute**.
12. L'audio est le **seul endroit du jeu qui ait le droit d'appeler `Math.random()`** — décalage du bruit, hauteur d'un gémissement : rien de ce qu'il tire n'entre dans l'état, ne part dans l'Instantané ni ne déplace le tirage du monde ([chapitre 10](10-l-architecture.md)).
13. Une voix **libère sa place** sa durée nominale plus 150 ms après son départ ; les voix tenues — le jet de feu, le pouls — la gardent jusqu'à leur arrêt explicite.
14. Le son **ne survit jamais au Sas** : la partie se fige, les voix tenues s'arrêtent, et rien ne redémarre tout seul.

**Les bus et le mélange**

15. Il y a **six bus et six seulement** : combat, défenses, alarme, argent, monde, musique.
16. Chaque bus porte un **niveau fixe** et un **plafond de voix simultanées**, et un bruitage appartient à un bus et un seul.
17. Le plafond se compte **par bus**, jamais globalement : un assaut qui sature le combat n'empêche jamais une pièce d'être entendue.
18. **Quand un bus est plein, la voix la plus ancienne est volée** — jamais la nouvelle refusée. La voix volée s'éteint en `setTargetAtTime` de constante **12 ms** et se débranche 120 ms plus tard.
19. C'est cette politique qui tient la règle du chapitre : **le gémissement ne mange jamais le « tchac »**. Refuser la nouvelle ferait exactement l'inverse.

**L'alarme et l'esquive**

20. Il n'y a **qu'une seule alarme dans tout le jeu** : la mairie touchée.
21. Elle est la **seule chose qui déclenche l'esquive** : tous les autres bus baissent à **42 %** de leur niveau, tenus **450 ms**, puis reviennent.
22. La descente se fait en `setTargetAtTime` de constante **20 ms**, la remontée de constante **180 ms**.
23. L'alarme existe parce que la **fuite est hors champ** : le joueur est souvent au fond d'une rue, dos à la place, et chaque coup encaissé est un point de mairie définitivement perdu ([chapitre 3](03-les-zombies.md)).

**Le gémissement**

24. Le gémissement **n'appartient à aucun zombie** : c'est une émission globale de l'assaut, dont la cadence suit la population vivante.
25. La simulation **l'émet toutes les 140 ms**, en accumulant `vivants / 40` à chaque échéance : elle émet **un** gémissement dès que l'accumulateur atteint 1, puis lui retranche 1, et l'accumulateur **ne dépasse jamais 1** — quatre vivants donnent 0,7 gémissement par seconde, trente en donnent 5,4, et au-delà de quarante la cadence est **plafonnée à 7,1 par seconde**.
26. L'événement **désigne le zombie qui gémit**, pris à tour de rôle dans le pool des vivants : c'est lui qui donne le panoramique.
27. La **hauteur est tirée à chaque voix** entre **×0,8 et ×1,3** de 118 Hz, la même pour tous les types : ce n'est pas le son qui dit à quoi on a affaire, c'est le corps ([chapitre 3](03-les-zombies.md)).

**Le panoramique**

28. Le panoramique est l'**écart latéral à l'axe de la caméra**, normalisé sur la largeur du champ et **saturé à ±0,7**.
29. **Cinq bruitages seulement sont panoramiqués** : le « tchac », le « bloup », le souffle sourd, le gémissement et le boulet tiré. Tous les autres sont **centrés**.
30. Les trois sons de l'épée sont saturés à **±0,28** et non à ±0,7 : ce qui se passe sous le nez du joueur ne se promène pas d'une oreille à l'autre.
31. Il n'existe **aucune spatialisation autre** : ni distance, ni atténuation, ni panoramique vertical, ni `PannerNode`.

**Le pouls**

32. Le jeu a **une seule musique**, *le pouls* : une pulsation basse à **96 temps par minute**, quatre notes qui tournent, sans fin ni motif à reconnaître.
33. Il **tourne pendant l'assaut et se tait pendant la préparation** : il donne un tempo à la seule phase qui n'en a aucun ([chapitre 1](01-la-partie.md)).
34. Il **démarre à l'entrée en assaut** et **s'éteint à la mort du dernier zombie**, en même temps que la prime tombe.
35. Il vit sur son propre bus, au **niveau le plus bas des six** : il ne se remarque que lorsqu'il s'arrête.

**Ce que l'audio ne fait jamais**

36. Il n'existe **aucun réglage de volume** — le Sas n'a aucun réglage, et le volume est celui de l'appareil ([chapitre 8](08-le-bandeau-et-le-sas.md)).
37. Si le contexte ne repart pas, **le jeu continue muet**, sans message, sans icône et sans écran.
38. Aucun bruitage n'est **jamais différé, mis en file ni rejoué plus tard** : ce qui n'a pas trouvé de voix à l'instant où l'événement est tombé n'est jamais entendu.

## Les chiffres

### Les dix-sept bruitages, et la musique

| Famille | Bruitage | Bus | Panoramique | Durée nominale |
|---|---|---|:---:|---:|
| **Combat** | Tchac | combat | ±0,28 | 0,30 s |
| | Bloup | combat | ±0,28 | 0,40 s |
| | Souffle sourd | combat | ±0,28 | 0,50 s |
| | Gémissement | combat | ±0,7 | 0,82 s |
| | Contact | combat | centré | 0,40 s |
| | S'écrouler | combat | centré | 0,70 s |
| | Se relever | combat | centré | 0,45 s |
| **Défenses** | Boulet tiré | défenses | ±0,7 | 0,35 s |
| | Jet de feu | défenses | centré | **tenue** |
| | Canon posé | défenses | centré | 0,60 s |
| | Canon amélioré | défenses | centré | 0,50 s |
| **Alarme** | Mairie touchée | alarme | centré | 1,00 s |
| **Argent** | Pièce ramassée | argent | centré | 0,30 s |
| | Prime de fin d'assaut | argent | centré | 0,95 s |
| | Renfort acheté | argent | centré | 0,90 s |
| | Bombe prise à la base | argent | centré | 0,30 s |
| **Monde** | Portique qui s'allume | monde | centré | 0,80 s |
| **Musique** | *Le pouls* | musique | centré | **tenue** |

Dix-sept bruitages, une musique, et **la liste est fermée**.

### Ce qui déclenche chacun

| Bruitage | Événement du tampon |
|---|---|
| Tchac | coup d'épée qui touche sans tuer ([chapitre 4](04-le-joueur.md)) |
| Bloup | coup fatal, quelle qu'en soit la source ([chapitre 3](03-les-zombies.md)) |
| Souffle sourd | coup d'épée dans le vide |
| Gémissement | émission d'assaut, toutes les 140 ms selon la population |
| Contact | le joueur perd un point de vie ([chapitre 4](04-le-joueur.md)) |
| S'écrouler | le joueur tombe à zéro point de vie |
| Se relever | il se relève, 3 secondes plus tard |
| Boulet tiré | un canon tire ([chapitre 5](05-les-canons.md)) |
| Jet de feu | un cône s'allume ; il s'éteint quand le cône s'éteint |
| Canon posé | un canon est posé |
| Canon amélioré | un canon passe au niveau 2 ou 3 |
| Mairie touchée | une fuite frappe la mairie ([chapitre 3](03-les-zombies.md)) |
| Pièce ramassée | une pièce entre dans la bourse ([chapitre 6](06-l-argent.md)) |
| Prime de fin d'assaut | la mairie verse les 10 pièces |
| Renfort acheté | le Renfort est payé ([chapitre 6](06-l-argent.md)) |
| Bombe prise à la base | la brassée se remplit ([chapitre 4](04-le-joueur.md)) |
| Portique qui s'allume | une rue devient active ([chapitre 3](03-les-zombies.md)) |
| *Le pouls* | entrée en assaut ; coupé à la mort du dernier zombie |

Un **jet de feu allumé tient une voix** tant qu'il brûle : six canons qui crachent tiennent six voix, donc le plafond du bus défenses les borne comme il borne les boulets.

### Les six bus

| Bus | Niveau | Plafond de voix |
|---|---:|---:|
| Combat | 0,85 | **6** |
| Défenses | 0,70 | **5** |
| Alarme | 1,00 | **3** |
| Argent | 0,80 | **4** |
| Monde | 0,80 | **3** |
| Musique | 0,45 | **4** |

| Étage | Réglage |
|---|---|
| Maître | gain **0,9** |
| Compresseur | seuil **−18 dB**, genou **12**, rapport **6**, attaque **4 ms**, relâchement **180 ms** |
| Esquive | ×**0,42** sur les cinq autres bus, tenue **450 ms**, descente τ = 20 ms, remontée τ = 180 ms |
| Vol de voix | extinction τ = **12 ms**, débranchement **120 ms** plus tard |

### La convention d'écriture d'une enveloppe

`env(crête · attaque · chute)` se lit toujours de la même façon : le gain part de `0,0001`, monte **exponentiellement** à la crête au bout de l'attaque, redescend **exponentiellement** à `0,0001` au bout de la chute. Aucune enveloppe du jeu n'est linéaire, et aucune ne part de zéro — une rampe exponentielle ne le supporte pas.

### Les paramètres de synthèse — combat

**Tchac** — *touché, pas tué*

| Brique | Réglage |
|---|---|
| Bruit, 200 ms | passe-bande **1 900 Hz**, Q **1,1** |
| son enveloppe | `env(0,9 · 3 ms · 55 ms)` |
| Clic | **carré 240 Hz**, `env(0,25 · 2 ms · 30 ms)`, coupé à 50 ms |

**Bloup** — *mort*

| Brique | Réglage |
|---|---|
| Corps | **sinus 430 Hz**, glissé exponentiel vers **88 Hz** en 130 ms, coupé à 350 ms |
| son enveloppe | `env(0,8 · 5 ms · 160 ms)` |
| Pop final, à +130 ms | **triangle 760 Hz**, `env(0,3 · 4 ms · 50 ms)`, coupé à 250 ms |

**Souffle sourd** — *raté*

| Brique | Réglage |
|---|---|
| Bruit, 300 ms | passe-bas **780 Hz**, Q **0,7** |
| son enveloppe | `env(0,35 · 20 ms · 200 ms)` |

**Gémissement** — *un zombie est là*

| Brique | Réglage |
|---|---|
| Corps | **dent de scie**, **118 Hz** × un facteur tiré dans `[0,8 ; 1,3]` |
| Chevrotement | LFO **sinus 5,2 Hz**, amplitude **9 Hz** sur la fréquence du corps |
| Formant | passe-bande **520 Hz**, Q **2,4** |
| Enveloppe | `env(0,5 · 90 ms · 620 ms)`, coupé à 770 ms |

**Contact** — *le joueur perd un point de vie*

| Brique | Réglage |
|---|---|
| Poids | **triangle 130 Hz**, glissé vers **71,5 Hz** (×0,55) en 180 ms, coupé à 450 ms |
| son enveloppe | `env(0,8 · 4 ms · 220 ms)` |
| Matière | bruit 120 ms, passe-bande **1 400 Hz** Q **0,8**, `env(0,2 · 2 ms · 90 ms)` |

**S'écrouler** — *le joueur tombe à zéro*

| Brique | Réglage |
|---|---|
| Poids | **triangle 90 Hz**, glissé vers **40,5 Hz** (×0,45) en 450 ms, coupé à 800 ms |
| son enveloppe | `env(0,9 · 6 ms · 520 ms)` |
| Matière | bruit 260 ms, passe-bas **700 Hz** Q **0,7**, `env(0,3 · 4 ms · 220 ms)` |

**Se relever** — *il repart, à pleins points de vie*

| Brique | Réglage |
|---|---|
| Corps | **triangle 90 Hz**, glissé vers **180 Hz** (×2) en 320 ms, coupé à 500 ms |
| son enveloppe | `env(0,5 · 40 ms · 300 ms)` |
| Matière, à +200 ms | bruit 120 ms, passe-bande **1 200 Hz** Q **0,9**, `env(0,18 · 4 ms · 100 ms)` |

Les deux derniers sont le **Contact transposé** : le même graphe, plus grave et plus long pour la chute, retourné vers le haut pour le relèvement. La grammaire est celle du reste du jeu — **ce qui descend est un accident, ce qui monte est un gain** —, et c'est la même montée que la bombe prise à la base.

### Les paramètres de synthèse — défenses

**Boulet tiré**

| Brique | Réglage |
|---|---|
| Grave | **sinus 150 Hz**, glissé vers **63 Hz** (×0,42) en 150 ms, coupé à 300 ms |
| son enveloppe | `env(0,75 · 3 ms · 170 ms)` |
| Souffle | bruit 160 ms, passe-bas **900 Hz** Q **0,8**, `env(0,22 · 4 ms · 130 ms)` |

**Jet de feu** — voix tenue

| Brique | Réglage |
|---|---|
| Flamme | bruit **en boucle**, passe-bas **1 600 Hz** Q **1,4** |
| Crépitement | LFO **sinus 11 Hz**, amplitude **560 Hz** sur la fréquence de coupure |
| Allumage | gain monté à **0,5** en **60 ms** |
| Extinction | `setTargetAtTime` τ = **50 ms**, sources arrêtées **300 ms** plus tard |

**Canon posé**

| Brique | Réglage |
|---|---|
| Poids | **sinus 82 Hz**, glissé vers **49,2 Hz** (×0,6) en 300 ms, coupé à 700 ms |
| son enveloppe | `env(0,9 · 6 ms · 320 ms)` |
| Cliquetis, à +20 ms | bruit 90 ms, passe-bande **3 100 Hz** Q **1,6**, `env(0,28 · 2 ms · 70 ms)` |

**Canon amélioré**

| Brique | Réglage |
|---|---|
| Trois notes | **carré**, **392 Hz** puis **493,9 Hz** (×1,26) puis **588 Hz** (×1,5) |
| Écart | **70 ms** entre deux départs |
| Chaque note | `env(0,22 · 5 ms · 110 ms)`, coupée 200 ms après son départ |

Le canon posé **pèse** et le canon amélioré **monte** : c'est ce qui les distingue à l'oreille seule, sans les regarder.

### Les paramètres de synthèse — alarme

**Mairie touchée** — la seule alarme, et la seule esquive

| Brique | Réglage |
|---|---|
| Sous-grave | **sinus 62 Hz**, glissé vers **43,4 Hz** (×0,7) en 350 ms, coupé à 900 ms |
| son enveloppe | `env(1,0 · 5 ms · 700 ms)` |
| Craquement | **triangle 340 Hz**, glissé vers **187 Hz** (×0,55) en 220 ms, coupé à 500 ms |
| son enveloppe | `env(0,55 · 3 ms · 240 ms)` |
| Matière | bruit 300 ms, passe-bande **1 200 Hz** Q **0,7**, `env(0,3 · 2 ms · 200 ms)` |
| Esquive | ×**0,42** pendant **450 ms** |

C'est le **craquement** qui perce, pas le sous-grave : le haut-parleur d'un iPad ne rend pas 62 Hz, et une alarme qu'on n'entend que sur un casque n'existe pas.

### Les paramètres de synthèse — argent

**Pièce ramassée**

| Brique | Réglage |
|---|---|
| Deux notes | **sinus 880 Hz**, puis **1 320 Hz** (×1,5) |
| Écart | **45 ms** |
| Chaque note | `env(0,4 · 4 ms · 70 ms)`, coupée 140 ms après son départ |

**Deux notes, quelle que soit la valeur de la pièce** : la valeur se lit déjà à la taille de la pièce, et la prime de bravoure avec elle ([chapitre 6](06-l-argent.md)).

**Prime de fin d'assaut** — *tu as tenu*

| Brique | Réglage |
|---|---|
| Cascade | **dix notes**, une par pièce versée |
| Échelle | 523 · 587 · 659 · 784 · 880 · 1 047 · 1 175 · 1 319 · 1 046 · 1 174 Hz |
| Timbre | **sinus** |
| Écart | **55 ms** entre deux départs |
| Chaque note | `env(0,32 · 4 ms · 130 ms)`, coupée 200 ms après son départ |

La cascade compte exactement les **10 pièces** de la prime ([chapitre 6](06-l-argent.md)) : la prime est fixe, donc la cascade l'est aussi, et les deux dernières notes reprennent la gamme à l'octave.

**Renfort acheté**

| Brique | Réglage |
|---|---|
| Accord | **triangle**, **196 Hz** · **245 Hz** (×1,25) · **294 Hz** (×1,5) · **392 Hz** (×2) |
| Départ | les quatre ensemble, coupés à 900 ms |
| Enveloppes | `env(0,3 · 50 ms · 600 ms)`, l'attaque allongée de **20 ms** à chaque voix — 50, 70, 90, 110 ms |

L'accord **s'ouvre** au lieu de frapper : le Renfort est l'achat de celui qui va mal, il doit soulager et non récompenser.

**Bombe prise à la base**

| Brique | Réglage |
|---|---|
| Montée | **triangle 340 Hz**, glissé vers **646 Hz** (×1,9) en 120 ms, coupé à 300 ms |
| son enveloppe | `env(0,35 · 4 ms · 130 ms)` |
| Matière | bruit 80 ms, passe-bande **1 500 Hz** Q **1,2**, `env(0,2 · 2 ms · 60 ms)` |

### Les paramètres de synthèse — monde

**Portique qui s'allume**

| Brique | Réglage |
|---|---|
| Montée | **sinus 220 Hz**, glissé vers **440 Hz** (×2) en 350 ms, coupé à 800 ms |
| son enveloppe | `env(0,4 · 80 ms · 400 ms)` |
| Scintillement, à +300 ms | **sinus 1 320 Hz** (×6), `env(0,22 · 5 ms · 350 ms)`, coupé à 800 ms |

### *Le pouls*

| Grandeur | Valeur |
|---|---|
| Tempo | **96 temps par minute**, soit un temps toutes les **625 ms** |
| Notes, en boucle | **55 Hz · 55 Hz · 65,4 Hz · 49 Hz** — La₁, La₁, Do₂, Sol₁ |
| Timbre | **triangle**, passe-bas **420 Hz** Q **1,1** |
| Enveloppe d'une note | `env(0,5 · 10 ms · 500 ms)` — 80 % du temps —, coupée à 625 ms |
| Gain de piste | **0,5**, sur le bus musique à 0,45 |

Une note par temps, quatre temps qui tournent, aucun couplet et aucune fin : *le pouls* n'est pas un morceau, c'est un métronome grave.

### Le gémissement selon la population

| Zombies vivants | Gémissements par seconde |
|---:|---:|
| 4 *(vague 1)* | 0,7 |
| 14 | 2,5 |
| 22 | 3,9 |
| 30 | 5,4 |
| 40 *(vague 8)* | **7,1 — plafond atteint** |
| 60 *(palier de la Rallonge)* | **7,1 — plafonnée** |

Deux plafonds se relaient, et ils ne font pas le même travail. Le premier est **la cadence**, qui cesse de monter à quarante vivants : c'est là que le gémissement se raréfie, avant même d'être mélangé. Le second est le **plafond de 6 voix** du bus combat, que 7,1 voix par seconde de 0,82 seconde remplissent presque à elles seules — si bien que le moindre coup d'épée vole une voix de foule dès la vague 8. C'est voulu : ce que le joueur entend au-delà n'est plus la population, c'est une foule, et une foule ne se compte pas.

## Les interdits

- **Jamais un fichier audio, jamais une banque de sons, jamais une dépendance de plus** — tout se synthétise à la main, ou n'existe pas.
- **Jamais un dix-huitième bruitage** — la liste des dix-sept est fermée exactement comme celle des cinq affichages ([chapitre 8](08-le-bandeau-et-le-sas.md)) : elle s'allonge par décision, jamais par réflexe.
- **Jamais un son qui répète ce que l'image dit déjà** — c'est le critère qui a écarté cinq des six candidats retirés, et c'est le même que celui du bandeau.
- **Jamais un son de canon à sec** — l'état d'un canon se lit à la **longueur de sa flamme** ([chapitre 5](05-les-canons.md)), et une alarme qui suit chaque canon vide de la ville sonnerait en continu à partir de la vague 6.
- **Jamais un traitement « zombie derrière soi »** — un gémissement pané et assourdi est un cas particulier de plus pour un danger qui n'en est pas un : un zombie ne poursuit jamais le joueur ([chapitre 3](03-les-zombies.md)).
- **Jamais un son d'impact de boulet** — la **mire** dit où le boulet va tomber avant qu'il tombe ([chapitre 7](07-le-regard.md)), et le son du tir a déjà annoncé le coup ; doubler la cloche, c'est doubler la moitié des voix du bus défenses.
- **Jamais un son de montée d'échelle** — elle dure 0,8 s, elle est automatique, elle n'a rien à annoncer.
- **Jamais un son d'entrée du Colosse** — il **est** déjà visible d'emblée au bout de sa rue ([chapitre 3](03-les-zombies.md)), et un sous-grave qui esquive tout le reste pendant 1,6 s ferait de la vague 10 une annonce plutôt qu'une arrivée.
- **Jamais une nappe, jamais un drone, jamais une seconde musique** — *le pouls* est la seule, et il ne partage son bus avec rien.
- **Jamais une deuxième alarme** — une alarme qui a des concurrentes n'en est plus une, et l'esquive n'a de sens que si une seule chose peut baisser tout le reste.
- **Jamais un rugissement, jamais un cri, jamais un bruit de chair** — les zombies sont bêtes et comiques, et le public a 8 ans.
- **Jamais un son de mort du joueur** — il ne meurt pas : il s'écroule et il se relève, et ce sont deux sons, pas une fin.
- **Jamais un plafond de voix global** — il ferait taire une pièce parce qu'un assaut est bruyant, alors que ce sont deux choses sans rapport.
- **Jamais une voix refusée quand un bus est plein** — c'est la plus ancienne qui part, sinon le geste du joueur passerait après le décor.
- **Jamais un son différé ni remis en file** — un bruitage en retard sur son événement ment sur ce qui vient de se passer.
- **Jamais un gémissement par zombie** — soixante voix de gémissement ne sont pas un mélange, et la cadence a besoin d'être une décision, pas une conséquence.
- **Jamais un `resume()` automatique** — l'`AudioContext` ne repart que dans le gestionnaire de l'appui qui quitte le Sas ([chapitre 8](08-le-bandeau-et-le-sas.md)).
- **Jamais un réglage de volume, jamais un bouton muet, jamais un écran de son** — le Sas n'a aucun réglage.
- **Jamais un message quand le son ne revient pas** — le jeu se joue muet, et il se joue quand même.
- **Jamais un `PannerNode`, jamais d'atténuation par la distance, jamais de réverbération** — un `StereoPanner` par voix panoramiquée, et rien d'autre.
- **Jamais un second `AudioContext`, jamais un contexte par bruitage.**
- **Jamais un `Math.random()` ailleurs que dans `src/audio/`** — la règle du [chapitre 10](10-l-architecture.md) tient entière, et l'audio n'y déroge que parce que rien de ce qu'il tire n'est observable.

## Pourquoi

**Pourquoi tout est synthétisé, et pourquoi ce n'est pas une contrainte subie.** Le cadre du projet interdit les banques de sons sous licence et les dépendances d'exécution supplémentaires. En WebAudio, un bruitage de jeu voxel coûte trois briques — un oscillateur, un tampon de bruit, une enveloppe — et il tient en quinze lignes ; dix-sept bruitages tiennent dans un fichier plus court que le moindre `.wav` qu'ils remplacent. Le gain de côté est celui qui compte vraiment : **un bruitage est ici un tableau de chiffres**, donc il se relit, se compare et se retouche dans une PR contre ce chapitre, exactement comme un prix ou une portée. Aucun bruitage de ce jeu n'est un binaire opaque.

**Pourquoi le son ne dit que ce que l'image ne dit pas.** C'était la vraie question, et elle est plus dure qu'une liste d'effets. Le jeu affiche déjà énormément dans le monde : la flamme courte d'un canon à sec, la mire du boulet, la brassée au-dessus de la tête, le losange sous les pieds, la taille de la pièce. Un son pour chacune de ces choses n'ajoute rien et coûte des voix. Reste ce que l'image ne peut pas dire, et il n'y en a **qu'une** : la mairie qui encaisse pendant que le joueur est au fond d'une rue, dos à la place. Les seize autres bruitages ne sont pas là pour informer — ils sont là pour rendre **franc** un geste qui vient d'être fait, et c'est un tout autre métier.

**Pourquoi il ne reste qu'une seule alarme, alors qu'il y en avait trois.** Le canon à sec, le zombie derrière soi et l'entrée du Colosse ont été écartés pour trois raisons différentes qui reviennent à la même : aucun des trois n'est un fait hors champ. Le canon à sec est lisible sur le canon, et une alarme qui le suivrait sonnerait en boucle à partir du moment où la ville en compte six. Un zombie ne poursuit jamais le joueur : « derrière soi » n'est pas un danger, c'est une position. Le Colosse est visible dès la première seconde au bout de sa rue — l'annoncer serait annoncer ce qu'on regarde. Et cette réduction a un effet qu'on n'espérait pas : l'esquive cesse d'être un réglage pour devenir une règle nette — **une alarme, et une seule, baisse le reste**. Trois alarmes qui s'esquivent mutuellement auraient demandé une hiérarchie, donc des cas, donc des chiffres à trouver.

**Pourquoi les voix se plafonnent par bus et non globalement.** Un plafond global fait dépendre l'audibilité d'une pièce de la densité de l'assaut, ce qui est exactement le contraire de ce qu'on veut : l'argent est un retour d'action, il doit s'entendre à la vague 10 comme à la vague 1. Six familles, six plafonds, et chacune sature dans son coin. Le bus combat est le seul qui sature réellement — il mord dès la vague 8 —, et c'est le seul dont la saturation soit **voulue** : au-delà de six voix, ce que le joueur doit entendre n'est plus le nombre de zombies, c'est qu'il y en a trop pour les compter.

**Pourquoi on vole la plus ancienne et non l'inverse.** C'est la seule politique compatible avec la règle qui gouverne le bus combat : *le gémissement ne mange jamais le « tchac »*. Refuser la nouvelle voix ferait taire le coup d'épée du joueur au moment précis où six zombies gémissent — c'est-à-dire au moment où il frappe. Voler la plus ancienne fait l'inverse : le geste du joueur passe toujours, et c'est un morceau de foule qui s'efface. Une extinction en 12 ms est trop courte pour s'entendre et trop longue pour claquer.

**Pourquoi le gémissement n'appartient à aucun zombie.** Attacher un gémissement à chaque zombie donne soixante émetteurs indépendants dont la somme est ingouvernable : à la vague 14, la cadence n'est plus une décision, c'est une conséquence de la table des vagues. En le remontant au niveau de l'assaut, la cadence devient deux chiffres — une échéance toutes les 140 ms, et une part égale à la population divisée par quarante, jamais plus d'une voix par échéance — qui se retouchent sans toucher aux zombies, et qui produisent exactement la densité éprouvée à la vague 8. Le zombie désigné ne sert plus qu'à une chose : donner un panoramique, pour que la foule vienne d'une direction plutôt que du centre.

**Pourquoi la hauteur du gémissement ne dit pas le type.** La tentation est forte — un Costaud plus grave, un Sprinteur plus aigu — et elle échoue sur le même écueil que le reste du chapitre : le type se **voit**, il a sa taille, sa couleur et sa vitesse ([chapitre 3](03-les-zombies.md)). Une hauteur qui le redirait n'apprendrait rien à un enfant de 8 ans et rendrait la foule lisible comme un tableau, ce qu'elle n'est pas. Le tirage entre ×0,8 et ×1,3 existe pour une raison bien plus simple : trente voix à la même hauteur ne font pas une foule, elles font une machine.

**Pourquoi seuls cinq bruitages sont panoramiqués.** Le panoramique coûte un nœud par voix et ne sert que si l'information « de quel côté » a un sens. Elle en a un pour les zombies et les canons, qui sont dans une rue ou dans une autre. Elle n'en a aucun pour ce qui arrive au joueur lui-même — le contact, l'écroulement, le relèvement —, pour ce qui arrive à la ville entière — la mairie, le portique, la prime — ni pour ce qu'on achète en se tenant dessus. Les trois sons de l'épée sont un cas intermédiaire : ils sont attachés à un zombie, donc ils ont un côté, mais ce zombie est à moins de deux blocs. Un panoramique large les ferait sauter d'une oreille à l'autre à chaque coup ; saturés à ±0,28, ils gardent leur direction sans bouger.

**Pourquoi le craquement, et pas le sous-grave.** L'alarme de la mairie a un sous-grave à 62 Hz qui porte tout le poids du coup, et un craquement à 340 Hz par-dessus. Le haut-parleur d'un iPad ne restitue pas le premier : sur casque, l'alarme est un coup dans le ventre ; sur la tablette, sans le craquement, elle n'est presque rien. Or c'est sur la tablette, au haut-parleur, que le jeu se joue. Le sous-grave reste — il ne coûte rien et il fait le corps du son quand il y a de quoi le rendre —, mais **c'est le craquement qui porte le message**, et c'est lui qu'on ne touche pas.

**Pourquoi la cascade de la prime compte dix notes.** La prime de fin d'assaut vaut 10 pièces, fixe, d'une vague à l'autre et Rallonge comprise ([chapitre 6](06-l-argent.md)). Une note par pièce donne au son la seule chose qu'un assaut sans chrono ne possède pas : une **ponctuation** dont la longueur est toujours la même. L'enfant apprend en trois assauts que la cascade dit « c'est fini, tu as tenu », et il l'apprend sans un mot parce qu'elle ne varie jamais — ni avec la vague, ni avec la difficulté, ni avec ce qu'il a fait.

**Pourquoi *le pouls* et pas *la nappe*.** Les deux répondaient à la même question : un assaut n'a aucun chrono, donc aucune tension venue du temps. Un drone tenu habite le silence sans rien presser ; une pulsation à 96 temps/min donne un tempo. C'est le tempo qu'on veut, précisément parce que la phase qui en manque est l'assaut et non la préparation — et c'est pour cela que *le pouls* s'arrête à la mort du dernier zombie, laissant la préparation dans son silence. Deux musiques auraient demandé de décider laquelle joue quand, ce qui est un réglage de plus pour un jeu qui n'a aucun réglage.

**Pourquoi le pouls se tait pendant la préparation.** Une musique continue devient un fond qu'on cesse d'entendre en une minute. Coupée à la préparation, elle redevient un signal : le silence qui suit la cascade des dix pièces dit « c'est fini » aussi fort que la cascade elle-même, et la reprise du pouls dit « ça recommence » sans qu'aucun carton n'ait à le dire. Le jeu n'a ni compte à rebours ni annonce ([chapitre 8](08-le-bandeau-et-le-sas.md)) : la seule ponctuation dont il dispose est ce qui s'arrête et ce qui repart.

**Pourquoi l'audio a le droit d'appeler `Math.random()`.** L'interdiction du [chapitre 10](10-l-architecture.md) protège une propriété précise : une partie doit se rejouer à partir de (graine + suite des entrées), sans quoi le banc ne mesure rien. Le décalage du tampon de bruit et la hauteur d'un gémissement ne sortent jamais de `src/audio/` : ils n'entrent dans aucun champ de `Game`, ne partent pas dans l'Instantané, ne déplacent pas le tirage du monde, et le banc tourne **sans audio du tout**. Faire passer ces deux tirages par le générateur du monde aurait le défaut exactement inverse : retoucher un bruitage décalerait toutes les vagues suivantes.

**Pourquoi les deux sons du joueur qui tombe sont le Contact transposé.** *S'écrouler* et *se relever* sont arrivés après le banc, et ils n'y ont jamais été joués. Plutôt que d'inventer deux timbres qui n'auraient été confrontés à rien, ils reprennent le graphe du Contact — le seul son du jeu qui parle déjà du corps du joueur — en le poussant vers le grave et le long pour la chute, et en le retournant vers le haut pour le relèvement. Trois secondes séparent les deux, ce qui suffit à les entendre comme une paire ; et la montée du relèvement est la même figure que celle de la bombe prise à la base, ce qui installe la grammaire la plus simple qui soit : **ce qui descend est un accident, ce qui monte est un gain**.

**Pourquoi ces niveaux et ces plafonds, et ce qu'ils deviennent.** Ils sont ceux sur lesquels le banc a joué un assaut complet de vague 8 — deux rues actives, un paquet de quatre toutes les 6 secondes par rue, six canons à un boulet toutes les 2 secondes, l'épée en rafales à 2,5 coups par seconde, une fuite toutes les 11 secondes ([chapitre 3](03-les-zombies.md)). Ce sont donc des chiffres éprouvés contre la seule densité qui compte, et non des valeurs par défaut. Ils se retouchent comme tout le reste de ce dossier : par une PR contre ce chapitre, en même temps que `src/audio/` — un mélange n'est jamais fini, mais il est toujours écrit quelque part.

## D'où ça vient

[#30](https://github.com/ben-barbier/apocalypse-zombie/issues/30) pour l'essentiel : la synthèse intégrale en WebAudio sans aucun fichier ni banque de sons, l'audio branché sur le tampon d'événements et jamais sur l'état, le critère « ce que le son doit dire que l'image ne dit pas », la liste des dix-sept bruitages par famille, les paramètres de synthèse de quinze d'entre eux et du pouls, les six bus avec leurs niveaux et leurs plafonds, le compresseur et le maître, l'esquive et sa politique de vol de voix, le retrait motivé du canon à sec, du zombie derrière soi, de l'impact de boulet, de la montée d'échelle, de l'entrée du Colosse et de la nappe, l'alarme unique de la mairie, *le pouls* à 96 temps/min comme seule musique, et la saturation du bus combat à la vague 8. [#22](https://github.com/ben-barbier/apocalypse-zombie/issues/22) pour *s'écrouler* et *se relever*, dus en v1 et sans paramètres au banc. [#10](https://github.com/ben-barbier/apocalypse-zombie/issues/10) pour les trois sons de l'épée — le « tchac » qui touche, le « bloup » qui tue, le souffle sourd qui rate. [#13](https://github.com/ben-barbier/apocalypse-zombie/issues/13) pour le tampon d'événements, le générateur du monde et l'audio qui n'y touche pas. [#17](https://github.com/ben-barbier/apocalypse-zombie/issues/17) pour l'`AudioContext` qui ne repart que du Sas et le jeu qui continue muet. [#26](https://github.com/ben-barbier/apocalypse-zombie/issues/26) pour la densité de la vague 8 sur laquelle le mélange a été éprouvé. [#25](https://github.com/ben-barbier/apocalypse-zombie/issues/25) pour la fuite hors champ, seul fait que l'image ne peut pas dire. [#23](https://github.com/ben-barbier/apocalypse-zombie/issues/23) pour la mire qui rend l'impact de boulet inutile. Le public de 8 ans, qui interdit tout ce qui fait peur, vient du cadre verrouillé de la [carte #1](https://github.com/ben-barbier/apocalypse-zombie/issues/1).
