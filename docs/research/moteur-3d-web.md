# Choisir le moteur 3D web

> Recherche pour le ticket [#2](https://github.com/ben-barbier/apocalypse-zombie/issues/2). Vérifié le **15 août 2026**.
> Options comparées : **Three.js**, **Babylon.js**, **PlayCanvas**, **export web de Godot 4**.

## Méthode

Tous les faits ci-dessous viennent de sources primaires : documentation officielle, dépôt source, notes de version, registre npm, bugtracker WebKit, spécifications. Les billets de blog tiers, Stack Overflow et les comparatifs de seconde main ont été écartés.

Trois catégories de faits sont distinguées, et l'étiquette est portée à chaque fois :

- **[source]** — affirmation d'une source primaire, avec URL.
- **[mesuré]** — mesure faite pour ce ticket sur la machine, avec la méthode reproductible. Ce n'est **pas** un chiffre officiel.
- **[incertain]** — n'a pas pu être vérifié auprès d'une source primaire. Listé en fin de document.

---

## 1. Ce que la plateforme cible impose

Ces faits ne dépendent d'aucun moteur : ils contraignent les quatre options de la même façon.

| Fait | Source |
|---|---|
| WebGL 2 est disponible sur iPadOS depuis Safari 15 : « WebKit now supports WebGL2. In addition, the WebGL implementation now runs on top of Metal for better performance. » | [webkit.org/blog/11989](https://webkit.org/blog/11989/new-webkit-features-in-safari-15/) |
| L'iPad 9e génération (A13, 2021) est encore compatible iPadOS 26 — le plancher matériel visé tourne donc sur un WebKit courant. | [support.apple.com — iPad models compatible with iPadOS 26](https://support.apple.com/guide/ipad/ipad-models-compatible-with-ipados-26-ipad213a25b2/ipados) |
| Gamepad API : Safari depuis la version **10.1** ; `safari_ios` est marqué `mirror` (même support). `vibrationActuator` est en revanche `false` sur iOS — **pas de retour haptique manette côté iPad**. | [mdn/browser-compat-data — api/Gamepad.json](https://github.com/mdn/browser-compat-data/blob/main/api/Gamepad.json) |
| Pointer Events : Safari depuis la version **13**, iOS en `mirror`. Un chemin d'entrée unifié pointeur (doigt + stylet) est donc disponible sur iPad. | [mdn/browser-compat-data — api/PointerEvent.json](https://github.com/mdn/browser-compat-data/blob/main/api/PointerEvent.json) |
| `SharedArrayBuffer` n'est réactivé que sous isolation d'origine : COOP `same-origin` + COEP `require-corp`, depuis Safari 15.2. | [webkit.org/blog/12140](https://webkit.org/blog/12140/new-webkit-features-in-safari-15-2/) |
| La perte de contexte WebGL sur iOS/iPadOS est une classe de bugs réelle et documentée chez WebKit, pas une hypothèse : perte au retour d'arrière-plan, au verrouillage de l'appareil. Marqué doublon de « [ANGLE] Don't lose Metal-backed contexts for non-fatal errors ». Touche Babylon.js, Three.js, Cocos et le WebGL brut indifféremment. | [bugs.webkit.org #261331](https://bugs.webkit.org/show_bug.cgi?id=261331) |
| Mémoire WebAssembly **partagée** : `WebAssembly.Memory({shared:true})` échoue en « Out Of Memory » sur iOS 16.4+ alors que le même appel passe avec `shared:false`. Bug **encore ouvert**, aucun commentaire d'ingénieur WebKit. | [bugs.webkit.org #255103](https://bugs.webkit.org/show_bug.cgi?id=255103) |
| Un pic mémoire à la **compilation WASM** a fait planter des jeux WebGL volumineux sur iOS 18.4 (rapporté sur des builds Unity). Corrigé en avril 2025. | [bugs.webkit.org #291677](https://bugs.webkit.org/show_bug.cgi?id=291677) → [#291699 RESOLVED FIXED](https://bugs.webkit.org/show_bug.cgi?id=291699) |

**Ce qu'il faut en retenir.** Le socle technique (WebGL2, manette, pointeur) est acquis sur la cible. Les deux vraies zones de risque sont **le poids de ce qu'on télécharge et compile au démarrage** et **la perte de contexte WebGL**. Ces deux axes discriminent fortement les quatre options.

---

## 2. Mesures faites pour ce ticket

Aucun des quatre projets ne publie de chiffre officiel de poids gzippé pour une scène minimale. Les chiffres ci-dessous ont donc été **mesurés**, avec une méthode identique pour les trois moteurs JavaScript, afin d'être comparables entre eux.

### Méthode

Une scène minimale mais **représentative du jeu** a été écrite pour chaque moteur : rendu WebGL, caméra perspective, lumière directionnelle + ambiante, une texture en filtrage `nearest`, **20 000 cubes instanciés** (la ville) et **10 pantins de 6 boîtes articulées** (les zombies), plus une boucle de rendu. Chaque scène est ensuite empaquetée avec `esbuild --bundle --minify --format=esm --target=es2020`, tree-shaking actif, puis compressée avec `gzip -9`.

Versions utilisées : `three@0.185.1`, `@babylonjs/core@9.21.2`, `playcanvas@2.21.4`, `Godot 4.7.1-stable`.

### Résultat — poids du premier chargement

| Moteur | Bundle minifié | **gzip** | Rapport vs Three.js |
|---|---:|---:|---:|
| **Three.js** | 517 Kio | **130 Kio** | 1× |
| **Babylon.js** | 1 437 Kio | **332 Kio** | 2,6× |
| **PlayCanvas** | 1 913 Kio | **487 Kio** | 3,7× |
| **Godot 4.7.1** (`web_nothreads_release`) | ~39,5 Mio de `.wasm` | **~10,2 Mio** (deflate) | **~80×** |

[mesuré] pour les trois moteurs JS.

Pour Godot, le chiffre vient de l'**artefact officiel de la release 4.7.1** : la lecture du répertoire central de `Godot_v4.7.1-stable_export_templates.tpz` (1 221 Mio) par requêtes HTTP Range donne `templates/web_nothreads_release.zip` = **9,7 Mio** et `templates/web_release.zip` = **9,8 Mio**, avant tout contenu de jeu. [source] [github.com/godotengine/godot/releases/…/Godot_v4.7.1-stable_export_templates.tpz](https://github.com/godotengine/godot/releases/download/4.7.1-stable/Godot_v4.7.1-stable_export_templates.tpz)

Ce chiffre est cohérent avec la seule déclaration officielle de Godot sur le sujet : « **we need a way to reduce the size of our exports. Currently, the 4.3 release Web build .wasm is around 40 MB uncompressed, and 5 MB compressed with Brotli.** » [source] [godotengine.org — Progress report: Web export in 4.3](https://godotengine.org/article/progress-report-web-export-in-4-3/)

> Note d'honnêteté : les 5 Mio officiels sont un chiffre **Brotli** de la version 4.3. Nos 10,2 Mio sont du **deflate** sur la 4.7.1. Même en retenant l'hypothèse Brotli la plus favorable, Godot reste environ **40 fois** plus lourd que Three.js au premier chargement — et ces méga-octets doivent être **compilés en WebAssembly** par un A13 avant que le premier pixel s'affiche.

### Résultat — logique de jeu testable hors navigateur

Test exécuté sur Node v26.4.0, sans navigateur.

| Moteur | Résultat | Détail |
|---|---|---|
| **Three.js** | ✅ fonctionne sans DOM ni polyfill | `import * as THREE from 'three'` passe tel quel. Vérifié : maths (`Vector3.distanceTo` = 5.196), graphe de scène + `updateMatrixWorld` (position monde calculée correctement à travers deux niveaux de hiérarchie), `Box3.containsPoint`. Seul `new WebGLRenderer()` échoue — `ReferenceError: document is not defined`, ce qui est le comportement attendu. |
| **Babylon.js** | ✅ fonctionne sans DOM | `NullEngine` + `Scene` + `FreeCamera` + `CreateBox` + `scene.render()` : 1 maillage, 24 sommets, position absolue correcte, `getFps()` = 60. Aucun jsdom requis. |
| **PlayCanvas** | ✅ fonctionne, mais **jsdom obligatoire** | `NullGraphicsDevice` + `Application` marche — après avoir répliqué **exactement** le harnais officiel (`test/jsdom.mjs` : jsdom avec `resources:'usable'`, `runScripts:'dangerously'`, plus un shim `Worker`), et **sans appeler `app.start()`** (on pilote `app.update()`/`app.render()` à la main). Mes trois tentatives avec un shim jsdom naïf ont échoué (`requestAnimationFrame is not a function`, puis `Maximum call stack size exceeded`). |
| **Godot 4** | ⚠️ hors navigateur oui, mais hors moteur non | `--headless` existe et est officiel, mais impose de lancer le binaire Godot. Voir §6. |

Sources du harnais PlayCanvas : [test/jsdom.mjs](https://github.com/playcanvas/engine/blob/main/test/jsdom.mjs) · [test/app.mjs](https://github.com/playcanvas/engine/blob/main/test/app.mjs)

### Friction rencontrée au build

[mesuré] Le bundle PlayCanvas **échoue avec esbuild en configuration par défaut** : `Could not resolve "node:worker_threads"`, sur trois fichiers (`draco-worker.js`, `gsplat-sort-worker.js`, `gsplat-unified-sort-worker.js`). Contournement : `--external:node:worker_threads`. Three.js et Babylon.js se sont empaquetés sans aucun réglage.

---

## 3. Three.js

**Version** r185 / npm `0.185.1`, publiée le 2026-07-01, licence MIT, **zéro dépendance**. [source] [registry.npmjs.org/three](https://registry.npmjs.org/three) · [release r185](https://github.com/mrdoob/three.js/releases/tag/r185)

### Rendu voxel

- **Une page du manuel officiel est consacrée exactement à notre cas** : « Voxel (Minecraft Like) Geometry » — construction d'un maillage voxel à faces fusionnées depuis un `Uint8Array`, avec UV d'atlas. [source] [threejs.org/manual/#en/voxel-geometry](https://threejs.org/manual/#en/voxel-geometry)
- `InstancedMesh` — [docs](https://threejs.org/docs/#InstancedMesh). La doc précise que les volumes englobants ne sont **pas** recalculés automatiquement après `setMatrixAt`.
- `BatchedMesh` — [docs](https://threejs.org/docs/#BatchedMesh). **N'est pas marqué expérimental** (vérifié par grep sur la page rendue et sur tout `src/` du paquet publié ; la seule annotation « experimental » du paquet concerne `MeshSSSNodeMaterial`, côté WebGPU). Attention toutefois : le renderer utilise `WEBGL_multi_draw` quand l'extension est présente, sinon il retombe sur **une boucle de draw calls par instance**. [source] [src/renderers/WebGLRenderer.js](https://github.com/mrdoob/three.js/blob/dev/src/renderers/WebGLRenderer.js)
- `BufferGeometryUtils.mergeGeometries` — [docs](https://threejs.org/docs/#module-BufferGeometryUtils).
- Recette pixel-art documentée : `magFilter = minFilter = NearestFilter` + `generateMipmaps = false`. [source] [docs Texture](https://threejs.org/docs/#Texture) · [constante NearestFilter](https://threejs.org/docs/#global.NearestFilter)

### iOS / iPadOS

- La gestion de la perte de contexte **existe dans le source** : `WebGLRenderer` écoute `webglcontextlost` / `webglcontextrestored` / `webglcontextcreationerror`. `onContextLost` fait `event.preventDefault()` et lève un drapeau interne ; `onContextRestore` rappelle `initGLContext()`. [source] [src/renderers/WebGLRenderer.js](https://github.com/mrdoob/three.js/blob/dev/src/renderers/WebGLRenderer.js)
- **Mais aucun événement n'est exposé ni documenté côté application.** Seuls `.forceContextLoss()` / `.forceContextRestore()` figurent dans la doc, et tous deux exigent l'extension `WEBGL_lose_context`. Pour réagir à la perte de contexte, il faut poser soi-même un écouteur sur `renderer.domElement`. [source] [docs WebGLRenderer](https://threejs.org/docs/#WebGLRenderer)
- **Piège de compatibilité à connaître** : depuis r184, les builds publiés utilisent des blocs statiques de classe ES2022, non supportés avant Safari/iOS **16.4**. Position des mainteneurs : « iOS 15 is five years old… There are no plans to downgrade from ECMA 2022 or apply a transpilation step directly in three.js. » Notre plancher (iPad 9e gén. sous iPadOS ≥ 16.4) est au-dessus, donc **sans effet pour nous** — mais cela documente une politique : Three.js ne se retient pas de larguer les vieux Safari. [source] [issue #34134](https://github.com/mrdoob/three.js/issues/34134)
- Posture des mainteneurs sur les bugs iOS : ils renvoient systématiquement vers WebKit. Sur [#30047](https://github.com/mrdoob/three.js/issues/30047) (contexte WebGL2 qui reste en mémoire sur Safari, plantage d'onglet côté iOS) : « It seems this is not a three.js specific issue and fix needs to be done on the browser side. » Sur [#20453](https://github.com/mrdoob/three.js/issues/20453) (plantage iPad après ~363 redimensionnements de canvas), le bug a été reproduit **sans Three.js** du tout. [source]
- `WebGLRenderer` **ne supporte plus WebGL 1 depuis r163** : WebGL2 est le seul chemin. [source] [Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)

### Entrées

**Aucune abstraction manette, aucune abstraction tactile.** `grep -ril gamepad src/` sur le paquet publié → **0 fichier** (les seules occurrences sont du code de profils d'entrée WebXR). L'index officiel des exemples (`files.json`) ne contient **0** exemple `gamepad` et **0** exemple `touch`. Le tactile est traité contrôle par contrôle via Pointer Events : `OrbitControls` utilise `pointerdown`/`pointermove`/`pointerup`, `setPointerCapture`, et pose `domElement.style.touchAction = 'none'`. [source] [OrbitControls.js](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/controls/OrbitControls.js)

### Stabilité de l'API

Pas de semver — le paquet est en `0.x`. Avertissement officiel en tête du guide de migration : « When updating old projects, it's recommended to update the library in increments of 10… deprecation warnings last for 10 releases ». Comptage des entrées de rupture sur les 12 dernières révisions : **82 au total, soit 6,8 par révision** (min 1, max 19) — dont **29 sur 82 (35 %) concernent WebGPU/TSL/node-materials**, que notre build WebGL2 n'utilise pas. [source] [Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)

Cadence : ~1 révision/mois en 2025, ralentie à ~2 mois en 2026 (r185 2026-07-01, r184 2026-04-16, r183 2026-02-20). [source] [releases](https://github.com/mrdoob/three.js/releases)

### Adéquation à un agent qui code

- **Three.js publie une doc destinée aux LLM**, avec une section littéralement intitulée « Instructions for Large Language Models » (utiliser les import maps et non les vieux `<script src=".../r128/three.min.js">` ; quand employer `WebGLRenderer` — « default, mature… Maximum browser compatibility » — plutôt que `WebGPURenderer`). [source] [threejs.org/docs/llms.txt](https://threejs.org/docs/llms.txt) · [llms-full.txt](https://threejs.org/docs/llms-full.txt) (132 Ko)
- **7 285 symboles documentés** (index de recherche officiel), **794 pages de référence**, **manuel de 64 pages** traduit en 6 langues dont le français, **588 exemples officiels** dont 23 d'instanciation et 3 de batching. [source] [search.json](https://threejs.org/docs/search.json) · [manual/list.json](https://threejs.org/manual/list.json) · [examples/files.json](https://threejs.org/examples/files.json)
- `src/` est **inclus dans le paquet npm** : l'agent dispose de tout le JSDoc en local dans `node_modules/three/src/`, hors ligne. [source] [registry.npmjs.org/three/0.185.1](https://registry.npmjs.org/three/0.185.1)
- ⚠️ **Piège pour un agent** : le schéma d'URL de la doc a changé entre r170 et r185 (`docs/api/` → `docs/pages/`). Toutes les vieilles URL de la forme `threejs.org/docs/#api/en/objects/InstancedMesh` — la forme majoritaire dans les données d'entraînement d'avant 2025 — tombent désormais sur une redirection JS, et `threejs.org/docs/api/en/objects/InstancedMesh.html` renvoie **404**.
- ⚠️ **Pas de types TypeScript dans le paquet** : zéro `.d.ts`, pas de champ `types`. Le manuel renvoie vers `@types/three` (communautaire), version 0.185.4 publiée le 2026-08-04. [source] [manuel installation](https://threejs.org/manual/#en/installation) · [registry.npmjs.org/@types/three](https://registry.npmjs.org/@types/three)

### Ce que ça coûte, ce que ça risque

**Coût.** Écrire soi-même la couche d'entrée (manette + tactile), la gestion de perte de contexte, et le typage vient d'un paquet tiers. Aucune ECS, aucun éditeur : tout est à structurer à la main.
**Risque.** Pas de semver, 0.x, ~7 entrées de rupture par révision. Le support Node n'est **pas contractuel** (voir §7). Le changement d'URL de doc peut faire produire à un agent du code calé sur une API périmée.

---

## 4. Babylon.js

**Version** 9.21.2, publiée le 2026-08-14 (la veille de cette recherche), licence Apache-2.0, zéro dépendance. [source] [registry.npmjs.org/@babylonjs/core](https://registry.npmjs.org/@babylonjs/core)

### Le point fort réel : la stabilité de l'API

Engagement officiel, verbatim : « We release a new minor version each Thursday from our master branch… **We guarantee no breaking changes in our public API between minor versions.** Breaking changes are introduced between major versions. » [source] [doc.babylonjs.com — framework versions](https://doc.babylonjs.com/setup/frameworkPackages/frameworkVers)

C'est le seul des quatre à publier une garantie de non-rupture. Pour du code écrit par un agent, c'est un avantage substantiel.

### Le deuxième point fort : la perte de contexte

Verbatim : « Babylon.js has to recreate ALL low-level resources (including textures, shaders, programs, buffers, etc.). **The process is entirely transparent and handled under the hood by Babylon.js.** As a developer, you should not be concerned with this mechanism. » Avec `onContextLostObservable` / `onContextRestoredObservable` comme échappatoires, et `doNotHandleContextLost` pour désactiver. [source] [optimize_your_scene#handling-webgl-context-lost](https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene#handling-webgl-context-lost)

Confirmé dans le source : `_restoreEngineAfterContextLost` appelle `_rebuildGraphicsResources()` qui reconstruit dans l'ordre effets, buffers, textures internes et render targets. [source] [abstractEngine.pure.ts](https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/src/Engines/abstractEngine.pure.ts)

Contrepartie documentée : « **While handy, this feature consumes a lot of memory**, so you may want to turn it off ». [source] [reducingMemoryUsage](https://doc.babylonjs.com/features/featuresDeepDive/scene/reducingMemoryUsage) — sur un iPad A13 où la mémoire est justement la ressource critique, c'est un arbitrage à faire consciemment.

### Rendu voxel

- **Thin instances** (`thinInstanceSetBuffer`, depuis v4.2). Limite documentée franchement : « either all thin instances are drawn (if the mesh is deemed visible) or none are. **It's all or nothing** ». [source] [thinInstances](https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances)
- `Mesh.MergeMeshes`, avec `allow32BitsIndices` obligatoire au-delà de 64k sommets. [source] [mergeMeshes](https://doc.babylonjs.com/features/featuresDeepDive/mesh/mergeMeshes)
- **Atlas par face de cube** — directement pertinent pour du voxel : `faceUV` sur `CreateBox`, numérotation des faces documentée, exemple d'atlas complet, « there is no need for submaterials or submeshes ». [source] [texturePerBoxFace](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/texturePerBoxFace)
- Textures 2D array (WebGL2) contre le bleeding d'atlas : « ensures that distinct layers are sampled *as if* they were separate textures, so there will be no bleeding between different sections of the atlas ». [source] [webGL2#2d-array-textures](https://doc.babylonjs.com/setup/support/webGL2#2d-array-textures)
- ⚠️ **Le filtrage `nearest` est très mal documenté en prose.** `NEAREST_SAMPLINGMODE` n'apparaît dans les guides que sur la page des post-process ; la référence utilisable est la page d'API. Aucune page de tutoriel sur le rendu pixel-art. [source] [typedoc Texture](https://doc.babylonjs.com/typedoc/classes/BABYLON.Texture)

### Entrées — le meilleur des quatre

- `GamepadManager` : observables de connexion, `onButtonDownObservable`, classes typées `Xbox360Pad` avec énumération `Xbox360Button`, état interrogeable (`gamepad.buttonA`, `gamepad.leftStick.x`). [source] [gamepads](https://doc.babylonjs.com/features/featuresDeepDive/input/gamepads)
- `DeviceSourceManager`, abstraction unifiée couvrant **clavier, souris, tactile, DualShock, Xbox, Switch et manettes génériques** derrière une seule API. [source] [deviceSourceManager](https://doc.babylonjs.com/features/featuresDeepDive/input/deviceSourceManager)
- Joysticks virtuels tactiles officiels. [source] [virtualJoysticks](https://doc.babylonjs.com/features/featuresDeepDive/input/virtualJoysticks)

C'est exactement le besoin « manette + tactile, pas de souris », livré prêt à l'emploi.

### Tests hors navigateur

`NullEngine` est officiel depuis la v3.1 : « does not produce any rendering and can therefore be used in a **Node.js or server-side environment**… It can be used to: **Run tests** ». Limites documentées : pas de `camera.attachControl`, pas de `DynamicTexture`, et il faut fournir `XMLHttpRequest`. Le dépôt lui-même l'utilise dans **167 emplacements** de sa suite de tests, exécutée sous **Vitest**. [source] [serverSide](https://doc.babylonjs.com/setup/support/serverSide) · [nullEngine.test.ts](https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/test/unit/Engines/nullEngine.test.ts)

C'est le seul des quatre où le chemin headless est à la fois **documenté officiellement, testé en CI, et fonctionnel sans jsdom** (vérifié §2).

### Documentation

**4 589 URL au sitemap** : 3 758 pages d'API + 831 pages rédigées ; corpus source de 805 fichiers Markdown, ~843 000 mots, greppable. 1 956 identifiants de Playground uniques référencés dans la doc. [source] [sitemap.xml](https://doc.babylonjs.com/sitemap.xml) · [BabylonJS/Documentation](https://github.com/BabylonJS/Documentation)

⚠️ Mais : `doc.babylonjs.com/llms.txt` existe et n'est qu'un **survol en prose de 4,3 Ko, daté « Last updated: June 2025 »** — périmé et sans valeur d'index. La doc **n'est pas versionnée** (site unique sur la version courante, pas de sélecteur). Et la page officielle « breaking changes » **s'arrête à la 8.10.1 : zéro entrée 9.x**, alors qu'on est en 9.21.2 — le journal des versions 9.1 à 9.21 n'existe que dans le CHANGELOG du dépôt. [source] [breaking-changes](https://doc.babylonjs.com/breaking-changes) · [CHANGELOG.md](https://github.com/BabylonJS/Babylon.js/blob/master/CHANGELOG.md)

### Poids

Table officielle : `@babylonjs/core` complet ~6+ Mo minifié ; app typique via `@babylonjs/core/pure` ~1,5–3 Mo ; scène minimale ~1–1,5 Mo minifié. Le tree-shaking « can cut bundle sizes by 50-80% ». [source] [treeShaking](https://doc.babylonjs.com/setup/frameworkPackages/es6Support/treeShaking)

Notre mesure (332 Kio gzip) est cohérente avec le bas de cette fourchette.

### Ce que ça coûte, ce que ça risque

**Coût.** 2,6× le poids de Three.js au premier chargement. La reprise de contexte automatique consomme de la mémoire sur l'appareil où elle est la plus rare. Le pixel-art n'a pas de page de doc.
**Risque.** Le `llms.txt` périmé et la doc non versionnée peuvent égarer un agent entre les versions 8 et 9 ; le journal de rupture officiel n'est pas à jour pour la 9.x.

---

## 5. PlayCanvas

**Version** 2.21.4, publiée le 2026-08-13, licence MIT. [source] [registry.npmjs.org/playcanvas](https://registry.npmjs.org/playcanvas) · [LICENSE](https://github.com/playcanvas/engine/blob/main/LICENSE)

### Points forts

- **Seul des quatre à publier une matrice de support navigateur explicite** : « The PlayCanvas Engine requires a browser with WebGL 2.0 support », **Safari 15+ listé comme supporté sur macOS et iOS**. [source] [supported-browsers](https://developer.playcanvas.com/user-manual/engine/supported-browsers/)
- **Meilleur support d'agent IA de tous les candidats** : `llms.txt` (118 Ko) et surtout **`llms-full.txt` (1,84 Mo, ~246 000 mots)**, plus une page officielle « Developing with AI » recommandant des conventions `AGENTS.md` / `CLAUDE.md`. [source] [llms-full.txt](https://developer.playcanvas.com/llms-full.txt) · [developing-with-ai](https://developer.playcanvas.com/user-manual/engine/developing-with-ai/)
- **Node.js officiellement supporté** : « The PlayCanvas Engine **fully supports running in Node.js** », avec « Writing unit tests » cité comme cas d'usage, et `NullGraphicsDevice` comme chemin officiel. La suite de tests du moteur elle-même tourne sous mocha + jsdom (131 fichiers `*.test.mjs`). [source] [running-in-node](https://developer.playcanvas.com/user-manual/engine/running-in-node/)
- Entrées complètes et natives : `GamePads` (avec `pulse()` pour la vibration), `TouchDevice`, `Keyboard`, `Mouse`. [source] [api GamePads](https://api.playcanvas.com/engine/classes/GamePads.html) · [api TouchDevice](https://api.playcanvas.com/engine/classes/TouchDevice.html)
- Instanciation matérielle : « Instancing is supported on all devices since PlayCanvas requires WebGL2 minimum ». `FILTER_NEAREST` documenté comme « Point sample filtering ». [source] [hardware-instancing](https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/hardware-instancing/) · [FILTER_NEAREST](https://api.playcanvas.com/engine/variables/FILTER_NEAREST.html)
- Perte de contexte gérée, avec événements publics `devicelost` / `devicerestored`, et la boucle saute update/render tant que le contexte est perdu. [source] [webgl-graphics-device.js](https://github.com/playcanvas/engine/blob/main/src/platform/graphics/webgl/webgl-graphics-device.js)

### Points faibles

- **Le plus lourd des trois moteurs JS** : 487 Kio gzip mesuré, 3,7× Three.js.
- **La documentation est massivement orientée éditeur.** Sur les 487 pages de doc officielle, la section `user-manual/editor` en compte **128** et la section `user-manual/engine` en compte **8** (aperçu, développer avec l'IA, migrations, Node.js, usage standalone, navigateurs supportés). L'éditeur est un **SaaS hébergé payant** (gratuit 1 Go, 15 $/mois, 50 $/siège/mois). [source] [llms.txt](https://developer.playcanvas.com/llms.txt) · [playcanvas.com/plans](https://playcanvas.com/plans)
  *Nuance honnête* : des sections comme `graphics` (54 pages), `physics`, `animation` sont utilisables en code pur sans être classées sous `engine`. Le rapport 128/8 est un comptage d'étiquettes de section, pas une mesure de prose exploitable.
- **Aucune politique de versionnage semver publiée** — pas trouvée en source primaire.
- **Zéro occurrence de « context lost » / « webglcontextlost » dans les 487 pages de doc.** La gestion existe dans le source mais n'est documentée nulle part en prose. Et une lacune connue reste ouverte depuis 2021 : issue #3312, « Implement a solution for regenerating content of dynamic resources when the context is lost », qui correspond à un `TODO` dans le source indiquant que le contenu des render targets n'est pas régénéré après restauration. [source] [issue #3312](https://github.com/playcanvas/engine/issues/3312)
- Le moteur embarque des contournements Safari en dur (antialiasing forcé à off sur AppleWebKit 15.4, contournement d'unités de texture Safari) — signe que le terrain iOS est accidenté, mais aussi qu'il est activement entretenu. [source] même fichier
- Friction de build constatée [mesuré] : `node:worker_threads` non résolu par esbuild en configuration par défaut.

### Ce que ça coûte, ce que ça risque

**Coût.** 3,7× le poids de Three.js. La voie « code seul » est réelle mais documentairement minoritaire face à l'éditeur.
**Risque.** Un agent qui cherche « comment faire X en PlayCanvas » tombera majoritairement sur des instructions d'éditeur (cliquer dans une interface hébergée) inapplicables à un dépôt git. C'est précisément le mode d'échec le plus coûteux dans notre configuration.

---

## 6. Godot 4 — export web

**Version** 4.7.1-stable, publiée le 2026-07-14. [source] [releases](https://github.com/godotengine/godot/releases)

Godot est un moteur sérieux. Sur **cette** cible précise, les faits sont accablants — et ils sont tous en source primaire.

### 6.1 Le poids

~39,5 Mo de WebAssembly, ~10 Mo transférés, **avant tout contenu de jeu** (§2). À comparer aux 130 Kio de Three.js. Réduire ce poids « requires compiling the engine from source with SCons » — soit compiler un moteur C++ avec des drapeaux `module_*_enabled=no`, une tâche que rien dans ce projet ne justifie. [source] [optimizing_for_size](https://docs.godotengine.org/en/stable/engine_details/development/compiling/optimizing_for_size.html)

Et la doc reconnaît que ce poids se paie au démarrage : « This will also improve startup times, **especially on the web platform where binary size is directly linked to initialization speeds**. » [source] [creating_applications](https://docs.godotengine.org/en/stable/tutorials/ui/creating_applications.html)

### 6.2 Le tactile est cassé sur iPad — c'est notre schéma de contrôle principal

Issue **#95941**, **ouverte**, mise à jour le **2026-07-14** : `InputEventScreenTouch` et `InputEventScreenDrag` renvoient des valeurs d'`event.index` aberrantes **spécifiquement sur l'export web iOS/iPadOS** — le compteur s'incrémente à chaque événement au lieu d'identifier le doigt. Correct sur Android et en émulation souris. Le suivi multi-doigts est donc non fiable sur iPad web. Aucun correctif de mainteneur. [source] [issue #95941](https://github.com/godotengine/godot/issues/95941)

C'est disqualifiant : l'iPad au tactile est l'un des deux publics verrouillés du projet.

### 6.3 Des plantages ouverts sur notre matériel exact

Issue **#110187**, **ouverte** : « Web Export Crashes on iOS iPad 17.x ». Le rapporteur teste un **iPad 9e génération sous iPadOS 17.2** — notre plancher matériel déclaré — et observe que « the whole page will crash and reload; this happens with every browser », reproductible en 4.3, 4.4, 4.4.1 et 4.5.beta7. Résolu seulement en passant à iPadOS 18.6.2. Non trié par les mainteneurs. [source] [issue #110187](https://github.com/godotengine/godot/issues/110187)

Autres tickets **ouverts** pertinents :

| # | Titre | État |
|---|---|---|
| [70621](https://github.com/godotengine/godot/issues/70621) | WebAssembly maximum memory 2GB causes Out of Memory error on iOS Safari | **ouvert**, `confirmed`, maj. 2026-06-01 |
| [116750](https://github.com/godotengine/godot/issues/116750) | WebKit (Safari on iOS) page crash when playing audio during gameplay | **ouvert**, testé sur Godot **4.5.1-stable** |
| [61537](https://github.com/godotengine/godot/issues/61537) | HTML5 exports crash on iOS devices with 1 GB RAM | **ouvert** |
| [100272](https://github.com/godotengine/godot/issues/100272) | SubViewportContainer → « WebGL context lost » sur iOS | **ouvert** |
| [62377](https://github.com/godotengine/godot/issues/62377) | iOS Safari renders all 3D models black (GLES3) — bug amont WebKit/ANGLE | **ouvert** |
| [67949](https://github.com/godotengine/godot/issues/67949) | macOS Safari — tous les exports HTML5 plantent au chargement, même vides | **ouvert**, priorité haute |

Sur #70621, le chef d'équipe web adamscott note n'avoir pas reproduit… **sur un iPad Pro M4**, en ajoutant lui-même « but maybe it's because it's an iPad Pro M4 ». Notre cible est un A13. Le gestionnaire de projet akien-mga demandait encore confirmation le 2026-06-01. [source]

Sur #116750, le plantage audio survient sur un jeu qui appelle `play()` en continu — exactement le profil d'un tower defense avec des tirs de canon. Zéro réponse de mainteneur depuis février 2026.

### 6.4 La doc officielle déconseille Safari, et c'est inapplicable sur iPad

Verbatim : « **Note that Safari has several issues with WebGL 2.0 support that other browsers don't have, so we recommend using a Chromium-based browser or Firefox if possible.** » [source] [exporting_for_web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)

Ce conseil n'a **aucun sens sur iPadOS**, où tous les navigateurs — y compris Chrome et Firefox — sont obligatoirement WebKit. Il n'existe aucune matrice officielle de support navigateur pour les **jeux exportés** (celle de `system_requirements` concerne l'éditeur).

À décharge, le mode mono-thread par défaut depuis 4.3 a réellement amélioré les choses et supprime le besoin de COOP/COEP : « The single-threaded export works very well on macOS and iOS too… For these reasons, it is the preferred and now default way to export your games on the Web. » Contrepartie assumée : « **it cannot use threads, and is not as performant as the multi-threaded export** ». [source] même page

### 6.5 Manettes : réserve explicite dans la doc

« **The quality of controller support tends to vary wildly across browsers. As a result, you may have to instruct your players to use a different browser if they can't get their controller to work.** » Et depuis 4.5, SDL3 gère les manettes sur desktop mais **pas sur le web** : « This custom code is still used to support controllers on Android and Web, so it may result in issues appearing only on those platforms. » [source] [controllers_gamepads_joysticks](https://docs.godotengine.org/en/stable/tutorials/inputs/controllers_gamepads_joysticks.html)

### 6.6 C# est impossible ; GDScript est la seule option

Verbatim, en encadré `attention` en tête de la page d'export : « **Projects written in C# using Godot 4 currently cannot be exported to the web.** … To use C# on web platforms, use Godot 3 instead. » [source] [exporting_for_web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)

Confirmé par l'artefact : le `mono_export_templates.tpz` officiel (1,20 Go) contient **zéro entrée `web_*`**, là où le `.tpz` non-mono en contient huit. Le ticket de suivi [#70796](https://github.com/godotengine/godot/issues/70796) est **toujours ouvert**, sans jalon, dernière activité 2026-06-19. La cause racine est structurelle : « the .NET runtime can only be built as a main module. So, unlike GDExtensions, the resulting WASM can't be loaded by Godot. » Un prototype présenté à la GodotCon Boston en mai 2025 est décrit par ses auteurs comme « very brittle », avec « we cannot commit to a specific timeline yet ». [source] [platform-state-in-csharp](https://godotengine.org/article/platform-state-in-csharp-for-godot-4-2/) · [live-from-godotcon-boston](https://godotengine.org/article/live-from-godotcon-boston-web-dotnet-prototype/)

### 6.7 Tests hors navigateur : possible, mais sans cadre première partie

`--headless` est officiel et permet `godot --headless --script`. Mais : « **GDScript does not feature an integrated unit testing framework** », la doc renvoyant vers GUT et GdUnit4, tous deux **communautaires**. [source] [command_line_tutorial](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html) · [creating_applications#adding-unit-tests](https://docs.godotengine.org/en/stable/tutorials/ui/creating_applications.html#adding-unit-tests)

Surtout, « hors navigateur » n'est pas « hors moteur » : tester la logique exige de lancer le binaire Godot avec le projet. C'est incompatible avec l'esprit du ticket #13, qui cherche une logique de jeu pure, exécutable en millisecondes.

### 6.8 À décharge

La documentation Godot est **versionnée** (`en/stable`, `en/4.7`, `en/4.6`…), ce qu'aucun des trois autres ne fait, et la page d'export web est exhaustive (~500 lignes, avec une section « Limitations » franche). Le retrait de l'ancien avertissement bloquant (« Godot 4's HTML5 exports currently cannot run on macOS and iOS ») est un progrès réel, motivé par le passage au mono-thread. Mais le mainteneur AThousandShips avait posé la question restée ouverte : « Has the webgl issues been resolved? Otherwise this isn't fully resolved yet, the post only talks about threading. » [source] [godot-docs #9983](https://github.com/godotengine/godot-docs/issues/9983)

---

## 7. Tableau de synthèse

| Critère | Three.js | Babylon.js | PlayCanvas | Godot 4 web |
|---|---|---|---|---|
| Poids 1er chargement (gzip, mesuré) | **130 Kio** | 332 Kio | 487 Kio | ~10 Mio |
| Rendu voxel documenté | **page de manuel dédiée** | atlas par face de cube | instancing + batching | n/a (moteur généraliste) |
| Filtrage `nearest` documenté | ✅ prose + constante | ⚠️ API seulement | ✅ constante | ✅ |
| Perte de contexte WebGL | interne, **non exposée** | ✅ **transparente + observables** | événements, **non documentée** | ⚠️ [#100272 ouvert](https://github.com/godotengine/godot/issues/100272) |
| Manette | ❌ à écrire | ✅ `GamepadManager` | ✅ `GamePads` | ⚠️ réserve officielle |
| Tactile | Pointer Events par contrôle | ✅ `DeviceSourceManager` | ✅ `TouchDevice` | ❌ **[#95941 ouvert](https://github.com/godotengine/godot/issues/95941)** |
| Tests hors navigateur | ✅ nu, non contractuel | ✅ **NullEngine, officiel + CI** | ✅ officiel, jsdom requis | ⚠️ binaire + cadre tiers |
| Stabilité API | ❌ 0.x, ~6,8 ruptures/rév. | ✅ **garantie entre mineures** | ⚠️ pas de politique publiée | ✅ doc versionnée |
| Doc pour agent IA | ✅ **llms.txt avec instructions LLM** | ⚠️ llms.txt périmé (juin 2025) | ✅ **llms-full.txt 1,84 Mo** | ✅ versionnée |
| Support iOS officiellement déclaré | ❌ aucun | ❌ aucun | ✅ **Safari 15+** | ⚠️ « préférez Chromium ou Firefox » |
| Langage | JS/TS | JS/TS | JS/TS | ❌ **GDScript seul** |

---

## Recommandation

### **Three.js.**

Quatre faits emportent la décision.

**1. Le poids au démarrage est le facteur dominant sur la cible, et l'écart n'est pas marginal.**
130 Kio gzip contre 332 (Babylon), 487 (PlayCanvas) et ~10 Mio (Godot) [mesuré, §2]. Sur un A13, ces méga-octets ne sont pas seulement téléchargés : le WebAssembly doit être **compilé** avant le premier pixel, et Godot documente lui-même que « binary size is directly linked to initialization speeds » [source]. Pour un jeu destiné à un enfant de 8 ans qui doit démarrer immédiatement, un facteur ~80 sur le chargement n'est pas un détail d'optimisation, c'est la différence entre un jeu qu'on lance et un jeu qu'on attend.

**2. Godot est disqualifié par des faits, pas par une préférence.**
Le tactile multi-doigts est cassé sur l'export web iOS/iPadOS — ticket [#95941](https://github.com/godotengine/godot/issues/95941) **ouvert**, mis à jour il y a un mois — et l'iPad au doigt est l'un des deux publics verrouillés. Un plantage est ouvert **sur un iPad 9e génération**, notre plancher matériel exact ([#110187](https://github.com/godotengine/godot/issues/110187)). La doc officielle conseille d'éviter Safari, ce qui est inapplicable sur iPadOS où tout navigateur est WebKit. Et C# étant impossible à exporter vers le web ([#70796](https://github.com/godotengine/godot/issues/70796) toujours ouvert), il faudrait écrire tout le jeu en GDScript — un langage sans cadre de test première partie, pour lequel un agent dispose de bien moins de documentation récente et fiable que pour TypeScript.

**3. Le cas voxel est traité par une page du manuel officiel.**
« Voxel (Minecraft Like) Geometry » construit exactement notre ville : maillage à faces fusionnées depuis un tableau de cellules, avec UV d'atlas [source]. Aucun des trois autres n'a d'équivalent première partie sur ce cas précis. Ajouté à `InstancedMesh`, `BatchedMesh` (non marqué expérimental, vérifié par grep du source publié), `mergeGeometries` et la recette pixel-art documentée (`NearestFilter` + `generateMipmaps = false`), la boîte à outils voxel est complète et sourcée.

**4. C'est le mieux outillé pour un agent qui écrit le code.**
Three.js publie un `llms.txt` contenant une section « Instructions for Large Language Models » qui dit explicitement d'utiliser `WebGLRenderer` (« default, mature… Maximum browser compatibility ») plutôt que WebGPU — c'est-à-dire précisément notre contrainte, écrite par le projet, à destination des modèles [source]. S'y ajoutent 7 285 symboles documentés, 588 exemples officiels, un manuel traduit en français, et `src/` livré dans le paquet npm : l'agent a tout le JSDoc en local, hors ligne.

### Ce que ce choix coûte, et comment on le paie

| Coût | Mitigation |
|---|---|
| **Pas d'abstraction manette ni tactile.** Babylon et PlayCanvas les fournissent. | Il faut de toute façon une couche d'entrée sur mesure : deux schémas hétérogènes (manette PC / doigt iPad), aucune souris, aucune visée libre, ergonomie pensée pour 8 ans. Aucune abstraction générique ne livre ça. La Gamepad API brute est une boucle de sondage courte, et Pointer Events couvre le tactile (Safari 13+, iOS en `mirror`). À traiter dans le ticket dédié aux entrées. |
| **Pas de semver ; ~6,8 entrées de rupture par révision** (dont 35 % sur WebGPU/TSL, hors de notre chemin). | **Épingler la révision exacte** (`three@0.185.1`) dans `package.json`, sans accent circonflexe. Le jeu est un projet fermé de 10-15 min de partie : rien n'oblige à suivre les révisions. |
| **Perte de contexte non exposée** : Three.js réinitialise le contexte en interne mais ne publie aucun événement. Babylon fait bien mieux ici. | Poser nous-mêmes un écouteur `webglcontextlost` / `webglcontextrestored` sur `renderer.domElement` — quelques lignes — et afficher un écran « on reprend » adapté à un enfant. Fait notable : `onContextRestore` rappelle bien `initGLContext()` [source vérifiée dans `WebGLRenderer.js`], donc le gros du travail est déjà fait ; il ne manque que la notification applicative. |
| **Types TypeScript dans un paquet tiers** (`@types/three`). | Paquet vivant (0.185.4 publiée le 2026-08-04, alignée sur r185), et le manuel officiel le désigne nommément. À épingler également. |
| **Support Node non contractuel** : ça marche (vérifié §2) mais ce n'est documenté nulle part et la CI de Three.js ne lance aucun test en Node nu. | C'est l'argument décisif pour l'architecture du ticket #13 : **la logique de jeu ne doit importer aucun module de rendu.** Si le cœur du jeu est du TypeScript pur (état, vagues, PV de la mairie, économie, IA des zombies), il se teste avec `node:test` — stable depuis Node 20 [source](https://nodejs.org/api/test.html) — sans jamais dépendre du support Node de Three.js. Cette frontière, qu'il faut tracer de toute façon, neutralise le risque. |

### Deuxième choix, si le cadre changeait

**Babylon.js.** Si le projet devait privilégier la robustesse d'exécution sur la légèreté, c'est le bon choix : c'est le seul à **garantir contractuellement l'absence de rupture d'API entre versions mineures**, le seul dont la reprise après perte de contexte WebGL est **transparente et documentée** (l'écueil iOS numéro un), et son `NullEngine` est le chemin de test headless le plus solide des quatre — officiel, couvert par 167 emplacements de sa propre CI, et fonctionnel sans jsdom (vérifié §2). Ses entrées manette et tactile sont prêtes à l'emploi. On le paie 2,6× en poids de démarrage, avec un `llms.txt` périmé et un journal de ruptures officiel qui s'arrête deux majeures en arrière.

**PlayCanvas** arrive troisième malgré de vrais atouts (seule matrice de support iOS explicite, `llms-full.txt` de 1,84 Mo, Node officiellement supporté) : 3,7× le poids, et une documentation dont la voie « code seul » ne représente que 8 pages sur 487. Un agent qui cherche comment faire quelque chose y trouvera surtout des instructions de clics dans un éditeur SaaS payant — le mode d'échec le plus coûteux quand c'est un agent qui code.

---

## Ce qui reste incertain

Points qui n'ont **pas** pu être vérifiés auprès d'une source primaire, et qu'il ne faut pas traiter comme acquis.

1. **`WEBGL_multi_draw` sur iPadOS Safari.** Détermine si `BatchedMesh` prend son chemin rapide ou retombe sur une boucle de draw calls par instance [source du fallback vérifiée dans `WebGLRenderer.js`]. Aucune source primaire ne l'indique. **À vérifier sur l'appareil** avec `renderer.extensions.has('WEBGL_multi_draw')` avant de bâtir la ville sur `BatchedMesh` plutôt que sur `InstancedMesh` + géométries fusionnées.

2. **Le plafond mémoire réel d'un onglet Safari sur iPad A13/A14.** Apple ne publie aucune documentation de limite mémoire par onglet, ni pour JS, ni pour WebAssembly, ni pour les textures. Les chiffres qui circulent (~1,2 Go, limite WASM 2 Go) viennent de bugs WebKit et de fils de forum, pas d'une source Apple. Le budget de textures de l'atlas et le nombre de zombies simultanés devront donc être **calés par mesure sur l'appareil**, pas par calcul.

3. **Les performances réelles de la scène cible sur un A13.** Rien ici ne mesure le nombre d'images par seconde. Les 20 000 cubes instanciés et 10 pantins de nos bundles de test servaient à mesurer le **poids du code**, pas la vitesse de rendu : aucune de ces scènes n'a été exécutée sur un GPU. Le budget de draw calls, la taille de la ville et le nombre de zombies restent à établir par prototypage sur matériel réel — c'est l'objet d'un ticket de performance distinct.

4. **Aucun de Three.js ni Babylon.js ne déclare officiellement supporter iOS/iPadOS.** Il n'existe chez eux ni matrice de support navigateur, ni version minimale d'iOS, ni page de recommandation pour iPad. Seul PlayCanvas publie « Safari 15+ ». Pour Three.js, la posture constatée des mainteneurs sur les bugs iOS est de renvoyer vers le bugtracker WebKit ([#30047](https://github.com/mrdoob/three.js/issues/30047), [#20453](https://github.com/mrdoob/three.js/issues/20453)) — souvent à juste titre, les bugs étant reproductibles sans la bibliothèque, mais cela signifie qu'**aucun de ces projets ne s'engage sur notre plateforme cible**.

5. **La taille Brotli réelle d'un export Godot 4.7.** Les 5 Mo officiels datent de la 4.3. Notre mesure de 10,2 Mio est du deflate sur la 4.7.1. L'ordre de grandeur de la conclusion ne change pas, mais le chiffre exact n'est pas établi.

6. **Le poids réel de notre bundle final.** Les 130 Kio mesurés couvrent le moteur et une scène représentative — pas le code du jeu, pas les textures 16×16, pas l'audio synthétisé, pas l'interface. C'est un plancher, pas une prévision.

7. **Comparaison sur le temps de compilation/parsing, pas seulement sur les octets.** Nous avons mesuré la taille transférée. Le coût de parsing JS et de compilation WASM sur un A13 n'a pas été mesuré et joue en défaveur de Godot plus fortement encore que les octets seuls ne le suggèrent — mais c'est une inférence, pas une mesure.
