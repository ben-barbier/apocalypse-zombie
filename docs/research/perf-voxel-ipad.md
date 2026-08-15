# Budget de performance voxel sur iPad

> Recherche pour le ticket [#4](https://github.com/ben-barbier/apocalypse-zombie/issues/4). Vérifié le **15 août 2026**.
> Cadre verrouillé en amont : moteur **Three.js r185 / npm `0.185.1`** (ticket [#2](https://github.com/ben-barbier/apocalypse-zombie/issues/2)), **un seul build web**, **WebGL2** (pas de WebGPU sur la cible), plancher matériel **iPad à puce A13/A14** (iPad 9ᵉ ou 10ᵉ génération), iPadOS **16.4** minimum (ticket [#3](https://github.com/ben-barbier/apocalypse-zombie/issues/3)).
> Boucle de jeu : 10 vagues, difficulté qui monte par le **nombre** de zombies (ticket [#5](https://github.com/ben-barbier/apocalypse-zombie/issues/5)) — c'est donc ce document qui fixe le plafond de population.
> Ville de référence (ticket [#6](https://github.com/ben-barbier/apocalypse-zombie/issues/6)) : **64 × 64 blocs**, place centrale 24 × 24, anneau d'une dizaine de bâtiments de 6 à 12 blocs, extérieur décoratif.

---

## 0. Méthode et étiquettes

Trois étiquettes, portées à chaque affirmation :

- **[source]** — fait établi par une source primaire, avec URL : code source de Three.js ou de WebKit, spécification Khronos, documentation ou fiche technique Apple, bugtracker WebKit, documentation officielle d'un éditeur de moteur.
- **[calcul]** — arithmétique faite ici, à partir d'hypothèses écrites noir sur blanc. Vérifiable, mais ce n'est pas une mesure.
- **[à mesurer]** — aucune source primaire ne donne le chiffre. Il figure en §14 et ne doit pas être traité comme acquis.

Aucun banc d'essai tiers n'est cité sans méthodologie publiée. **Il n'existe, à la connaissance de cette recherche, aucune mesure publique et méthodologiquement explicite du nombre de draw calls ou de triangles tenables à 60 images/seconde sur un iPad A13 en WebGL2.** C'est une conclusion en soi : le budget ci-dessous n'est donc pas déduit d'un banc d'essai, il est **construit par l'architecture** puis borné par le seul chiffre d'éditeur disponible (§3).

---

## 1. Ce que la cible impose

### 1.1 Le matériel, d'après Apple

| Appareil | Puce | Écran | Pixels | ProMotion | RAM publiée |
|---|---|---|---|---:|---|
| **iPad 9ᵉ gén. (2021)** | A13 Bionic | 10,2″, 264 ppi | **2160 × 1620 = 3 499 200** | non | **non publiée** |
| **iPad 10ᵉ gén. (2022)** | A14 Bionic, **4 cœurs graphiques** | 10,86″, 264 ppi | **2360 × 1640 = 3 870 400** | non | **non publiée** |
| iPad Pro 11″ 4ᵉ gén. (M2) | M2, **10 cœurs graphiques**, 100 Go/s | 11″, 264 ppi | 2388 × 1668 = 3 983 184 | oui | oui |

[source] [iPad (9th generation) — Tech Specs](https://support.apple.com/en-us/111898) · [iPad (10th generation) — Tech Specs](https://support.apple.com/en-us/111840) · [iPad Pro 11-inch (4th generation) — Tech Specs](https://support.apple.com/en-us/111842)

**Deux faits à retenir de ce tableau.**

1. **Apple ne publie pas la RAM des iPad à puce A.** Elle la publie pour les modèles à puce M. Tout chiffre de RAM pour un iPad 9 ou 10 est donc non sourçable ici, et le budget mémoire ne peut pas être calculé — il devra être mesuré (§14).
2. **Le nombre de pixels est quasi identique de l'A13 au M2** (3,5 à 4,0 millions), alors que le GPU passe de 4 à 10 cœurs. [calcul] Autrement dit : **la même surface à remplir, avec environ 2,5 fois moins de GPU**. C'est la seule ressource où l'écart A13 / puce M est structurel, et c'est celle qui commande la décision de résolution de rendu (§8).

Limites de texture du GPU, d'après Apple, pour les familles **Apple GPU Family 6 (A13)** et **7 (A14)** :

| Limite | Valeur |
|---|---:|
| Largeur/hauteur max d'une texture 2D | **16 384** |
| Couches max d'un tableau de textures 1D/2D | **2 048** |
| Textures lisibles par une fonction fragment | **96** |

[source] [Apple — Metal Feature Set Tables (PDF)](https://developer.apple.com/metal/Metal-Feature-Set-Tables.pdf)

→ **La taille de texture n'est pas une contrainte pour nous.** Notre atlas de tuiles 16 × 16 tient dans 256 × 256 pixels ; on est deux ordres de grandeur sous le plafond. La valeur réellement exposée par WebGL2 via ANGLE peut être inférieure à celle du matériel et reste [à mesurer], mais l'écart ne peut pas nous mettre en défaut.

### 1.2 Le budget par image est de 16,67 ms — sur tous les iPad

Les iPad 9 et 10 sont des dalles 60 Hz (aucune mention de ProMotion sur leurs fiches Apple, contrairement à l'iPad Pro). Mais surtout, **WebKit plafonne la boucle de rendu de la page à ~60 Hz par défaut, y compris sur les appareils ProMotion** :

```yaml
PreferPageRenderingUpdatesNear60FPSEnabled:
  humanReadableName: "Prefer Page Rendering Updates near 60fps"
  humanReadableDescription: "Prefer page rendering updates near 60 frames per second
                             rather than using the display's refresh rate"
  defaultValue:
    WebKit:
      "PLATFORM(VISION)": false
      default: true
```

[source] [WebKit — `UnifiedWebPreferences.yaml`](https://github.com/WebKit/WebKit/blob/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml)

L'explainer WebKit dit la même chose en prose : « *On Apple's 120Hz devices, accelerated animations already run at 120Hz thanks to Core Animation's built-in support for the ProMotion technology, whereas the rest of the Web page only updates at 60Hz* », et donne la raison : « *WebKit chose to restrict web content updates to 60Hz for two reasons: first, we measured a significant increase in power usage, and second, we found several examples of web pages that had incorrect behavior when `requestAnimationFrame()` callbacks were fired at a non-60Hz frequency.* » [source] [WebKit/explainers — animation-frame-rate](https://github.com/WebKit/explainers/tree/main/animation-frame-rate)

Le réglage est désactivable par l'utilisateur sur iPad Pro (le bug [#272165](https://bugs.webkit.org/show_bug.cgi?id=272165) porte le titre « *120Hz requestAnimationFrame is not supported on iPhone Pros, it is supported on iPad Pros* »), mais le rapporteur y note que le drapeau est « *on by default* » et que « *PWAs only run off of system default feature flags* ». [source] — cette dernière affirmation vient du rapporteur, pas d'un ingénieur WebKit : **confiance moyenne**.

→ **Conséquence de conception, ferme** : le budget est de **16,67 ms par image**, et il ne change pas si l'iPad se révèle être un modèle à puce M. Ce qui change avec une puce M, c'est la marge dans ces 16,67 ms — pas leur durée.

### 1.3 Un seul contexte WebGL, et pas d'instrument de mesure GPU

- **WebKit plafonne le nombre de contextes WebGL simultanés** : `static constexpr size_t maxActiveContexts = 16;`. Au-delà, le plus ancien est perdu. [source] [WebKit — `WebGLRenderingContextBase.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/canvas/WebGLRenderingContextBase.cpp)
  → **Règle** : un seul `WebGLRenderer`, un seul canvas, pour toute la durée de vie du jeu. Pas de canvas de prévisualisation, pas de mini-carte en second contexte WebGL (une mini-carte se fait en 2D ou en `RenderTarget` du même contexte).
- **Les requêtes de chronométrage GPU sont désactivées par défaut dans Safari** :
  ```yaml
  WebGLTimerQueriesEnabled:
    status: developer
    humanReadableName: "WebGL Timer Queries"
    defaultValue: { WebKit: { default: false } }
  ```
  [source] même fichier.
  → **Conséquence** : on ne pourra pas profiler le GPU par `EXT_disjoint_timer_query_webgl2` sur l'appareil. Le seul instrument disponible est **l'écart entre deux `requestAnimationFrame`** et `renderer.info`. Le protocole de mesure du §14 est bâti là-dessus.

### 1.4 Mémoire : pas de plafond publié, mais un plafond réel et fatal

Aucune documentation Apple ne publie de limite mémoire par onglet. Ce qu'on peut établir :

- **La limite spécifique au canvas a été supprimée de WebKit** le 29 juin 2023 (commit `265628@main`). Elle valait auparavant `maxActivePixelMemory()` = RAM/4 sur iOS. [source] [bugs.webkit.org #195325](https://bugs.webkit.org/show_bug.cgi?id=195325) · [commit](https://github.com/WebKit/WebKit/commit/6bd11f3792f05b4e58e5647bf173212879fa62cc)
- **Mais la limite du processus, elle, existe et tue la page.** Dean Jackson (WebKit), en motivant cette suppression : « *Remove the canvas-specific limit. This would allow pages to create more/bigger canvas elements, although this means they are more likely to hit **the overall Web page limit (iOS process limit) at which point the whole page will crash**.* » [source] même bug, commentaire 14.
- **Cette limite est fonction de la RAM de l'appareil.** Ben Nham (WebKit) : « *On iPad, the WebContent process has a higher memory limit… **For an 8GB device, the limit will be in the 4GB+ range**.* » Et pour les tableaux typés spécifiquement : « *Typed arrays… are allocated into a region called the Gigacage… **Currently the Gigacage supports 2GB of allocations on iOS**.* » [source] [bugs.webkit.org #268816](https://bugs.webkit.org/show_bug.cgi?id=268816)

→ **Ce qu'on en tire.** Le plafond exact d'un iPad 9 ou 10 est **[à mesurer]**, et il est probablement bien inférieur à 4 Go puisqu'il suit la RAM. Mais l'ordre de grandeur de notre consommation (§2) est de quelques mégaoctets : **la mémoire n'est pas la contrainte de ce projet**, à condition de ne jamais réallouer de gros tampons en cours de partie (§6.4). Corollaire du point de doc #3 : comme WebKit n'implémente ni `freeze`/`resume` ni `document.wasDiscarded`, on ne saura jamais si l'onglet a été purgé — la sauvegarde continue reste obligatoire.

---

## 2. Le budget n'est pas là où on l'attend

Avant de fixer des plafonds, il faut voir où passe réellement le coût. L'arithmétique voxel donne un résultat contre-intuitif qu'il faut poser d'emblée, parce qu'il réoriente tout le reste du document.

### 2.1 La ville de 64 × 64, chiffrée

Hypothèses, explicites : emprise **64 × 64** blocs ; sol plat (place centrale 24 × 24 comprise) ; **10 bâtiments** d'emprise moyenne 8 × 8 et de hauteur moyenne 9 blocs ; une marge de 2 000 faces pour l'extérieur décoratif, les trottoirs et les détails. La technique de base est celle du manuel officiel : **on ne génère que les faces qui n'ont pas de voisin**.

[calcul]

| Poste | Faces visibles |
|---|---:|
| Sol : 64 × 64 | 4 096 |
| 10 bâtiments : toit (64) + murs (4 × 8 × 9 = 288) − emprise au sol retirée (64) = 288 chacun | 2 880 |
| Extérieur décoratif, trottoirs, détails (marge) | 2 000 |
| **Total** | **≈ 8 976 faces** |

Une face = 1 quad = 2 triangles = 4 sommets. Le manuel officiel construit ses sommets en `Float32Array` avec `position` (3), `normal` (3) et `uv` (2), soit **32 octets par sommet**. [source] [Three.js manual — Voxel (Minecraft Like) Geometry](https://threejs.org/manual/#en/voxel-geometry)

- **≈ 18 000 triangles**
- **≈ 36 000 sommets**
- **≈ 1,3 Mo** de géométrie (36 000 × 32 o + 8 976 × 6 index)

### 2.2 Les zombies, chiffrés

Un zombie = 6 boîtes. Une boîte = 12 triangles, 24 sommets.

[calcul] **60 zombies simultanés = 360 boîtes = 4 320 triangles.** Avec l'instanciation, la géométrie n'existe qu'**une seule fois** en mémoire (6 boîtes distinctes, soit 144 sommets au total) ; seules les matrices sont dupliquées, à 64 octets l'instance (`new Float32Array( count * 16 )` — [source] [Three.js — `InstancedMesh.js`](https://github.com/mrdoob/three.js/blob/r185/src/objects/InstancedMesh.js)). Soit **23 Ko** de matrices pour 60 zombies × 6 parties.

### 2.3 Le constat

[calcul] La scène complète au pic — ville, 60 zombies, joueur, 24 canons, 96 projectiles, 512 particules — pèse de l'ordre de **30 000 triangles** et **quelques mégaoctets**. À titre de comparaison, l'exemple officiel `webgl_mesh_batch` de Three.js propose un curseur allant jusqu'à **20 000 objets** distincts. [source] [three.js — `examples/webgl_mesh_batch.html`](https://github.com/mrdoob/three.js/blob/r185/examples/webgl_mesh_batch.html)

> **Le nombre de triangles et la mémoire ne seront jamais la contrainte de ce jeu.** Les trois ressources qui peuvent réellement manquer sont, dans cet ordre :
> 1. **les fragments** — le nombre de pixels à remplir, 3,5 millions par image à résolution native (§8) ;
> 2. **les draw calls**, parce que c'est un coût **CPU** et que Safari fait transiter chaque appel WebGL vers un processus GPU séparé (§3) ;
> 3. **le CPU JavaScript** — l'IA des zombies, le ciblage des canons, et surtout le ramasse-miettes (§10).
>
> Tout le reste du document découle de ce classement.

---

## 3. Draw calls : le vrai budget

### 3.1 Le seul chiffre d'éditeur disponible

Aucune source Apple ni Khronos ne publie de plafond de draw calls. La seule documentation d'éditeur de moteur qui en donne un, et qui vise explicitement le bas de gamme mobile, est celle de PlayCanvas :

> « *In PlayCanvas, a mesh instance is a draw call… Each draw call requires some effort on the CPU to dispatch to WebGL. Therefore, keeping the number of draw calls low is advisable, particularly on mobile. … **100-200 draw calls is a rough target for low end mobile devices.** High end desktop machines on the other hand can process thousands every frame and still maintain 60fps.* »

[source] [PlayCanvas — General Guidelines](https://developer.playcanvas.com/user-manual/optimization/guidelines/)

C'est un ordre de grandeur, pas une mesure sur A13, et PlayCanvas est le seul des quatre moteurs comparés au ticket #2 à publier une matrice de support iOS explicite — ce qui lui donne un peu de crédit sur ce terrain. On retient la **borne basse, 100**, comme seuil d'alerte, et **150** comme plafond dur.

### 3.2 L'architecture proposée, chiffrée

[calcul] Chaque poste utilise la technique établie dans les sections suivantes.

| Poste | Technique | Draw calls |
|---|---|---:|
| Ville statique | 16 `Mesh` fusionnés (chunks de 16 × 16 en XZ) | ≤ 16 |
| Zombies | **6 `InstancedMesh`**, une par boîte du corps, N instances | **6** |
| Joueur | 6 `Mesh` (un seul personnage) | 6 |
| Canons | 2 `InstancedMesh` (socle, tube) | 2 |
| Projectiles | 1 `InstancedMesh` | 1 |
| Particules / débris | 1 `Points` (ou 1 `InstancedMesh`) | 1 |
| Marqueurs 3D (flèche du dernier zombie, cercle de portée, silhouette de pose) | 3 | 3 |
| Ciel / décor lointain | 1 | 1 |
| **Sous-total opaque** | | **36** |
| Passe d'ombre (1 lumière directionnelle, casters = personnages, canons, projectiles) | +1 draw call par objet caster | **+15** |
| **Total** | | **≈ 51** |

Le frustum culling ramène en pratique les 16 chunks de ville à 6–10 visibles depuis une caméra à la 3ᵉ personne au niveau du sol.

→ **On est à un tiers de la borne basse du seul chiffre d'éditeur disponible.** Le budget de draw calls n'est pas contraignant *pour cette architecture* — mais il le deviendrait immédiatement si l'on renonçait à l'instanciation : 60 zombies en `Mesh` séparés font **360 draw calls** à eux seuls, soit deux fois le plafond. C'est tout l'enjeu du §5.

### 3.3 Ce qu'un draw call coûte réellement sur Safari

Une nuance importante, parce qu'elle change ce qu'on peut espérer de l'optimisation. `WEBGL_multi_draw` remplace N appels JavaScript par un seul, mais la spécification Khronos est explicite sur le fait que le GPU voit toujours N dessins : les nouveaux points d'entrée « *behave identically to multiple calls to `drawArrays`, `drawElements`, `drawArraysInstanced`, and `drawElementsInstanced` except they handle multiple lists of arguments in one call* ». [source] [Khronos — WEBGL_multi_draw](https://github.com/KhronosGroup/WebGL/blob/main/extensions/WEBGL_multi_draw/extension.xml)

Et côté pilote Apple, ANGLE l'implémente par **une boucle C++** : `ContextMtl::multiDrawArrays` délègue à `rx::MultiDrawArraysGeneral`, dont la macro est un `for (GLsizei drawID = 0; drawID < drawcount; ++drawID)`. [source] [ANGLE — `ContextMtl.mm`](https://github.com/google/angle/blob/main/src/libANGLE/renderer/metal/ContextMtl.mm) · [`renderer_utils.cpp`](https://github.com/google/angle/blob/main/src/libANGLE/renderer/renderer_utils.cpp)

→ **Ce qu'on économise avec le multi-draw, c'est la traversée JavaScript → validation WebKit → IPC vers le processus GPU, pas le travail du pilote.** C'est réel et non négligeable sur Safari, mais borné. **L'instanciation matérielle, elle, est un vrai draw call unique** — c'est pourquoi elle est préférée partout dans ce budget.

---

## 4. La ville statique

### 4.1 Fusion contre instanciation : la fusion gagne, et pas pour la mémoire

Deux façons de faire une ville de cubes :

- **Instancier** un cube par bloc : 1 draw call, mais **24 sommets et 12 triangles par bloc**, y compris pour les faces enterrées que personne ne verra jamais.
- **Fusionner** en supprimant les faces sans voisin (la recette du manuel officiel) : 1 draw call par chunk, et **seulement les faces exposées**.

[calcul] Pour notre ville, une version « un cube instancié par bloc » demanderait, rien que pour les 10 bâtiments (10 × 8 × 8 × 9 = 5 760 blocs) et le sol (4 096 blocs), près de **10 000 blocs × 12 = 118 000 triangles** et **236 000 sommets** à traiter par le vertex shader **à chaque image**. La version fusionnée en traite **18 000 et 36 000**. Le rapport est de **6,5×**, et il porte sur du travail par image, pas sur de la mémoire.

L'argument mémoire, souvent avancé, joue en sens inverse et il est négligeable : l'instanciation coûte 64 octets par bloc (~640 Ko), la fusion 1,3 Mo. **Un mégaoctet d'écart ne pèse rien ; six fois le travail du vertex shader à chaque image, si.** C'est pour cela que la fusion gagne.

Three.js documente lui-même l'échec de la voie naïve, dans le manuel voxel : « *It takes a while to start and if you try to move the camera it's likely too slow… 256x256 is 65536 boxes!* », puis, pour un volume plein de 256³ : « *It churned for about a minute and then crashed with out of memory.* » [source] [Three.js manual — Voxel Geometry](https://threejs.org/manual/#en/voxel-geometry)

L'exemple officiel `webgl_instancing_performance` propose exactement cette comparaison à trois branches — `INSTANCED`, `MERGED`, `NAIVE` — et constitue le banc d'essai à ouvrir sur l'iPad cible. [source] [three.js — `examples/webgl_instancing_performance.html`](https://github.com/mrdoob/three.js/blob/r185/examples/webgl_instancing_performance.html)

### 4.2 Chunks : 16 × 16, pas 32 × 32

Le manuel officiel utilise des cellules de **32 × 32 × 32** stockées en `Uint8Array` de 32 768 octets. [source] même page.

[calcul] Pour une ville de 64 × 64 et une hauteur ≤ 12 :

| Taille de chunk | Chunks | Draw calls max | Efficacité du culling |
|---|---:|---:|---|
| 32 × 32 (manuel) | 4 | 4 | mauvaise : un chunk = un quart de la ville |
| **16 × 16** | **16** | **16** | bonne : la caméra en voit 6 à 10 |
| 8 × 8 | 64 | 64 | excellente, mais 64 draw calls |

→ **On retient 16 × 16 en XZ, hauteur pleine.** Le frustum culling de Three.js est un test par `Object3D` (`_frustum.intersectsObject( object )` dans `projectObject`) : il ne coupe donc *rien* à l'intérieur d'un chunk, d'où l'intérêt d'en avoir plusieurs. [source] [three.js — `WebGLRenderer.js`](https://github.com/mrdoob/three.js/blob/r185/src/renderers/WebGLRenderer.js)

Le manuel avertit par ailleurs : « *Calling `geometry.computeBoundingSphere` might be slow* », et recommande de poser à la main une sphère englobante couvrant le chunk entier. [source] même page. → **À faire**, sinon la régénération d'un chunk coûte un parcours complet de ses sommets.

### 4.3 Greedy meshing : non en v1, et voici pourquoi

Le *greedy meshing* fusionne les faces coplanaires adjacentes de même type en grands quads. Sur une ville comme la nôtre, faite de grandes surfaces planes (le sol de 64 × 64, les murs de 8 × 9), le gain est réel : les 4 096 faces du sol deviendraient une poignée de quads.

Mais il a un prix documenté, et ce prix est structurel : **un quad qui couvre 8 × 3 blocs doit répéter sa texture**, ce qui exige un mode d'habillage `REPEAT`. Un atlas classique ne le permet pas — les coordonnées débordant sur les tuiles voisines. La solution correcte est un **tableau de textures WebGL2** (`TEXTURE_2D_ARRAY`), où chaque couche s'échantillonne indépendamment.

Or, dans Three.js r185, **aucun matériau intégré n'accepte un `sampler2DArray`** : il faut écrire son propre `ShaderMaterial`, donc réimplémenter l'éclairage, les ombres et le brouillard à la main. C'est un chantier de plusieurs jours, avec sa propre dette.

[calcul] Mettons ce coût en face du gain : le greedy meshing ferait passer la ville d'environ 18 000 à peut-être 4 000 triangles. **On économiserait 14 000 triangles par image sur un budget où l'on en a déjà mille fois trop de marge** (§2.3).

→ **Décision : pas de greedy meshing en v1.** On applique la recette du manuel — suppression des faces sans voisin, atlas classique, `NearestFilter` — et rien de plus.
→ **Condition de réouverture, écrite pour ne pas avoir à en rediscuter** : si la ville dépasse **60 000 faces visibles** (le triple de la valeur prévue), ou si la mesure sur l'appareil montre que le vertex shader est le goulot d'étranglement, alors greedy meshing **et** tableau de textures, ensemble — jamais l'un sans l'autre.

### 4.4 Saignement de texels : pourquoi le problème ne se posera pas

Le saignement d'atlas — un texel de la tuile voisine qui apparaît sur le bord d'un bloc — a **deux** causes, et notre configuration les élimine toutes les deux :

1. **Le filtrage linéaire**, qui interpole entre texels voisins. Nous sommes en `NearestFilter` en magnification **et** en minification : l'échantillonnage retourne un texel unique, jamais une moyenne de deux.
2. **Les mipmaps**, qui, à chaque niveau, moyennent des texels appartenant à des tuiles différentes. Le saignement y devient inévitable sur un atlas classique, quel que soit le filtre appliqué au niveau le plus fin.

Three.js documente la recette exacte : `magFilter = minFilter = NearestFilter` et `generateMipmaps = false`. [source] [docs Texture](https://threejs.org/docs/#Texture) · [NearestFilter](https://threejs.org/docs/#global.NearestFilter). Le manuel voxel applique littéralement `texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter;`. [source] [manuel voxel](https://threejs.org/manual/#en/voxel-geometry)

**Le piège à connaître** : mettre `minFilter = NearestFilter` sans mettre `generateMipmaps = false` fait générer des mipmaps qui ne seront jamais utilisées — de la mémoire et du temps de chargement gaspillés. **Poser les deux, explicitement.**

**Ce que ça coûte, honnêtement** : sans mipmaps, une texture minifiée scintille quand la caméra s'éloigne. Sur un jeu à caméra 3ᵉ personne proche du sol, avec des blocs d'une unité et des textures 16 × 16, la minification reste faible. **[à mesurer]** : chercher le scintillement sur les toits vus de loin, et sur le sol au bord de l'horizon.

---

## 5. Zombies : squelette contre boîtes articulées

**C'est la décision que ce ticket doit trancher.** Elle se tranche sur une seule ligne du code de Three.js.

### 5.1 Ce que coûte un `SkinnedMesh`

Dans Three.js r185, le skinning est fait dans le vertex shader, et les matrices d'os transitent par **une texture** :

```glsl
uniform highp sampler2D boneTexture;

mat4 getBoneMatrix( const in float i ) {
    int size = textureSize( boneTexture, 0 ).x;
    int j = int( i ) * 4;
    vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
    vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
    vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
    vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
    return mat4( v1, v2, v3, v4 );
}
```
[source] [`skinning_pars_vertex.glsl.js`](https://github.com/mrdoob/three.js/blob/r185/src/renderers/shaders/ShaderChunk/skinning_pars_vertex.glsl.js)

Et cette fonction est appelée **quatre fois par sommet** :

```glsl
mat4 boneMatX = getBoneMatrix( skinIndex.x );
mat4 boneMatY = getBoneMatrix( skinIndex.y );
mat4 boneMatZ = getBoneMatrix( skinIndex.z );
mat4 boneMatW = getBoneMatrix( skinIndex.w );
```
[source] [`skinbase_vertex.glsl.js`](https://github.com/mrdoob/three.js/blob/r185/src/renderers/shaders/ShaderChunk/skinbase_vertex.glsl.js)

[calcul] **Soit 16 `texelFetch` par sommet.** Auxquels s'ajoutent deux attributs de sommet supplémentaires — `attribute vec4 skinIndex; attribute vec4 skinWeight;` [source] [`WebGLProgram.js`](https://github.com/mrdoob/three.js/blob/r185/src/renderers/webgl/WebGLProgram.js) — soit **32 octets de plus par sommet**, une augmentation de 100 % sur nos 32 octets de base.

Mais le coût décisif n'est ni les fetches ni les octets. **`boneTexture` est un `uniform`.** Deux zombies aux poses différentes ont deux textures d'os différentes, donc deux valeurs d'uniform, donc **deux draw calls**. Un `InstancedMesh` ne peut pas s'en sortir : par construction, toutes ses instances partagent les mêmes uniforms.

[calcul] **60 zombies en `SkinnedMesh` = 60 draw calls minimum, plus 60 mises à jour de texture par image.** Avec la passe d'ombre, 120. On est au plafond du §3.1 rien qu'avec les zombies.

### 5.2 Ce que coûtent des boîtes articulées

Un zombie de 6 boîtes se décompose naturellement en 6 rôles : tête, torse, deux bras, deux jambes. Chaque rôle a la **même géométrie pour tous les zombies** — seule la matrice change.

→ **Une `InstancedMesh` par partie du corps, une instance par zombie.** Six `InstancedMesh` au total, quel que soit le nombre de zombies.

Le renderer les dessine en un appel chacun :
```js
} else if ( object.isInstancedMesh ) {
    renderer.renderInstances( drawStart, drawCount, object.count );
}
```
[source] [`WebGLRenderer.js`](https://github.com/mrdoob/three.js/blob/r185/src/renderers/WebGLRenderer.js)

Deux propriétés rendent le schéma pratique :

- **`object.count` est relu à chaque image**, dans la ligne ci-dessus. On alloue donc le tableau une fois pour le maximum et on pilote le nombre de zombies vivants par `.count`. Aucune réallocation en cours de partie — voir §6.4, c'est un point de robustesse, pas seulement de performance.
- Le coût par image est de **6 × N compositions de matrice** en JavaScript, plus l'envoi du tampon d'instances. [calcul] Pour 60 zombies : 360 matrices, **23 Ko** téléversés.

**Attention à un piège du chemin d'envoi** : sans plage de mise à jour, Three.js renvoie **tout le tampon**, pas seulement la partie modifiée :
```js
if ( updateRanges.length === 0 ) {
    // Not using update ranges
    gl.bufferSubData( bufferType, 0, array );
}
```
[source] [`WebGLAttributes.js`](https://github.com/mrdoob/three.js/blob/r185/src/renderers/webgl/WebGLAttributes.js)
→ Sans conséquence pour 23 Ko de zombies. **Mais rédhibitoire si l'on flageait `needsUpdate` sur un `InstancedMesh` de ville** : ce serait plus d'un mégaoctet renvoyé à chaque image, pour rien. **La géométrie statique ne doit jamais porter `needsUpdate`.**

### 5.3 Le verdict

| | `SkinnedMesh` | **6 `InstancedMesh` de boîtes** |
|---|---:|---:|
| Draw calls pour 60 zombies | **60** (+60 en passe d'ombre) | **6** (+6) |
| Draw calls pour 200 zombies | 200 | **6** |
| Coût par sommet | +32 o, +16 `texelFetch` | 0 |
| Instanciable | **non** (uniform `boneTexture`) | oui, par construction |
| Poids d'outillage | rig, export glTF, `AnimationMixer` | quelques `Matrix4` par image |

> **Décision : boîtes articulées, transformées à la main, une `InstancedMesh` par partie du corps.**
> Ce n'est pas un choix d'économie : c'est le seul des deux qui rende le nombre de zombies **indépendant du nombre de draw calls**. Or le ticket #5 a décidé que la difficulté monterait par le **nombre**. Le squelette rendrait la courbe de difficulté directement proportionnelle au coût de rendu ; les boîtes articulées la rendent gratuite.

Et c'est aussi le bon choix artistique : un personnage voxel de 6 boîtes n'a de toute façon aucun sommet à pondérer entre deux os — chaque sommet appartient à exactement une boîte. Le skinning résoudrait un problème que nous n'avons pas.

**Conséquence pour le ticket #7 (les zombies)** : l'animation est une fonction `(temps, vitesse) → 6 matrices locales`. Marche, attaque, mort : trois fonctions d'une dizaine de lignes. Aucun fichier d'animation, aucun outil externe, et le tout est du TypeScript pur, testable hors navigateur — ce qui rejoint la frontière posée au ticket #2 entre logique de jeu et rendu.

### 5.4 Pourquoi pas `BatchedMesh`

`BatchedMesh` (non marqué expérimental en r185) permettrait des géométries différentes par instance et fait du frustum culling **par objet** (`perObjectFrustumCulled = true` par défaut) — ce que `InstancedMesh` ne sait pas faire. [source] [`BatchedMesh.js`](https://github.com/mrdoob/three.js/blob/r185/src/objects/BatchedMesh.js)

Mais son chemin rapide dépend d'une extension, et son repli est une boucle de draw calls en JavaScript, avec en prime un envoi d'uniform par sous-géométrie :

```js
if ( ! extensions.get( 'WEBGL_multi_draw' ) ) {
    for ( let i = 0; i < drawCount; i ++ ) {
        uniforms.setValue( _gl, '_gl_DrawID', i );
        renderer.render( starts[ i ] / bytesPerElement, counts[ i ] );
    }
} else {
    renderer.renderMultiDraw( object._multiDrawStarts, object._multiDrawCounts, object._multiDrawCount );
}
```
[source] [`WebGLRenderer.js`](https://github.com/mrdoob/three.js/blob/r185/src/renderers/WebGLRenderer.js)

**Bonne nouvelle : l'extension est bien là.** Le ticket #2 avait laissé ce point ouvert ; il est tranché. Dans le source de WebKit, `WEBGL_multi_draw` est exposée **sans le garde-fou `enableDraftExtensions`** que portent ses voisines :

```cpp
ENABLE_IF_REQUESTED(WebGLMultiDraw, m_webglMultiDraw, "WEBGL_multi_draw"_s,
                    WebGLMultiDraw::supported(*context));
ENABLE_IF_REQUESTED(WebGLMultiDrawInstancedBaseVertexBaseInstance, …,
                    …::supported(*context) && enableDraftExtensions);
```
[source] [WebKit — `WebGL2RenderingContext.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/canvas/WebGL2RenderingContext.cpp)

Sa seule condition est que le pilote l'expose : `return context.supportsExtension(GCGLExtension::ANGLE_multi_draw) && context.supportsExtension(GCGLExtension::ANGLE_instanced_arrays);` [source] [WebKit — `WebGLMultiDraw.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/canvas/WebGLMultiDraw.cpp). Et `WebGLDraftExtensionsEnabled` vaut `false` par défaut [source] [`UnifiedWebPreferences.yaml`](https://github.com/WebKit/WebKit/blob/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml) — ce qui confirme que `WEBGL_multi_draw` n'en dépend pas. Les données de compatibilité MDN concordent : `safari: "15"`, `safari_ios: "mirror"`, sans note de restriction. [source] [mdn/browser-compat-data — `api/WEBGL_multi_draw.json`](https://github.com/mdn/browser-compat-data/blob/main/api/WEBGL_multi_draw.json)

→ **`BatchedMesh` prendrait donc bien son chemin rapide sur iPadOS.** On ne l'utilise quand même pas pour les zombies, pour une raison simple : nos six parties de corps ont **la même géométrie répétée N fois**, ce qui est précisément le cas d'usage de l'instanciation, où un vrai draw call unique bat un multi-draw émulé en boucle par ANGLE (§3.3). `BatchedMesh` reste le bon outil si la ville devenait destructible **par bloc** — chaque bloc y aurait alors sa géométrie propre et son culling propre. **À garder en réserve, pas en v1.** Vérifier tout de même `renderer.extensions.has('WEBGL_multi_draw')` au démarrage et journaliser le résultat (§14).

---

## 6. Canons, projectiles, particules

### 6.1 Canons

Le décor n'impose aucune limite : les canons se posent sur tous les toits **et au sol**. Le plafond vient donc d'ici.

Côté rendu, il n'y en a pas : un canon = 2 boîtes (socle, tube), donc **2 `InstancedMesh` = 2 draw calls, quel que soit le nombre de canons**. [calcul] 24 canons = 48 boîtes = 576 triangles.

Le coût réel est ailleurs, et il est en CPU : chaque canon choisit une cible parmi les zombies vivants. [calcul] En naïf, 24 canons × 60 zombies = **1 440 tests de distance par image**, soit 86 400 par seconde. C'est faisable en JavaScript, mais c'est gaspillé : une cible ne change pas d'une image à l'autre.

→ **Règle** : le ciblage tourne sur un **cycle de 4 images** (chaque canon réévalue sa cible une fois toutes les 4 images, les canons étant répartis sur les 4 phases). Coût divisé par 4, latence de ciblage de 66 ms — imperceptible.
→ **Plafond retenu : 24 canons simultanés.** Ce n'est pas le plafond du GPU (qui serait bien au-delà) mais celui de la lisibilité et du CPU. **Les tickets [#8](https://github.com/ben-barbier/apocalypse-zombie/issues/8) et [#11](https://github.com/ben-barbier/apocalypse-zombie/issues/11) peuvent descendre sous 24 pour des raisons de jeu ou d'économie ; ils ne doivent pas monter au-dessus sans remesurer.**

### 6.2 Projectiles

[calcul] Hypothèse : 24 canons, une cadence de un tir toutes les 1,5 s, un temps de vol de 1,5 s → environ **24 projectiles en vol** en régime établi. Une marge ×4 donne **96**.

→ **Pool fixe de 96 projectiles**, un seul `InstancedMesh`, `.count` piloté à chaque image. **1 draw call.**

### 6.3 Particules

Les zombies se désintègrent en petits cubes ; les impacts de boulets en projettent aussi.

[calcul] Hypothèses : 12 cubes par mort de zombie, durée de vie 1,2 s ; 8 cubes par impact, durée 0,8 s ; rythme de pointe de 10 morts/s et 16 impacts/s en fin de partie.
→ mort : 10 × 12 × 1,2 = 144 cubes vivants ; impacts : 16 × 8 × 0,8 = 102 → **≈ 250 particules vivantes en pointe**, avec des pics ponctuels au-dessus.

→ **Pool fixe de 512 particules**, **1 draw call**, **recyclage du plus ancien** quand le pool est plein (jamais d'allocation, jamais de refus d'effet).

Deux choix d'implémentation, tous deux à 1 draw call : `Points` (le plus léger, mais des carrés alignés à l'écran, qui ne tournent pas) ou `InstancedMesh` de petits cubes (de vrais cubes qui culbutent, 12 triangles chacun, soit 6 144 triangles pour 512 — négligeable au vu du §2). **On retient l'`InstancedMesh` de cubes** : la culbute est ce qui rend la désintégration satisfaisante, et le budget le permet largement.

### 6.4 La règle qui les gouverne tous : ne jamais allouer en cours de partie

Trois sources primaires convergent :

- **Three.js renvoie tout le tampon** quand aucune plage de mise à jour n'est déclarée [source] `WebGLAttributes.js` (§5.2).
- **La réallocation de tampons par image a déjà cassé WebGL sur Safari.** Sur une démo de particules, Kimmo Kinnunen (WebKit) diagnostiquait : « *The test case appears to ramp up the amount of vertices drawn with `drawArrays`. **This causes the conversion attribute buffers to be re-allocated for each draw.*** » [source] [bugs.webkit.org #230749](https://bugs.webkit.org/show_bug.cgi?id=230749)
- **PlayCanvas documente la conséquence côté JavaScript** : « *preallocate objects in a script's initialize function and reuse them in the update function. **It also leads to Garbage Collection which can cause periodical freezes.*** » [source] [PlayCanvas — General Guidelines](https://developer.playcanvas.com/user-manual/optimization/guidelines/)

→ **Règle d'architecture, non négociable** : zombies, projectiles et particules vivent dans des **pools de taille fixe**, alloués au chargement, pilotés par `.count`. Aucun `new` dans la boucle de jeu. Un enfant de 8 ans ne comprendra pas un micro-gel d'un dixième de seconde au moment où il frappe.

---

## 7. Ombres

`WebGLShadowMap` parcourt la scène **une fois de plus par lumière projetant une ombre**, et émet un `renderer.renderBufferDirect` par objet caster. Pour une lumière ponctuelle, c'est six fois :

```js
// For cube render targets (PointLights), render all 6 faces. Otherwise, render once.
const faceCount = shadow.map.isWebGLCubeRenderTarget ? 6 : 1;
```
[source] [`WebGLShadowMap.js`](https://github.com/mrdoob/three.js/blob/r185/src/renderers/webgl/WebGLShadowMap.js)

Ces draw calls sont bien comptés dans `renderer.info`, car la remise à zéro a lieu **avant** la passe d'ombre dans `render()` : `this.info.render.frame ++; if ( this.info.autoReset === true ) this.info.reset(); … shadowMap.render( shadowsArray, scene, camera );` [source] [`WebGLRenderer.js`](https://github.com/mrdoob/three.js/blob/r185/src/renderers/WebGLRenderer.js)

**Trois règles :**

1. **Aucune `PointLight` projetant une ombre. Jamais.** Six passes de scène pour une lampe. Les torches et les explosions s'éclairent par la couleur du matériau ou par une `PointLight` **sans** ombre.
2. **Une seule `DirectionalLight` avec ombre**, le soleil. `mapSize` par défaut vaut `(512, 512)` [source] [`LightShadow.js`](https://github.com/mrdoob/three.js/blob/r185/src/lights/LightShadow.js) ; monter à 1024 si nécessaire, jamais au-delà sans mesure.
3. **`castShadow` uniquement sur ce qui bouge** — personnages, canons, projectiles. La ville *reçoit* l'ombre, elle ne la projette pas en temps réel. Son ombre propre se peint dans les couleurs de sommets au moment de la génération du chunk (occlusion ambiante cuite), ce qui coûte zéro par image.

Le levier de repli est documenté : `LightShadow.autoUpdate` — « *Enables automatic updates of the light's shadow. If you do not require dynamic lighting / shadows, you may set this to `false`.* » [source] même fichier. On peut alors ne recalculer la carte d'ombre que sur événement.

**Repli si la mesure l'exige** : supprimer complètement la carte d'ombre et poser sous chaque personnage un quad texturé sombre, dans une septième `InstancedMesh`. Coût : **1 draw call pour toutes les ombres du jeu**, au lieu de 15.

---

## 8. Résolution de rendu : le vrai levier sur A13

C'est ici que se joue l'écart avec une puce M (§1.1) : même nombre de pixels, 2,5 fois moins de GPU.

Three.js dimensionne le tampon ainsi : `canvas.width = Math.floor( width * _pixelRatio );` [source] [`WebGLRenderer.js`](https://github.com/mrdoob/three.js/blob/r185/src/renderers/WebGLRenderer.js). Sur un iPad, `devicePixelRatio` vaut 2.

[calcul] Sur un iPad 9 (2160 × 1620 physiques, soit une fenêtre CSS de 1080 × 810) :

| `setPixelRatio` | Tampon | Fragments par image | Rapport |
|---|---|---:|---:|
| 2 (natif) | 2160 × 1620 | **3 499 200** | 4× |
| 1,5 | 1620 × 1215 | 1 968 300 | 2,25× |
| **1** | **1080 × 810** | **874 800** | **1×** |

→ **Décision : `renderer.setPixelRatio( 1 )` par défaut sur iPadOS.** On divise par quatre la charge de remplissage, qui est la seule ressource où l'A13 est structurellement en retrait.

Et ce n'est pas un compromis subi : le jeu est en **pixel art 16 × 16 avec filtrage `nearest`**. Rendre à résolution réduite puis laisser le navigateur agrandir est **cohérent avec la direction artistique** — c'est même la façon dont les jeux du genre obtiennent leur netteté de pixel. À arbitrer avec le ticket [#12](https://github.com/ben-barbier/apocalypse-zombie/issues/12) : si l'agrandissement du navigateur adoucit trop les bords, `image-rendering: pixelated` sur le canvas rétablit le rendu net.

`antialias` vaut `false` par défaut dans `WebGLRenderer` [source] même fichier — **le laisser à `false`** : sur du pixel art, il n'apporte rien et coûte de la bande passante.

---

## 9. Pièges propres à Safari iPadOS

### 9.1 Perte de contexte WebGL : les faits, et non les rumeurs

Le ticket #2 signalait la perte de contexte comme un risque. Il faut préciser, parce que la précision change la conduite à tenir.

- **La régression « perte de contexte au retour d'arrière-plan » était un bug, et il est corrigé.** Le bug [#261331](https://bugs.webkit.org/show_bug.cgi?id=261331) (« *'WebGL: context lost.' error when backgrounding Safari* », déclencheurs rapportés : mise en arrière-plan, verrouillage de l'appareil, entrées/sorties répétées d'une page WebGL) est un doublon de [#261313](https://bugs.webkit.org/show_bug.cgi?id=261313), « *[ANGLE] Don't lose Metal-backed contexts for non-fatal errors* », **RESOLVED FIXED**. Cause : « *Any errors from Metal command buffer submission are treated as causing a lost device. Not all Metal errors are fatal though.* » Commentaire 8 : « *This is fixed in iOS 17.1.* » [source]
- **Un second bug, lui, touchait spécifiquement notre plancher matériel.** Bug [#286297](https://bugs.webkit.org/show_bug.cgi?id=286297), « *'WebGL: context lost.' on Unity WebAssembly/WebGL 2 content* », **RESOLVED FIXED en iOS 18.5 / macOS 15.5** (mai 2025). Déclencheur : des *varyings* déclarés `flat` avec des vecteurs d'entiers (`flat out highp uvec2 …`) sur le backend Metal ; retirer `flat` supprimait le problème. Appareils touchés : **A12 à A14 exclusivement — le bug ne se reproduisait pas sur les iPad M1/M2/M4.** [source]

→ **Deux décisions.**
  1. **Prérequis à ajouter au cahier : iPadOS 18.5 minimum recommandé** (au-dessus des 16.4/18.4 du ticket #3), précisément parce que le second bug frappait les A13/A14 et pas les puces M.
  2. **Ne pas utiliser de qualificateur `flat` sur des varyings entiers** dans un shader personnalisé. Cela ne concerne pas les matériaux intégrés de Three.js, mais concernerait un `ShaderMaterial` écrit pour un tableau de textures (§4.3) — une raison de plus de ne pas ouvrir ce chantier en v1.
  3. Trois.js écoute bien `webglcontextlost`/`webglcontextrestored` en interne mais **n'expose aucun événement applicatif** (constat du ticket #2). Il faut poser soi-même l'écouteur sur `renderer.domElement` et afficher un écran « on reprend » — ce qui rejoint l'exigence d'écran de reprise déjà posée au ticket #3.

### 9.2 Bridage thermique et fréquence d'image

**Aucune source primaire n'a pu être trouvée** décrivant le comportement thermique soutenu d'un iPad, ni exposant un signal thermique au contenu web. Il n'existe pas d'équivalent web de `ProcessInfo.thermalState`.

→ **Le bridage thermique ne se détecte donc que par ses effets.** C'est l'unique raison pour laquelle le jeu a besoin d'une **échelle de dégradation** (§11) pilotée par la mesure de l'écart entre `requestAnimationFrame` : c'est le seul capteur dont on dispose. Durée d'une partie : 12 à 14 minutes (ticket #5) — largement de quoi chauffer. **[à mesurer]**

### 9.3 Rappel des contraintes déjà établies qui pèsent sur ce budget

Issues du ticket #3, elles ne sont pas rediscutées ici mais elles bornent le budget :

- **L'orientation n'est pas verrouillable et la fenêtre peut prendre n'importe quelle proportion** (Split View, Stage Manager). Le budget de fragments du §8 doit donc être recalculé à chaque `resize`, jamais figé au chargement.
- **`requestAnimationFrame` s'arrête en arrière-plan** ; il faut borner le pas de temps au retour.
- **L'onglet peut être purgé sans préavis** et rien ne permet de le détecter. Sauvegarde continue.

---

## 10. Échelle de dégradation

Puisqu'on ne dispose ni de signal thermique ni de chronomètre GPU (§1.3, §9.2), la seule boucle de contrôle possible est : mesurer l'écart entre images, et retirer du travail par paliers.

**Capteur** : médiane glissante de l'écart entre deux `requestAnimationFrame` sur 2 secondes. La médiane, pas la moyenne, pour ignorer les pics isolés.

**Déclenchement** : médiane > 20 ms (soit moins de 50 images/s) pendant 2 secondes consécutives → descendre d'un palier. Médiane < 15 ms pendant 10 secondes → remonter d'un palier (avec hystérésis, pour ne pas osciller).

| Palier | Action | Gain attendu |
|---|---|---|
| 0 | Régime nominal : `pixelRatio` 1, ombre directionnelle, 512 particules | — |
| 1 | `pixelRatio` → 0,85 | ~30 % de fragments |
| 2 | Carte d'ombre → ombres en tache (1 draw call) | −15 draw calls, −1 passe de scène |
| 3 | Pool de particules 512 → 128 | fragments et CPU |
| 4 | Plafond de zombies 60 → 40 | CPU d'IA |
| 5 | Verrouillage à 30 images/s (rendu une image sur deux) | double tout le budget |

→ **Le palier 5 est un filet, pas un objectif.** On vise 60 images/s ; un tower defense reste parfaitement jouable à 30, et un enfant de 8 ans ne verra pas la différence sur des cubes — mais il verra les à-coups d'une fréquence qui oscille. **Mieux vaut 30 stables que 45 irréguliers.**

---

## 11. A13 contre puce M : ce qui change, et ce qui ne change pas

Le ticket demande de dire explicitement où l'écart modifierait une recommandation. Voici la réponse, poste par poste.

| Poste | Change avec une puce M ? |
|---|---|
| **Budget par image (16,67 ms)** | **Non.** WebKit plafonne la page à ~60 Hz par défaut sur tous les appareils, ProMotion compris (§1.2). |
| **Draw calls, triangles, mémoire** | **Non, dans les faits.** L'architecture est à ~51 draw calls et ~30 000 triangles ; c'est confortable des deux côtés. |
| **Résolution de rendu (§8)** | **Oui — c'est le seul poste qui bascule.** Même nombre de pixels, GPU 2,5× (4 cœurs contre 10). Sur une puce M, `pixelRatio` 2 est probablement tenable ; sur A13, non. |
| **Ombres temps réel (§7)** | **Peut-être.** Sur une puce M, la carte d'ombre directionnelle passerait sans doute sans discussion ; sur A13, elle est le premier candidat au retrait (palier 2). |
| **Perte de contexte (§9.1)** | **Oui, et c'est documenté.** Le bug [#286297](https://bugs.webkit.org/show_bug.cgi?id=286297) touchait A12–A14 et **pas** les iPad M1/M2/M4. |
| **Plafond mémoire de l'onglet (§1.4)** | **Oui**, il suit la RAM — mais nous sommes à quelques mégaoctets, donc sans effet pratique. |

> **Conclusion sur ce point : il n'est pas nécessaire de connaître le modèle exact pour figer le budget.** Toutes les décisions structurantes — instanciation par partie du corps, ville fusionnée par chunks, pools de taille fixe, un seul contexte WebGL — sont **identiques** sur A13 et sur M2. Seuls deux réglages sont à ajuster, et l'échelle de dégradation du §10 les ajuste **automatiquement à l'exécution** : la résolution de rendu et les ombres.
> Il reste utile de relever le modèle, mais **uniquement** pour calibrer les paliers de départ (un A13 démarre au palier 0 avec `pixelRatio` 1 ; un iPad M démarrerait à `pixelRatio` 1,5 ou 2). **Ce n'est plus un fait bloquant.**

---

## 12. Budget retenu

Chaque ligne porte son degré de confiance. **Haute** = découle d'une source primaire ou d'un calcul direct sur une source primaire. **Moyenne** = calcul reposant sur des hypothèses de conception raisonnables mais non encore validées. **À valider** = ne sera confirmé que sur l'appareil.

### 12.1 Les cinq chiffres à traiter comme des contraintes dures

| Contrainte | Valeur | Base | Confiance |
|---|---:|---|---|
| **Zombies vivants simultanés** | **60 max**, pic de conception à **35** | Coût de rendu constant (6 draw calls) ; le plafond vient du CPU d'IA et de la lisibilité | **haute** côté rendu, **à valider** côté IA |
| **Taille de la ville** | **64 × 64 blocs**, hauteur ≤ 12, **≤ 25 000 faces visibles**, **16 chunks de 16 × 16** | §2.1, §4.2 | **haute** |
| **Canons simultanés** | **24 max** | 2 draw calls ; plafond fixé par le ciblage CPU et la lisibilité | **moyenne** |
| **Projectiles en vol** | **96** (pool fixe, 1 draw call) | §6.2 | **moyenne** |
| **Draw calls par image** | **≤ 80 nominal · alerte à 120 · plafond dur 150** | Architecture à ~51 (§3.2) ; borne d'éditeur « 100-200 pour le bas de gamme mobile » (§3.1) | **moyenne** |

### 12.2 Budget de rendu détaillé, à 60 images/s

| Ressource | Budget | Prévision de l'architecture |
|---|---:|---:|
| Temps par image | **16,67 ms** | — |
| Draw calls | **≤ 80** | ~51 |
| Triangles par image (ombre comprise) | **≤ 150 000** | ~36 500 |
| Fragments par image | **≤ 1 000 000** (`pixelRatio` 1) | 874 800 (iPad 9) · 967 600 (iPad 10) |
| Géométrie en mémoire GPU | **≤ 16 Mo** | ~2 Mo |
| Textures | **≤ 4 Mo** (atlas 256 × 256 + carte d'ombre 1024²) | ~2 Mo |
| Contextes WebGL | **exactement 1** | 1 |
| Allocations dans la boucle de jeu | **zéro** | zéro |

**À 30 images/s**, le temps par image double à 33,3 ms. Le budget de draw calls, qui est essentiellement un coût CPU et IPC, peut raisonnablement doubler à **~160** ; celui des fragments aussi. **[à mesurer]** — c'est une inférence sur la nature du coût, pas une mesure. On ne conçoit pas pour 30 : on y tombe par l'échelle du §10.

### 12.3 Ce que ce budget impose aux tickets de conception

1. **Ticket [#7](https://github.com/ben-barbier/apocalypse-zombie/issues/7) — zombies.** Animation par **6 boîtes articulées transformées à la main**, pas de squelette, pas de fichier d'animation. Les effectifs de vague doivent respecter un plafond de **60 vivants simultanés** : le générateur de vague distille les apparitions au lieu de tout lâcher d'un coup. Les 6 boîtes doivent être **les mêmes 6 rôles pour tous les types de zombies** — la variété passe par la texture, l'échelle et la couleur d'instance, jamais par une septième boîte, sinon on ajoute un draw call par type.
2. **Ticket [#6](https://github.com/ben-barbier/apocalypse-zombie/issues/6) — ville.** 64 × 64 est **confortable** : la performance ne contraint pas ce ticket, c'est le temps de traversée qui le contraint. La ville est **découpée en 16 chunks de 16 × 16** et **figée** : pas de destruction par bloc en v1 (elle imposerait de régénérer un chunk entier, ou de passer à `BatchedMesh`).
3. **Ticket [#8](https://github.com/ben-barbier/apocalypse-zombie/issues/8) — canons.** Plafond de **24 canons** et **96 projectiles en vol**. Le ciblage tourne sur un cycle de 4 images. Les niveaux de canon se distinguent par la **texture et l'échelle d'instance**, pas par une géométrie propre à chaque niveau.
4. **Ticket [#12](https://github.com/ben-barbier/apocalypse-zombie/issues/12) — direction artistique.** Atlas unique de tuiles 16 × 16 dans une texture de 256 × 256, `NearestFilter` en min **et** en mag, **`generateMipmaps = false` explicite**. Le jeu rend à `pixelRatio` 1 : la planche de textures doit être jugée à cette résolution, pas en natif.
5. **Ticket [#13](https://github.com/ben-barbier/apocalypse-zombie/issues/13) — architecture.** **Pools de taille fixe** pour zombies, projectiles et particules, alloués au chargement, pilotés par `.count`. Zéro allocation dans la boucle. **Un seul contexte WebGL** pour toute la partie. L'échelle de dégradation du §10 est un composant à part entière, pas une optimisation ultérieure.

---

## 13. À mesurer sur l'appareil

Rien de ce qui suit n'a de source primaire. Ces points doivent être mesurés sur l'iPad réel avant que le budget du §12 soit considéré comme validé.

### 13.1 Le relevé de capacités, à faire en premier

Trente lignes à exécuter au premier lancement et à afficher à l'écran (impossible de brancher un profileur sur un iPad familial) :

```js
const gl = renderer.getContext();
const releve = {
  renderer:     gl.getParameter( gl.RENDERER ),   // via WEBGL_debug_renderer_info si dispo
  maxTexture:   gl.getParameter( gl.MAX_TEXTURE_SIZE ),          // attendu : 16384
  maxLayers:    gl.getParameter( gl.MAX_ARRAY_TEXTURE_LAYERS ),  // attendu : 2048
  maxUnits:     gl.getParameter( gl.MAX_TEXTURE_IMAGE_UNITS ),
  pointSize:    gl.getParameter( gl.ALIASED_POINT_SIZE_RANGE ),
  multiDraw:    renderer.extensions.has( 'WEBGL_multi_draw' ),   // attendu : true (§5.4)
  timerQuery:   renderer.extensions.has( 'EXT_disjoint_timer_query_webgl2' ), // attendu : false
  dpr:          window.devicePixelRatio,
  ecran:        [ screen.width, screen.height ],
};
```

Puis, après chaque `render()` : `renderer.info.render.calls`, `.triangles`, `.points`, et `renderer.info.memory.geometries` / `.textures`. Les champs sont exactement ceux-là. [source] [`WebGLInfo.js`](https://github.com/mrdoob/three.js/blob/r185/src/renderers/webgl/WebGLInfo.js) — et la remise à zéro ayant lieu **avant** la passe d'ombre, **les draw calls d'ombre sont bien comptés** (§7).

### 13.2 Les bancs d'essai officiels, à ouvrir sur l'iPad cible

Ce sont des artefacts de première partie, avec curseurs et comparaisons intégrées. Ils donnent le vrai plafond de l'appareil sans écrire une ligne de code :

- **<https://threejs.org/examples/#webgl_instancing_performance>** — bascule `INSTANCED` / `MERGED` / `NAIVE` avec un curseur de quantité. C'est exactement l'arbitrage du §4.1. Balayer jusqu'à décrochage sous 60 images/s, dans les trois modes.
- **<https://threejs.org/examples/#webgl_mesh_batch>** — bascule `BATCHED` / `NAIVE`, jusqu'à 20 000 géométries, avec interrupteurs `perObjectFrustumCulled` et `sortObjects`. Donne le plafond de draw calls réel de l'appareil.

**Consigner pour chaque relevé** : modèle d'iPad, version d'iPadOS, mode (onglet Safari ou web app installée), niveau de batterie, mode économie d'énergie actif ou non.

### 13.3 La liste des inconnues

1. **Le nombre de draw calls réellement tenable à 60 puis à 30 images/s sur un A13.** Le seul chiffre du document (100–200) vient de la documentation PlayCanvas pour « le bas de gamme mobile », sans mesure sur A13. **C'est l'inconnue principale.** Protocole : §13.2.
2. **Le plafond mémoire d'un onglet sur un iPad 9 ou 10.** Apple ne publie ni la RAM de ces modèles ni la limite du processus WebContent. Le seul chiffre sourcé est celui de Ben Nham pour un appareil de 8 Go (« 4GB+ »), inapplicable ici. Protocole : faire croître un `Uint8Array` jusqu'à l'échec, hors du jeu.
3. **La courbe de bridage thermique.** Aucune source, aucun signal web. Protocole : jouer 15 minutes d'affilée et journaliser la médiane de l'écart entre images, minute par minute. C'est ce qui dira si le palier 5 (30 images/s) sera atteint en pratique.
4. **Le coût CPU réel de l'IA de 60 zombies.** Le plafond de 60 est posé par prudence, pas par mesure. Protocole : mesurer le temps de la phase de mise à jour, séparément du rendu, en faisant croître la population.
5. **La valeur exacte de `MAX_TEXTURE_SIZE` exposée par ANGLE**, qui peut être inférieure au 16 384 du matériel. Sans conséquence attendue (notre atlas fait 256 × 256), mais à relever.
6. **Le scintillement en minification** sans mipmaps (§4.4), sur les toits vus de loin et le sol à l'horizon.
7. **La qualité visuelle à `pixelRatio` 1** et le comportement de l'agrandissement du navigateur, avec et sans `image-rendering: pixelated` (§8).
8. **La fréquence réelle des pertes de contexte WebGL** sur l'appareil, en usage normal (mises en veille, bascules d'application, notifications), sous iPadOS ≥ 18.5. Les deux bugs identifiés sont corrigés (§9.1), mais l'absence de bug connu n'est pas une preuve d'absence.
9. **Le comportement en mode économie d'énergie.** Aucun réglage WebKit trouvé qui plafonne explicitement `requestAnimationFrame` en batterie faible ; l'hypothèse d'un plafonnement à 30 images/s n'a **pas** pu être confirmée en source primaire. À vérifier, batterie basse et mode économie activé.
10. **`safe-area-inset` et proportions de fenêtre** (Split View, Stage Manager) et leur effet sur le budget de fragments, qui doit être recalculé à chaque `resize` (§9.3).

---

*Recherche menée le 15 août 2026 contre les sources primaires listées.*
*Code source consulté : Three.js r185 (`src/`, `examples/`), WebKit `main`, ANGLE `main`.*
*Spécifications : Khronos WEBGL_multi_draw (rév. 2023-09-08).*
*Documentation constructeur : Apple Metal Feature Set Tables, fiches techniques iPad 9ᵉ / 10ᵉ génération et iPad Pro 11″ 4ᵉ génération.*
*Bugs WebKit consultés : 195325, 230749, 261313, 261331, 268816, 272165, 286297.*
