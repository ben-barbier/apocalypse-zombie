# Manette et tactile dans le navigateur : ce qui est possible

**Ticket** : [#3](https://github.com/ben-barbier/apocalypse-zombie/issues/3) — recherche pour le cahier de conception d'*Apocalypse Zombie*.
**Date de la recherche** : 15 août 2026.
**Cibles** : Safari sur iPadOS (iPad 9ᵉ/10ᵉ génération, iPadOS 17 → 26) et Chrome sur Windows.
**Version Safari de référence** : Safari 26.6, sortie le 27 juillet 2026 (iOS 26.6, iPadOS 26.6, macOS Tahoe 26.6) — <https://webkit.org/blog/18178/webkit-features-for-safari-26-6/>. Safari 27 est en bêta depuis la WWDC26 (8 juin 2026) — <https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/>.
**Cadre** : un seul build web, manette sur PC + tactile sur iPad, pas de souris, pas de visée libre, joueur de 8 ans.

Chaque affirmation est adossée à une source primaire : spécification (W3C / WHATWG), blog WebKit, notes de version Safari, bugs.webkit.org, documentation Apple, données de compatibilité MDN. Les points non vérifiables sur pièces sont marqués **[à tester sur appareil]**.

---

## 0. Résumé exécutif

### Ce qui est possible

- **Manette sur PC (Chrome/Windows)** : complet. Détection, mapping `standard`, 17 boutons / 4 axes, vibration `dual-rumble`.
- **Manette sur iPad (Safari)** : la Gamepad API fonctionne depuis iOS/iPadOS 10.3. Une manette Xbox, DualShock 4, DualSense ou MFi appairée dans les Réglages est exposée à la page web, en mapping `standard`.
- **Tactile multi-points simultanés** : garanti. Joystick virtuel d'une main + bouton de l'autre marchent sans réserve, en Pointer Events (recommandé, iPadOS 13+) comme en Touch Events.
- **Neutraliser défilement, zoom, sélection, loupe, rebond** : faisable intégralement, principalement en CSS (`touch-action: none` fait 90 % du travail).
- **Plein écran sur iPad** : l'API Fullscreen existe (iPadOS 16.4+) — mais avec un défaut rédhibitoire pour un jeu, voir §3.1.
- **PWA « ajouter à l'écran d'accueil »** : mode web app honoré depuis iOS 11.3, et depuis iOS/iPadOS 26 **tout** site peut être installé sans aucune condition.
- **Empêcher la veille de l'écran** : Screen Wake Lock disponible sur iOS/iPadOS 16.4+ — et **18.4+** en PWA installée.
- **Son** : Web Audio marche, à condition de débloquer l'`AudioContext` dans un gestionnaire d'événement utilisateur, et de sortir du canal `ambient` pour survivre au mode silencieux.

### Ce qui est impossible sur iPad — franchement

| Fonctionnalité | Verdict |
|---|---|
| **Verrouiller l'orientation** (`screen.orientation.lock()`) | **Impossible.** Derrière un drapeau expérimental, et même activé il échoue sur iPad : *« Apps supporting multiple scenes (multitask) cannot lock their orientation »*. |
| **Verrouiller l'orientation via le manifest** (`"orientation": "landscape"`) | **Impossible.** Aucune note de version Safari ne l'annonce, et Safari est une app multi-scènes. |
| **Plein écran « propre » via l'API Fullscreen** | **Inutilisable en jeu.** Bouton de sortie en surimpression non masquable + un balayage vers le bas quitte le plein écran. MDN qualifie explicitement ça d'inadapté aux jeux. |
| **Bloquer les gestes système iPadOS** (Dock, Centre de contrôle, accueil, Slide Over) | **Impossible.** L'API `preferredScreenEdgesDeferringSystemGestures` est réservée à UIKit/SwiftUI, sans équivalent web. |
| **`beforeunload`** pour prévenir une sortie | **Impossible.** Non supporté sur Safari iOS. |
| **Détecter une purge d'onglet** (`document.wasDiscarded`) | **Impossible.** Non implémenté par WebKit. |
| **`freeze` / `resume` (Page Lifecycle)** | **Impossible.** Non implémenté par WebKit. |
| **`requestAnimationFrame` en arrière-plan** | **Impossible** par conception (spec HTML). |
| **`user-scalable=no` / `maximum-scale=1`** | **Ignorés depuis iOS 10.** Remplacés par `touch-action`. |
| **Vibration de la manette sur iPad** | **Impossible.** Prouvé dans le code source WebKit : l'attribut `vibrationActuator` est désactivé au niveau du runtime sur iOS/iPadOS (§1.5). |
| **Gamepad API en Mode Isolement (Lockdown Mode)** | **Désactivée** par WebKit. |

---

## 1. Manette (Gamepad API)

### 1.1 La spécification

Référence : **W3C Gamepad, Working Draft du 10 juillet 2025** — <https://www.w3.org/TR/gamepad/>

- **Geste utilisateur obligatoire — et c'est bien un geste *sur la manette*.** L'algorithme normatif de `getGamepads()` contient l'étape : *« If this.[[hasGamepadGesture]] is false, then return an empty list »*, motivée par *« To mitigate fingerprinting, `getGamepads()` returns an empty list before a gamepad user gesture has been seen. »* La définition : *« For buttons that support a neutral default value and have reported a `pressed` value of `false` at least once, a `pressed` value of `true` SHOULD be considered interaction »* ; pour les axes, un déplacement au-delà d'un seuil choisi par l'agent utilisateur, *« large enough that random jitter is not considered interaction »*.
  Chrome fixe ce seuil à **0,5** — `const float kAxisMoveAmountThreshold = 0.5;` avec le commentaire *« A big enough deadzone to detect accidental presses »* (<https://github.com/chromium/chromium/blob/main/device/gamepad/gamepad_user_gesture.cc>). WebKit dit la même chose en clair dans son code : *« The user can expose an already-connected game controller to a web page by expressing explicit intent. Examples include pressing a button, or wiggling the joystick with intent. »* (<https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/gamepad/cocoa/GameControllerGamepad.mm>)
  → **Conséquence de conception** : brancher ou appairer la manette ne suffit pas. Tant que l'enfant n'a pas appuyé sur un bouton, la page ne voit *rien*, et `gamepadconnected` n'est pas émis. Il faut un écran « Appuie sur un bouton pour jouer ».
  → **Bonus** : dans Chrome, un appui bouton manette compte comme **activation utilisateur** quand la page est visible (`LocalFrame::NotifyUserActivation(..., kInteraction)`) — ce premier appui peut donc débloquer `AudioContext.resume()` et `requestFullscreen()`. **[à tester sur appareil]** pour Safari, où WebKit crée aussi un `UserGestureIndicator` au dispatch des événements manette.
- **Valeurs de `mapping`** : `""` (non reconnu), `"standard"`, ou `"xr-standard"` (réservé à WebXR). La règle : *« If the button and axis layout of the gamepad device corresponds with the Standard Gamepad layout, then return "standard". Return "". »*
- **`index` est réutilisé.** Attribué premier arrivé premier servi à partir de 0, il est **réattribué** quand une manette se déconnecte — une autre manette peut donc hériter de l'index 0.
- **Mapping `standard`** — disposition normative, 17 boutons et 4 axes :

  | Index | Bouton | Correspondance Xbox / PlayStation |
  |---|---|---|
  | 0–3 | Grappe droite : bas, droite, gauche, haut | A/B/X/Y — Croix/Rond/Carré/Triangle |
  | 4–5 | Gâchettes hautes gauche / droite | LB / RB — L1 / R1 |
  | 6–7 | Gâchettes basses gauche / droite | LT / RT — L2 / R2 |
  | 8–9 | Grappe centrale gauche / droite | View / Menu — Share / Options |
  | 10–11 | Pression des sticks gauche / droit | LS / RS — L3 / R3 |
  | 12–15 | Croix directionnelle : haut, bas, gauche, droite | D-pad |
  | 16 | Bouton central | Xbox / PS |

  | Index | Axe |
  |---|---|
  | 0 | Stick gauche horizontal (négatif = gauche) |
  | 1 | Stick gauche vertical (négatif = haut) |
  | 2 | Stick droit horizontal |
  | 3 | Stick droit vertical |

  Quand la manette n'est pas reconnue, `mapping` vaut `""` et l'ordre des boutons n'est plus garanti. **Attention à l'axe Y : positif = vers le bas.**
  ⚠️ **Ne jamais supposer `buttons.length === 17`, même en mapping `standard`.** Sur iPadOS, WebKit dimensionne le tableau à **16 boutons si la manette n'expose pas de bouton Home**, 17 sinon. Sur Chrome/Windows, des boutons **supplémentaires** apparaissent à l'index 17 tout en gardant `mapping === "standard"` : pavé tactile DualShock/DualSense, bouton Share de la Xbox Series X, bouton Capture du Switch Pro (<https://github.com/chromium/chromium/blob/main/device/gamepad/gamepad_standard_mappings.h>). Toujours tester `buttons[i]?.pressed`.
- **Valeurs.** Les axes sont *« linearly normalized to the range [-1 .. 1] »*, les boutons dans `[0 .. 1]` — *« 0 MUST mean fully unpressed, and 1 MUST mean fully pressed »*, et les boutons numériques ne doivent fournir que 0 ou 1.
- **Zones mortes : rien dans la spec.** Aucun filtrage natif n'est imposé. Un stick au repos renvoie régulièrement des valeurs non nulles. **C'est à l'application d'appliquer sa propre zone morte** — de préférence radiale (sur la norme du vecteur) et non par axe, sinon les diagonales deviennent carrées.
- **Instantané, pas objet vivant.** `navigator.getGamepads()` renvoie un *snapshot* ; il faut le relire à chaque image. La spec recommande d'aligner le sondage sur `requestAnimationFrame()`.
  → **Piège classique** : garder une référence à un objet `Gamepad` et croire qu'il se met à jour tout seul. Il ne le fait pas. Le tableau est aussi **creux** — filtrer les `null`.
- **Permissions Policy.** La spec définit une fonctionnalité `gamepad`, liste d'autorisation par défaut `*`. Quand elle est désactivée, `getGamepads()` **lève un `SecurityError`** et les événements de connexion ne se déclenchent pas. Safari l'implémente avec un message explicite : *« Third-party iframes are not allowed to call getGamepads() unless explicitly allowed via Feature-Policy (gamepad) »* (<https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/gamepad/NavigatorGamepad.cpp>) ; Chrome depuis la version 103 (<https://chromestatus.com/feature/5138714634223616>).
  → **Conséquence** : si le jeu est un jour embarqué dans une iframe **cross-origin** (itch.io, portail scolaire, CMS), le parent doit écrire `<iframe allow="gamepad; fullscreen">`. Même origine : aucun problème.
- **Vibration.** `Gamepad.vibrationActuator` → `GamepadHapticActuator.playEffect("dual-rumble", { startDelay, duration, weakMagnitude, strongMagnitude })`, magnitudes dans `[0 .. 1]`, promesse résolue en `"complete"` ou `"preempted"`.

### 1.2 Support réel

| | Chrome | Safari (macOS) | Safari (iOS/iPadOS) |
|---|---|---|---|
| Gamepad API | 21 (préfixé), 25 (complet) | 10.1 | **10.1 (iOS/iPadOS 10.3)** |
| `Gamepad.connected` | 25 | 10.1 | 10.1 |
| `ongamepadconnected` sur `WindowEventHandlers` | 143 | — | — |
| `vibrationActuator` / `GamepadHapticActuator` | 68 | 16.4 | **jamais — voir §1.5** |
| `playEffect("trigger-rumble")`, `effects` | 126 | non | non |
| `hapticActuators` (ancienne forme, hors spec) | non | non | non |

Sources : <https://github.com/mdn/browser-compat-data/blob/main/api/Gamepad.json>, <https://github.com/mdn/browser-compat-data/blob/main/api/GamepadHapticActuator.json>, <https://developer.chrome.com/release-notes/143>.

**Sur iOS, la Gamepad API date de Safari 10.1 / iOS 10.3 (29 mars 2017)** : *« The Gamepad API allows web content to receive input from connected gamepad devices… by mapping various input devices to a standard gamepad layout »* (<https://developer.apple.com/library/archive/releasenotes/General/WhatsNewInSafari/Articles/Safari_10_1.html>), et WebKit précisait alors : *« Any gamepad that works on macOS without additional drivers will work on a Mac. **All MFi gamepads are supported on iOS.** »* (<https://webkit.org/blog/7477/new-web-features-in-safari-10-1/>)

Deux points de support à connaître :
- **Chrome plafonne à 4 manettes** : `getGamepads()` renvoie toujours un tableau de longueur 4, avec des `null` aux emplacements vides (`kItemsLengthCap = 4`, <https://github.com/chromium/chromium/blob/main/device/gamepad/public/cpp/gamepads.h>).
- **Safari n'exige pas de contexte sécurisé** pour la Gamepad API — l'IDL WebKit n'a pas de `[SecureContext]`, et **Safari 18.0** a même supprimé l'avertissement : *« Fixed `getGamepads()` to no longer trigger an insecure contexts warning. (123039555) »* (<https://developer.apple.com/documentation/safari-release-notes/safari-18-release-notes>). Chrome non plus ne bloque pas en HTTP à ce jour. Servir quand même en **HTTPS** : le Wake Lock, lui, l'exige.

### 1.3 Une manette Bluetooth sur iPad, concrètement

- Apple documente l'appairage des manettes **Xbox Wireless, Xbox Elite Series 2, Xbox Adaptive, DualShock 4, DualSense, DualSense Edge et MFi** sur iPad. L'appairage se fait dans **Réglages → Bluetooth**, puis l'iPad expose **Réglages → Général → Manette de jeu**. Les manettes PlayStation se connectent aussi automatiquement en USB. (<https://support.apple.com/en-us/111099>, <https://support.apple.com/en-us/111100>, <https://support.apple.com/en-us/111101>)
- **Oui, elle est réellement exposée à la page web.** Sur iOS/iPadOS, WebKit branche systématiquement son fournisseur de manettes sur le framework **GameController** d'Apple — `GamepadProvider::setSharedProvider(GameControllerGamepadProvider::singleton())` (<https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/Gamepad/cocoa/UIGamepadProviderCocoa.mm>) — et s'abonne à `GCControllerDidConnectNotification`. **Toute manette reconnue par iPadOS est donc visible par Safari**, sans liste d'autorisation web supplémentaire, sans invite de permission. Mais seulement après le geste utilisateur exigé par la spec (§1.1) : une manette déjà appairée à l'ouverture de la page est enregistrée en `ConnectionVisibility::Invisible` jusqu'au premier appui.
- ⚠️ **Piège WebKit décisif — appeler `navigator.getGamepads()` au moins une fois au démarrage.** WebKit maintient une liste de `Navigator` « aveugles » (`m_gamepadBlindNavigators` / `m_gamepadBlindDOMWindows`, <https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/gamepad/GamepadManager.cpp>) : tant qu'un `Navigator` n'a jamais interrogé les manettes, sa fenêtre **ne reçoit pas** `gamepadconnected`. Le commentaire du code est sans ambiguïté : *« If this Navigator hasn't seen gamepads yet then its Window should not get the disconnect event. »*
  → **Au démarrage, faire les deux** : poser l'écouteur `gamepadconnected` **et** appeler `navigator.getGamepads()` immédiatement. C'est la raison numéro un pour laquelle un jeu « marche sur Chrome et pas sur Safari ».
- ⚠️ **La page doit être au premier plan.** Sur iPadOS, la manette est routée vers le `WKContentView` qui est *first responder* de la fenêtre clé. Un onglet en arrière-plan ne reçoit rien.
- ⚠️ **Le Mode Isolement (Lockdown Mode) désactive la Gamepad API** — préréglage `GamepadsEnabled … disableInLockdownMode: true` (<https://github.com/WebKit/WebKit/blob/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml>). À détecter et à annoncer proprement plutôt qu'à subir.
- **Mapping sur iPadOS** : WebKit ne fait aucune table VID/PID, il délègue à GameController. La règle tient en une ligne — `if (m_gcController.get().extendedGamepad) m_mapping = standardGamepadMappingString();`. **Toute manette exposant un profil `GCExtendedGamepad` obtient `mapping === "standard"`** : Xbox, DualShock 4, DualSense, MFi « extended ». Les *micro gamepads* (télécommande Siri, MFi non-extended) tombent en `mapping === ""`.
- **Ne pas parser `Gamepad.id`** : WebKit le construit comme `vendorName + " Extended Gamepad"` (par exemple `"Xbox Wireless Controller Extended Gamepad"`), **sans VID/PID**, là où Chrome/Windows produit `"Xbox 360 Controller (XInput STANDARD …)"`. Aucun format portable.
- **Safari 18.0** a par ailleurs corrigé *« Gamepad API in WKWebView. (123310472) »* — utile si le jeu est un jour embarqué dans une app.
- **Notion de « focus manette » propre à iOS — piège majeur.** WebKit corrige dans **Safari 26.1 (3 novembre 2025)** : *« Fixed an issue on iOS 26 where pressing the B button on a gamepad could make a page appear to lose `gamepad` focus by bypassing the system's automatic navigation behavior. »* (<https://webkit.org/blog/17541/webkit-features-for-safari-26-1/>)
  Symptôme signalé par les utilisateurs sur iPadOS 26.0 : appuyer sur **B** éjecte la page, qui réaffiche un message « Tap to play » (<https://discussions.apple.com/thread/256188535>, <https://discussions.apple.com/thread/256141365>). La cause : iPadOS permet de naviguer dans les interfaces système à la manette, et s'arroge **B** comme « retour » (<https://developer.apple.com/design/human-interface-guidelines/inputs/game-controllers>).
  **Contournements** : (a) exiger iPadOS 26.1 ou plus, (b) **ne jamais binder une action vitale sur B** — B = « annuler / fermer un menu », jamais « frapper », (c) prévoir un écran de reprise de focus (« Appuie sur A pour reprendre ») plutôt que de supposer le flux continu.
- Un indice qu'un modèle de permission existe côté Apple : WebKit note pour **Safari 27 bêta (WWDC26)** *« Fixed an issue on visionOS where the `gamepadconnected` event did not fire unless gamepad permission had already been granted. »* (<https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/>) — visionOS seulement à ce stade, mais à surveiller. **[à tester sur appareil]**

### 1.4 Boucle d'entrée recommandée

- `gamepadconnected` / `gamepaddisconnected` sont de type `GamepadEvent` et se déclenchent sur **`window`**, seulement après le geste utilisateur, et seulement si le document est *fully active*. Les propriétés `ongamepadconnected` / `ongamepaddisconnected` n'existent que dans Chrome 143+ — utiliser `addEventListener`.
- **Sonder dans `requestAnimationFrame`**, comme la spec le demande explicitement : *« the gamepad data should be polled as closely as possible to immediately before the animation callbacks are executed, and with frequency matching that of the animation »* (<https://www.w3.org/TR/gamepad/>). Chrome échantillonne le matériel à **250 Hz** en interne (`kPollingIntervalMilliseconds = 4`) ; on lit donc à 60 Hz le dernier état d'un échantillonnage bien plus fin.
- **Ne jamais conserver une référence à un objet `Gamepad`, ni à ses tableaux `axes`/`buttons`.** Chrome double-buffe les objets et les échange, et met `axes`/`buttons` en cache sous forme de `FrozenArray` régénérés au changement d'état. Garder **`gamepad.index` comme clé stable**, et rappeler `navigator.getGamepads()[index]` à chaque image — c'est cet appel qui déclenche l'échantillonnage.
- Filtrer les `null`, comparer `Gamepad.timestamp` pour détecter une manette silencieuse.
- Appliquer une **zone morte radiale** (≈ 0,18–0,2) sur la norme du vecteur `(axes[0], axes[1])`, puis **rééchelonner** la magnitude restante sur `[0..1]` pour éviter la marche à la sortie de la zone morte. Une zone morte par axe produit une zone morte carrée et casse les diagonales. Ajouter une courbe de réponse douce — un enfant de 8 ans n'a pas la finesse d'un joueur adulte. Ne pas compter sur un repos exact à `0.0` : la dérive de stick n'est compensée par aucun des deux navigateurs.
- Pour mémoire, sans intérêt ici : Chrome expérimente depuis la version 149 (2 juin 2026) une **API événementielle** `rawgamepadinputchange` en *origin trial*, pour les jeux à très faible latence (<https://developer.chrome.com/release-notes/149>). Absente de Safari, inutile pour un tower defense.

### 1.5 Vibration : impossible sur iPad, disponible ailleurs

**La vibration manette est disponible sur Chrome (68+) et sur Safari macOS (16.4+), et pas du tout sur Safari iOS/iPadOS.** Ce n'est pas une lacune constatée, c'est une désactivation explicite dans le code WebKit :

```cpp
// Source/WebKit/Shared/WebPreferencesDefaultValues.cpp
bool defaultGamepadVibrationActuatorEnabled()
{
#if HAVE(WIDE_GAMECONTROLLER_SUPPORT) || ENABLE(WPE_PLATFORM) || PLATFORM(GTK)
    return true;
#else
    return false;
#endif
}
```

et, dans `Source/WTF/wtf/PlatformHave.h` :

```cpp
#if PLATFORM(MAC)
#define HAVE_WIDE_GAMECONTROLLER_SUPPORT 1
#endif
```

→ `HAVE(WIDE_GAMECONTROLLER_SUPPORT)` n'est défini **que pour macOS**. Sur iOS et iPadOS, le préréglage `GamepadVibrationActuatorEnabled` vaut `false` et **l'attribut `vibrationActuator` n'est même pas exposé sur l'objet `Gamepad`**. Tout le code de détection des localités haptiques dans `GameControllerGamepad.mm` est encadré par la même directive. (<https://github.com/WebKit/WebKit/blob/main/Source/WebKit/Shared/WebPreferencesDefaultValues.cpp>, <https://github.com/WebKit/WebKit/blob/main/Source/WTF/wtf/PlatformHave.h>, <https://github.com/WebKit/WebKit/blob/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml>)

Cela lève l'ambiguïté des notes de version : quand WebKit écrit, pour **Safari 17.0**, *« Safari 17.0 adds support for `Gamepad.prototype.vibrationActuator` … dual-rumble haptic feedback »* en listant macOS Sonoma, iOS 17 et iPadOS 17 (<https://webkit.org/blog/14445/webkit-features-in-safari-17-0/>), c'est la liste des plateformes de la **version de Safari**, pas celle des plateformes où la fonctionnalité est active. Les données de compatibilité MDN (`safari_ios: false`) et le code source disent la même chose.

`navigator.vibrate()` n'est pas une alternative : non supporté sur iOS, et il ferait vibrer l'iPad, pas la manette.

Sur PC, l'appel correct :

```js
pad.vibrationActuator?.playEffect?.('dual-rumble', {
  duration: 120, strongMagnitude: 0.6, weakMagnitude: 0.3
}).then(r => { /* "complete" | "preempted" | "not-supported" | "invalid-parameter" */ })
  .catch(() => {});
```

**Gérer `.then()` et `.catch()`** : Chrome *résout* la promesse avec `"not-supported"` / `"invalid-parameter"` là où la spec et MDN prévoient un rejet. La spec précise aussi que **les effets haptiques sont désactivés dès que `document.visibilityState` passe à `"hidden"`**.

→ **Décision de conception, ferme** : **le retour de jeu est visuel et sonore, jamais haptique.** Aucune information (« tu es touché », « une vague arrive », « le canon est prêt ») ne doit passer par la vibration, qui reste au mieux un agrément sur PC.

---

## 2. Tactile

### 2.1 Deux appuis simultanés : c'est garanti

**Touch Events** (W3C Recommendation, 10 octobre 2013 — <https://www.w3.org/TR/touch-events/>) :
- `touches` = *« a list of Touches for every point of contact currently touching the surface »* (tous les doigts) ; `targetTouches` = ceux qui ont commencé sur la cible de l'événement ; `changedTouches` = *« every point of contact which contributed to the event »*.
- `Touch.identifier` : *« When a touch point becomes active, it must be assigned an identifier that is distinct from any other active touch point. While the touch point remains active, all events that refer to it must assign it the same identifier. »* → **c'est la clé** pour distinguer « doigt joystick » et « doigt bouton ». Ne jamais se fier à l'index dans `touches`.
- **Point capital pour un joystick virtuel** : la cible d'un point de contact est *« The EventTarget on which the touch point started when it was first placed on the surface, **even if the touch point has since moved outside the interactive area of that element** »*. Le pouce peut déborder de la zone du joystick sans perdre le suivi.

**Pointer Events Level 3** (W3C Recommendation, 30 juin 2026 — <https://www.w3.org/TR/pointerevents3/>) :
- Chaque contact a son `pointerId` unique ; `isPrimary` désigne *« the first finger to touch the screen in a multi-touch interaction »*. Un événement = **un seul** pointeur → on gère le multi-touch avec un `Map<pointerId, état>`.
- **Capture implicite pour le tactile** — le point décisif : *« If the event is `pointerdown`, the associated device is a direct manipulation device, and the target is an Element, then set pointer capture for this pointerId to the target element as described in implicit pointer capture. »* Sur iPad, un doigt posé sur le joystick reste lié à cet élément même s'il glisse en dehors, **sans appeler `setPointerCapture`**. La capture est libérée automatiquement au `pointerup`/`pointercancel`.

**Support Safari** : Pointer Events depuis **Safari 13 / iOS 13 / iPadOS 13** — *« WebKit added support for Pointer Events to provide DOM events for generic, hardware-agnostic pointer input such as those generated by a mouse, touch, or stylus »* (<https://webkit.org/blog/9674/new-webkit-features-in-safari-13/>, 20 décembre 2019). `setPointerCapture`, `releasePointerCapture`, `pointercancel` : Safari 13+ (<https://github.com/mdn/browser-compat-data/blob/main/api/Element.json>).

Deux bugs WebKit historiques, tous deux corrigés :
- **199803** — `releasePointerCapture()` ne dispatchait pas les boundary events sur iOS. Corrigé r250182, vérifié **iOS 13.2** (<https://bugs.webkit.org/show_bug.cgi?id=199803>).
- **220196** — `setPointerCapture` **explicite** ne délivrait pas les événements hors des limites de l'élément sur iOS. Corrigé et livré dans **Safari 15.5** (<https://bugs.webkit.org/show_bug.cgi?id=220196>).

→ **Recommandation : n'utiliser que Pointer Events.** Même code sur iPad et sur PC, capture implicite gratuite, `pointerId` propre. **Ne pas écouter les deux familles en parallèle** : WebKit implémente Touch Events *et* Pointer Events sur iOS, et la spec Pointer Events refuse d'arbitrer (*« This specification does not provide any advice on the expected behavior of user agents that support both Touch Events and Pointer Events »*) — chaque appui serait compté deux fois.

### 2.2 Les événements souris de compatibilité

Apple documente la séquence synthétisée sur un tap : *« If the user taps a clickable element, events arrive in this order: `mouseover`, `mousemove`, `mousedown`, `mouseup`, and `click`. »* (<https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html>)

La spec Pointer Events précise : *« Only a primary pointer will produce compatibility mouse events »*, et on les supprime *« by canceling the `pointerdown` event (if the `isPrimary` property is true) »*, ce qui pose le drapeau `PREVENT MOUSE EVENT`. Seul le **premier** doigt produit des événements souris ; le deuxième pouce n'en produit jamais.

→ **Garde-fou pratique** : filtrer sur `event.pointerType === 'touch'` dans les gestionnaires de jeu. WebKit a eu un bug où des `pointerenter` en `pointerType = "mouse"` étaient émis en plus de ceux en `"touch"` sur des éléments focusables — corrigé, vérifié iOS 15.6.1 (<https://bugs.webkit.org/show_bug.cgi?id=214609>).

### 2.3 Neutraliser les gestes parasites du navigateur

| Nuisance | Remède | Support iOS | Source |
|---|---|---|---|
| Défilement, pan, pinch-zoom, double-tap zoom sur un élément | `touch-action: none` | **iOS 13+** (iOS 9.3–12.5 : seulement `auto` et `manipulation`) | <https://github.com/mdn/browser-compat-data/blob/main/css/properties/touch-action.json>, <https://bugs.webkit.org/show_bug.cgi?id=133112> |
| Double-tap zoom seul (en gardant le scroll) | `touch-action: manipulation` | iOS 9.3+ | <https://webkit.org/blog/5610/more-responsive-tapping-on-ios/> |
| Rebond élastique / chaînage de défilement | `overscroll-behavior: none` | Safari **16+** — mais **sans effet sur un conteneur sans overflow scrollable** | <https://github.com/mdn/browser-compat-data/blob/main/css/properties/overscroll-behavior.json>, <https://webkit.org/blog/13152/webkit-features-in-safari-16-0/> |
| Sélection de texte **et loupe iOS 15+** | `-webkit-user-select: none` (+ `user-select: none`) | oui ; correctif loupe livré en **iOS 15.2** | <https://bugs.webkit.org/show_bug.cgi?id=231161> |
| Menu « callout » d'appui long | `-webkit-touch-callout: none` | iOS 2+ (propriétaire WebKit) | <https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-touch-callout> |
| Halo gris au tap | `-webkit-tap-highlight-color: transparent` | iOS | <https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-tap-highlight-color> |
| Zoom pincé (ceinture-bretelles) | `gesturestart` / `gesturechange` / `gestureend` + `preventDefault()` | événements **propriétaires WebKit, iOS uniquement** | <https://developer.apple.com/documentation/webkitjs/gestureevent> |
| Hauteur de viewport instable (`100vh`) | `100dvh` / `100svh`, ou mieux `position: fixed; inset: 0` | Safari **15.4+** pour les unités | <https://github.com/Fyrd/caniuse/blob/main/features-json/viewport-unit-variants.json> |

Quatre précisions importantes :

1. **`user-scalable=no` et `maximum-scale=1` sont ignorés depuis iOS 10.** Dean Jackson (WebKit) : *« Safari on iOS 10 allows the user to pinch zoom on every page… Now, we ignore the `user-scalable`, `min-scale` and `max-scale` settings. »* (<https://webkit.org/blog/7367/new-interaction-behaviors-in-ios-10/>) ; confirmé par Apple : *« Pinch-to-zoom is always enabled for all users in Safari 10.0, and the viewport setting for user-scalable is ignored »* (<https://developer.apple.com/library/archive/releasenotes/General/WhatsNewInSafari/Articles/Safari_10_0.html>).
2. **La réponse officielle d'Apple pour bloquer le pinch-zoom est `touch-action`.** Sur le bug « A non-hacky way to prevent pinchzoom on iOS Safari », Timothy Hatcher répond : *« I believe the `touch-action` CSS property support in Safari on iOS 13 will let you do this on a per element basis. »* — bug clos le 15 juin 2019 (<https://bugs.webkit.org/show_bug.cgi?id=186970>).
3. **`overscroll-behavior` n'est pas la bonne arme pour un jeu plein écran.** Les données de compatibilité le marquent `partial_implementation` avec la note : *« The property has no effect on scroll containers that have no scrollable overflow. »* Or une page de jeu plein écran n'a par définition aucun overflow. La vraie parade est `position: fixed; inset: 0` + `overflow: hidden` + `touch-action: none`.
4. **`touch-action` ne bloque pas le repli/dépli des barres de Safari** (<https://bugs.webkit.org/show_bug.cgi?id=233417>). Seul le mode PWA `standalone` supprime ces barres.
5. **`touch-action: none` a un coût d'accessibilité** : MDN avertit que cela *« may inhibit operating system zooming capabilities, preventing people with low vision from reading page content »* (WCAG 2.0, critère 1.4.4). → le cantonner à la surface de jeu, pas au document entier, et laisser les menus textuels zoomables.

**Le délai de tap de ~350 ms** est supprimé dès qu'une de ces conditions est remplie : `touch-action: manipulation` (ou `none`) sur l'élément ou un ancêtre, ou un viewport `width=device-width` à l'échelle 1 (<https://webkit.org/blog/5610/more-responsive-tapping-on-ios/>, <https://webkit.org/blog/7367/new-interaction-behaviors-in-ios-10/>). De toute façon il n'a jamais affecté `pointerdown`/`touchstart`, seulement `click` — **un jeu qui lit `pointerdown` n'a jamais été concerné**.

### 2.4 Le piège des écouteurs passifs

Le standard DOM (§2.7 `EventTarget`, algorithme *default passive value*) impose : un écouteur est **passif par défaut** si le type est `touchstart`, `touchmove`, `wheel` ou `mousewheel` **et** que la cible est `Window`, le `Document`, l'élément racine ou l'élément `body` (<https://dom.spec.whatwg.org/>).

WebKit l'applique depuis **iOS 11.3 / Safari 11.1**. Dean Jackson, sur le bug de régression correspondant : *« This is now correct behaviour. **touchstart and touchmove event listeners on body, document and window are now passive by default, which means they cannot preventDefault.** »* — bug clos RESOLVED INVALID, c'est-à-dire volontaire (<https://bugs.webkit.org/show_bug.cgi?id=182521>, <https://bugs.webkit.org/show_bug.cgi?id=175346>).

Détails : `touchend` est **explicitement exclu** de la règle (*« cancelling touchend is important for suppressing click events »*). Pour `wheel`, WebKit applique la même règle sur les objets racine depuis **Safari 14.1** (<https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/>) — pertinent si un trackpad est branché sur l'iPad.

→ **Deux parades**, dans l'ordre de préférence :
1. **Attacher les écouteurs à l'élément de jeu**, pas à `document`/`window`/`body` : la règle passive-par-défaut ne s'y applique pas.
2. `{ passive: false }` explicite quand on a vraiment besoin de `preventDefault()`.

Mais surtout : **préférer `touch-action: none` en CSS**. C'est déclaratif, standard, et plus rapide — WebKit sait dès le hit-test qu'aucun geste système n'est en jeu, sans aller-retour vers le processus web.

### 2.5 Latence

- **iPad 9 et iPad 10 sont des dalles 60 Hz** (pas de ProMotion, réservé aux iPad Pro et Air série M). Budget : 16,6 ms par image, joystick compris. **[à tester sur appareil]** — Apple ne publie pas de taux d'échantillonnage tactile officiel.
- **Architecture recommandée** : les gestionnaires d'événements ne font qu'**écrire un état** (position des doigts) ; toute la lecture et la logique se font dans la boucle `requestAnimationFrame`. Des gestionnaires courts sont indispensables : sur des écouteurs non passifs, WebKit doit attendre le retour du processus web avant de faire échouer ses *gesture recognizers* (<https://bugs.webkit.org/show_bug.cgi?id=211521>).
- `preventDefault()` doit être **synchrone** dans le gestionnaire — dans un `setTimeout` ou après un `await`, il est sans effet (<https://bugs.webkit.org/show_bug.cgi?id=184250>).
- `PointerEvent.getCoalescedEvents()` / `getPredictedEvents()` : **Safari 18.2+** (<https://webkit.org/blog/16301/webkit-features-in-safari-18-2/>, <https://github.com/mdn/browser-compat-data/blob/main/api/PointerEvent.json>). Utiles pour un tracé fin (dessin, Apple Pencil), **inutiles pour un joystick** — on ne veut que la dernière position. Ne pas en faire une dépendance : absents avant 18.2.
- **La configuration la plus rapide** : `touch-action: none` en CSS + écouteurs **passifs** + aucun `preventDefault()`.
- **Le meta viewport n'est pas optionnel** : WebKit a connu des régressions de suppression d'événements tactiles sur les séquences rapides, *« particularly on non-responsive viewports lacking viewport metadata »* (<https://bugs.webkit.org/show_bug.cgi?id=211521>, corrigé r261480, 11 mai 2020).

### 2.6 Ce qui reste hors de portée

- **Les gestes système iPadOS ne sont pas bloquables depuis le web.** L'API qui permet de les différer — `preferredScreenEdgesDeferringSystemGestures` / `defersSystemGestures(on:)` — est **UIKit/SwiftUI uniquement** (<https://developer.apple.com/documentation/uikit/uiviewcontroller/2887512-preferredscreenedgesdeferringsys>, <https://developer.apple.com/documentation/swiftui/view/deferssystemgestures(on:)>). Aucun équivalent n'est exposé au contenu web ; ni `touch-action`, ni `preventDefault()`, ni le plein écran n'y changent rien. Et même en natif, l'API n'annule pas le geste : elle exige un second balayage.
  → **Contournement de conception** : garder les commandes tactiles **loin des bords**, en particulier du bord inférieur (indicateur d'accueil, Dock), du haut-droite (Centre de contrôle) et de la droite (Slide Over).
- **Nombre maximal de doigts** : **11 sur iPad** d'après le forum développeurs Apple (<https://developer.apple.com/forums/thread/17606>) — **non normatif**, Apple ne le publie pas dans ses specs. Pour deux pouces, aucune inquiétude.
- **`pointercancel` / `touchcancel`** : la spec Pointer Events donne la liste normative des déclencheurs — ouverture d'une boîte de dialogue modale ou d'un menu par l'UA, déconnexion du périphérique, pointeur utilisé pour manipuler le viewport, démarrage d'un glisser-déposer — et impose la séquence *« Fire a `pointercancel` event. Fire a `pointerout` event. Fire a `pointerleave` event. **Implicitly release the pointer capture.** »* Sur iPad, cela arrive concrètement quand un geste système prend la main, lors d'un passage en Split View, d'une notification, d'une rotation.
  → **Obligation absolue** : traiter `pointercancel` **exactement comme `pointerup`** — recentrer le joystick, relâcher les boutons, purger l'entrée de la `Map`. Sinon le joystick reste collé et le personnage court tout seul. **C'est le bug numéro un des jeux web sur iPad.**
- **Loupe de sélection** : le correctif qui fait que `-webkit-user-select: none` supprime la loupe iOS 15 a été livré en iOS 15.2, mais un commentaire de 2025 signale une possible régression suivie sous le bug 296492 (<https://bugs.webkit.org/show_bug.cgi?id=231161>). **[à tester sur iPadOS 26]**

### 2.7 Configuration de référence

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<!-- user-scalable=no / maximum-scale=1 : inutiles depuis iOS 10, ignorés -->
```

```css
html, body { margin: 0; height: 100%; overflow: hidden; overscroll-behavior: none; }
body { position: fixed; inset: 0; }
#jeu, #jeu * {
  touch-action: none;                    /* iOS 13+ : tue scroll, pinch, double-tap */
  -webkit-user-select: none; user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}
```

```js
// Une seule API : Pointer Events (iPadOS 13+).
// Écouteurs sur l'élément de jeu, PAS sur document/window (passifs par défaut depuis iOS 11.3).
const doigts = new Map();                        // pointerId -> { rôle, x, y }
jeu.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;         // ignore souris / trackpad / Pencil
  doigts.set(e.pointerId, attribuerRole(e));     // capture implicite : rien à faire
});
jeu.addEventListener('pointermove', e => { const s = doigts.get(e.pointerId); if (s) maj(s, e); });
const fin = e => { const s = doigts.get(e.pointerId); if (s) { relacher(s); doigts.delete(e.pointerId); } };
jeu.addEventListener('pointerup', fin);
jeu.addEventListener('pointercancel', fin);      // OBLIGATOIRE
// Ceinture-bretelles anti-zoom (API WebKit non standard, non concernée par la règle passive) :
['gesturestart', 'gesturechange', 'gestureend']
  .forEach(t => document.addEventListener(t, e => e.preventDefault()));
```

---

## 3. Plein écran, orientation, zones sûres, veille

### 3.1 API Fullscreen : disponible sur iPad, mais inadaptée au jeu

**Disponible depuis Safari 16.4 (27 mars 2023)**, non préfixée. Notes de version Apple : *« Added support for the unprefixed Fullscreen API on macOS and iPadOS. »* (<https://developer.apple.com/documentation/safari-release-notes/safari-16_4-release-notes>) ; WebKit : *« Safari 16.4 now supports the updated and unprefixed Fullscreen API on macOS and iPadOS. »* (<https://webkit.org/blog/13966/webkit-features-in-safari-16-4/>). La version préfixée `webkitRequestFullscreen` existe sur iPad depuis iOS 12.

**Toujours indisponible sur iPhone en août 2026** : le bug de suivi « Add Fullscreen API to iOS » (<https://bugs.webkit.org/show_bug.cgi?id=206854>, ouvert le 27 janvier 2020) est encore à l'état NEW, dernière mise à jour le 8 juin 2026. Et l'extension de `webkitEnterFullScreen()` aux éléments non-`<video>` a été **refusée (WONTFIX) le 25 janvier 2026** (<https://bugs.webkit.org/show_bug.cgi?id=212934>).

**Le défaut rédhibitoire.** Les données de compatibilité MDN portent, sur `Element.requestFullscreen` / `safari_ios` (16.4, `partial_implementation`) :

> « Only available on iPad, not on iPhone. »
> « **Shows an overlay button which can not be disabled. Swiping down exits fullscreen mode, making it unsuitable for some use cases like games.** »

(<https://github.com/mdn/browser-compat-data/blob/main/api/Element.json> ; même note côté caniuse — <https://github.com/Fyrd/caniuse/blob/main/features-json/fullscreen.json>)

C'est un comportement **voulu** : la spec Fullscreen (Living Standard, mise à jour du 17 juillet 2026 — <https://fullscreen.spec.whatwg.org/>) exige une **activation transitoire** et demande *« User agents should provide a means of exiting fullscreen that always works and advertise this to the user »*. Elle ajoute que l'UA *« may end any fullscreen session without a close request or call to `exitFullscreen()` whenever the user agent deems it necessary »*.

→ **Décisions** :
- **Ne pas bâtir l'expérience iPad sur l'API Fullscreen.** Passer par l'installation à l'écran d'accueil (§3.2).
- Sur PC (Chrome), `requestFullscreen()` n'a aucun de ces défauts : le garder là.
- Où qu'il soit utilisé : l'appeler **synchroniquement** dans un gestionnaire `pointerup`/`click` (jamais après un `await` ou dans un `setTimeout`), écouter `fullscreenchange`, et **traiter la sortie du plein écran comme un événement imposé de l'extérieur**.
- À noter pour le PC : **Safari 26.4 (24 mars 2026)** a ajouté la **Keyboard Lock API**, `element.requestFullscreen({ keyboardLock: "browser" })`, avec sortie par appui long de 1,5 s sur Échap (<https://webkit.org/blog/17862/webkit-features-for-safari-26-4/>). Sans clavier physique, aucun impact sur iPad 9/10.

### 3.2 PWA : la vraie voie du plein écran sur iPad

- **Le manifest est lu depuis Safari 11.1 / iOS 11.3 (2018)** : *« New in Safari 11.1—Web App Manifest »* (<https://developer.apple.com/library/archive/releasenotes/General/WhatsNewInSafari/Articles/Safari_11_1.html>). Depuis **Safari 15.4**, WebKit *« always fetches the manifest file during page load instead of when the user chooses to "Add to Home Screen" »* (<https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/>) — le manifest doit donc être servi et valide dès le chargement.
- **`standalone` et `fullscreen` déclenchent tous deux le mode web app.** WebKit, billet Safari 17 bêta : *« if the website has a manifest file with a `display` mode of `standalone` or `fullscreen`, it will open as a Home Screen web app »* (<https://webkit.org/blog/14205/news-from-wwdc23-webkit-features-in-safari-17-beta/>).
  **Nuance** : les données de compatibilité MDN marquent `display: fullscreen` comme non supporté sur Safari (<https://github.com/mdn/browser-compat-data/blob/main/manifests/webapp/display.json>), et **aucune source WebKit ou Apple ne documente une différence de rendu entre `standalone` et `fullscreen` sur iPadOS** — notamment, rien ne dit que `fullscreen` masquerait la barre d'état. **Ne pas compter dessus** ; utiliser `standalone`.
  `display_override` et `minimal-ui` : non supportés (<https://github.com/mdn/browser-compat-data/blob/main/manifests/webapp/display_override.json>).
- **Depuis iOS 26 / iPadOS 26 (Safari 26.0, 15 septembre 2025), le manifest n'est même plus nécessaire** : *« By default, every website added to the Home Screen opens as a web app »* et *« there are now zero requirements for "installability" in Safari »* (<https://webkit.org/blog/17333/webkit-features-in-safari-26-0/>). Notes Apple : *« Added support for any website to become a web app on iOS or iPadOS. (113034903) »* (<https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes>).
- **La barre d'état** se gère avec les balises Apple historiques (<https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html>) : `apple-mobile-web-app-capable=yes` (*« the web application runs in full-screen mode »*), et `apple-mobile-web-app-status-bar-style` — *« If set to `default` or `black`, the web content is displayed below the status bar. If set to `black-translucent`, the web content is displayed on the entire screen, partially obscured by the status bar. »* C'est le seul mécanisme documenté pour passer **sous** la barre d'état.
- **Détection à l'exécution** : `window.matchMedia('(display-mode: standalone)')`, et sur iOS le `window.navigator.standalone` documenté par Apple.
- **Attention : le contexte PWA est un environnement distinct**, avec ses propres régressions. La preuve : le Screen Wake Lock a fonctionné dans Safari dès 16.4 mais **pas** dans les web apps de l'écran d'accueil avant iOS/iPadOS 18.4 (§3.5). **[à tester sur appareil]** pour l'isolation du stockage (`localStorage`/IndexedDB) entre Safari et la PWA : aucune source primaire trouvée pour iPadOS — **supposer qu'ils sont distincts**.

→ **Décision** : le parcours iPad officiel est **« ouvrir dans Safari → Partager → Sur l'écran d'accueil → lancer depuis l'icône »**. Le cahier de conception doit décrire cet écran d'installation comme faisant partie du jeu (trois images pour un enfant de 8 ans, ou un geste que l'adulte fait une fois pour toutes).

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/manifest.webmanifest">
```

### 3.3 Orientation : aucun verrouillage possible

- **`screen.orientation.lock()` / `unlock()` : `version_added: false` pour Safari**, iOS/iPadOS compris. Seule la **lecture** est supportée, depuis Safari 16.4 : *« Added support for `ScreenOrientation.type`, `ScreenOrientation.angle`, and `ScreenOrientation.onchange` »* (<https://github.com/mdn/browser-compat-data/blob/main/api/ScreenOrientation.json>, <https://developer.apple.com/documentation/safari-release-notes/safari-16_4-release-notes>).
- Le verrouillage existe **derrière un drapeau expérimental** (Réglages → Safari → Avancé → Fonctionnalités expérimentales → *Screen Orientation API (Locking / Unlocking)*) — <https://webkit.org/blog/13966/webkit-features-in-safari-16-4/>. Un utilisateur final ne l'activera jamais.
- **Et même activé, ça échoue sur iPad.** Bug WebKit 257695 (RESOLVED WORKSFORME, 29 juillet 2024) : l'appel échoue avec *« Apps supporting multiple scenes (multitask) cannot lock their orientation »* (<https://bugs.webkit.org/show_bug.cgi?id=257695>). C'est une contrainte **UIKit** : Safari sur iPad est une application multi-scènes, elle ne *peut pas* verrouiller son orientation.
- La spec elle-même (W3C Working Draft, 6 août 2026 — <https://www.w3.org/TR/screen-orientation/>) impose de toute façon le plein écran : *« A user agent MUST restrict the use of `lock()` to simple fullscreen documents as a pre-lock condition. »*
- **Le membre `orientation` du manifest est également non supporté par Safari** (<https://github.com/mdn/browser-compat-data/blob/main/manifests/webapp/orientation.json>). Aucune note de version Safari ne l'annonce, alors que `id`, `display` et `icons` ont chacun eu leur mention explicite.

*(Note : caniuse marque la fonctionnalité « screen-orientation » comme supportée sur Safari 16.4+ — granularité trop grossière, elle ne distingue pas lecture et verrouillage. Les données MDN font foi ici.)*

→ **Décision de conception, non négociable** : **le jeu doit être jouable dans l'orientation où l'enfant tient l'iPad**. On peut lire `screen.orientation.type` / `.angle` et écouter `screen.orientation.addEventListener('change', …)` (ou une media query `(orientation: portrait)`) pour afficher un carton « Tourne ta tablette » et se mettre en pause — mais on ne peut rien imposer. Ne pas utiliser `window.orientation`, déprécié.
Corollaire : avec le multitâche iPadOS (Split View, Stage Manager, fenêtrage d'iPadOS 26), **la fenêtre peut prendre n'importe quelle proportion**. Concevoir le HUD en fonction du **ratio de la fenêtre**, jamais de l'orientation de l'appareil. **[à tester sur appareil]** — l'interaction précise Fullscreen API × Stage Manager n'est documentée nulle part.

### 3.4 Zones sûres et bords

- `env(safe-area-inset-top / right / bottom / left)` introduites avec **iOS 11** (<https://webkit.org/blog/7929/designing-websites-for-iphone-x/>, 22 septembre 2017). Elles ont d'abord porté le nom `constant()`, remplacé par `env()` dès iOS 11.2 — **utiliser `env()`**.
- **Elles ne valent quelque chose qu'avec `viewport-fit=cover`.** Par défaut `viewport-fit: auto` fait déjà le retrait, donc les insets valent 0 (<https://webkit.org/demos/safe-area-insets/2-viewport-fit.html>, <https://bugs.webkit.org/show_bug.cgi?id=272779>).
- Définition normative : CSS Environment Variables Level 1 (<https://drafts.csswg.org/css-env-1/>). Le second argument d'`env()` est un **fallback** — écrire toujours `env(safe-area-inset-bottom, 0px)`.
- Sur **iPad 9** (bouton d'accueil physique, pas d'encoche, pas d'indicateur de geste) : tous les insets valent vraisemblablement 0. Sur **iPad 10** (sans bouton d'accueil) : `safe-area-inset-bottom` est non nul (indicateur de geste d'accueil). **Aucune table de valeurs n'est publiée par Apple ou WebKit — [à tester sur appareil]**, et ne jamais coder de constante en dur.
- Unités de viewport dynamiques `svh` / `lvh` / `dvh` : **Safari et iOS Safari 15.4+** (<https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/>). Pour un canvas de jeu, **`position: fixed; inset: 0` reste plus robuste** que `100dvh` : WebKit corrigeait encore en Safari 26.0 un bug de dimensionnement de `lvh`/`vh` (<https://webkit.org/blog/17333/webkit-features-in-safari-26-0/>).
- `visualViewport` : Safari 13+, *« taking zooming and the onscreen keyboard into account »* (<https://webkit.org/blog/9674/new-webkit-features-in-safari-13/>). Utile si le jeu a un champ de saisie (pseudo du joueur).

→ **Règle de HUD** : les commandes tactiles vivent **à l'intérieur** de `env(safe-area-inset-*)` **plus une marge d'au moins 24–32 px**, pour ne pas concurrencer les gestes système. Le canvas de jeu, lui, peut s'étendre bord à bord — c'est exactement la recommandation WebKit : *« selectively apply padding to elements that contain important content »*.

### 3.5 Empêcher la mise en veille de l'écran

- **Screen Wake Lock disponible depuis Safari 16.4** : *« Added support for the Screen Wake Lock API »* (<https://developer.apple.com/documentation/safari-release-notes/safari-16_4-release-notes>, <https://webkit.org/blog/13966/webkit-features-in-safari-16-4/>).
- **Piège majeur : cassé en PWA écran d'accueil jusqu'à iOS/iPadOS 18.4.** Les données MDN portent, pour la plage 16.4 → 18.4 : *« Does not work in standalone Home Screen Web Apps. See bug 254545 »*. Confirmé par WebKit : *« The Screen Wake Lock API now also works in Home Screen Web Apps on iOS and iPadOS 18.4 »* (<https://webkit.org/blog/16574/webkit-features-in-safari-18-4/>, 31 mars 2025 ; <https://bugs.webkit.org/show_bug.cgi?id=254545>).
  → C'est-à-dire : **exactement dans le mode d'affichage recommandé (§3.2), le verrou de veille était cassé avant iPadOS 18.4.**
- Contraintes de la spec (W3C Working Draft, 24 octobre 2024 — <https://www.w3.org/TR/screen-wake-lock/>) : **contexte sécurisé (HTTPS)** obligatoire ; rejet en `NotAllowedError` si le document n'est pas *fully active* ou si sa visibilité est `hidden` ; **libération automatique dès que la page devient masquée** (*« When a Document becomes no longer fully active, the user agent must release any active wake locks »*). L'UA peut aussi relâcher pour batterie faible ou mode économie d'énergie. La spec n'exige **pas** d'activation transitoire.
- WebKit a dû corriger un *« Wake Lock permission denied after `visibilitychange` »* en **Safari 17.0** (<https://webkit.org/blog/14445/webkit-features-in-safari-17-0/>).

```js
let verrou = null;
async function acquerir() {
  try {
    verrou = await navigator.wakeLock.request('screen');
    verrou.addEventListener('release', () => { verrou = null; });
  } catch (e) { /* NotAllowedError : batterie faible, mode éco, page cachée */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && verrou === null) acquerir();
});
```

**Ne pas tenter les contournements** (vidéo muette 1×1 en boucle, `AudioContext` silencieux) : ils ne sont documentés nulle part comme gardant l'écran allumé sur iOS moderne, et consomment de la batterie. Exiger simplement iPadOS 16.4+ en onglet, 18.4+ en PWA.

---

## 4. Cycle de vie : ce qui casse une partie en cours

| Événement | Safari iOS/iPadOS | Source |
|---|---|---|
| `document.hidden` / `visibilityState` | Supporté (Safari 7+) | <https://github.com/mdn/browser-compat-data/blob/main/api/Document.json> |
| `visibilitychange` | Supporté ; ne bullait pas avant Safari 14 | idem |
| `pagehide` / `pageshow` (+ `persisted`) | Supporté | <https://github.com/mdn/browser-compat-data/blob/main/api/Window.json> |
| `beforeunload` | **Non supporté** (<https://webkit.org/b/219102>) | idem |
| `freeze` / `resume` (Page Lifecycle) | **Non supporté** | <https://github.com/mdn/browser-compat-data/blob/main/api/Document.json> |
| `document.wasDiscarded` | **Non supporté** | idem |

**Les cinq faits qui comptent :**

1. **`visibilitychange` ne se déclenche pas lors d'une navigation sortante** sur WebKit — la note MDN est explicite : *« Doesn't fire the `visibilitychange` event when navigating away from a document, so also include code to check for the `pagehide` event »* (bugs WebKit 116769, 151234, 151610, 194897). → **Écouter les deux.**
2. **Pas de `beforeunload` sur iOS** : impossible d'afficher « Es-tu sûr de vouloir quitter ? ».
3. **Pas de `freeze` / `resume` / `wasDiscarded`** : on ne peut pas distinguer « l'onglet a été purgé par Safari sous pression mémoire » d'« un démarrage normal ». Aucune documentation Apple ne décrit le déchargement d'onglets sous pression mémoire. → **La seule défense : sauvegarder l'état de partie en continu** (à chaque fin de vague, à chaque `visibilitychange` vers `hidden`, à chaque `pagehide`) dans `localStorage`/IndexedDB, et proposer une reprise au démarrage. Non négociable pour un jeu sur iPad.
4. **`requestAnimationFrame` s'arrête en arrière-plan, par conception.** Le standard HTML, dans *update the rendering*, retire des documents à rendre ceux dont *« visibility state is "hidden" »*, et précise qu'un navigable non visible peut tomber à *« 4 rendering opportunities per second, or even less »* (<https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model>).
   → **Obligation** : mettre le jeu **en pause explicite** sur `document.hidden === true`, piloter la simulation par le `timestamp` de `rAF`, et **borner le pas de temps** (`dt = Math.min(dt, 100)`), sinon le retour d'arrière-plan téléporte tous les zombies dans la mairie.
5. **Le back/forward cache de WebKit s'appelle le « Page Cache »**, et `pageshow`/`pagehide` portent une propriété `persisted` qui distingue restauration et chargement neuf (<https://webkit.org/blog/516/webkit-page-cache-ii-the-unload-event/>). **Ne jamais ajouter de gestionnaire `unload`** : cela désactive le Page Cache (*« Don't cache these pages »*, <https://webkit.org/blog/427/webkit-page-cache-i-the-basics/>).

```js
window.addEventListener('pagehide', (e) => {
  sauvegarder(); mettreEnPause(); suspendreAudio();
  // e.persisted === true  → page gelée dans le Page Cache, la mémoire JS survit
  // e.persisted === false → page réellement détruite
});
window.addEventListener('pageshow', (e) => {
  if (e.persisted) { reacquerirVerrouVeille(); reprendreAudio(); }
  else { restaurerDepuisStockage(); }
});
```

**Ce qui se passe concrètement** (comportements cohérents avec les specs, non documentés en tant que tels par Apple) :

| Action | Événements | Effets |
|---|---|---|
| Bascule vers une autre app | `visibilitychange` → `hidden` | rAF stoppé, verrou de veille relâché, `AudioContext` suspendu |
| Verrouillage de l'écran | `visibilitychange` → `hidden` | idem |
| Passage en Split View / Stage Manager | `resize` + `visualViewport.resize` | pas forcément de `visibilitychange` — le jeu doit se re-disposer |
| Geste système (bascule d'app) | `visibilitychange` → `hidden` puis `visible` | idem |
| Navigation arrière/avant | `pagehide` (+ `persisted`) puis `pageshow` | pas de `visibilitychange` fiable |
| Purge mémoire | rien, puis rechargement complet | état perdu si non persisté |

Sur iPadOS 26.0, ajouter à cette liste la **perte de focus manette** au bouton B (§1.3).

---

## 5. Son

### 5.1 Déblocage par geste utilisateur

- **L'`AudioContext` naît suspendu.** Web Audio API 1.1 (W3C First Public Working Draft, 5 novembre 2024 — <https://www.w3.org/TR/webaudio-1.1/>) : *« Set a [[control thread state]] to "suspended" on context »* ; *« An AudioContext is said to be allowed to start if the user agent allows the context state to transition from "suspended" to "running" »* ; et surtout *« A user agent may disallow this initial transition, and to allow it only when the AudioContext's relevant global object has **sticky activation**. »*
- Politique média WebKit (<https://webkit.org/blog/6784/new-video-policies-for-ios/>, 25 juillet 2016) : le geste valide est celui qui *« directly resulted from a handler for a `touchend`, `click`, `doubleclick`, or `keydown` event »*. Autoplay toléré seulement pour les médias sans piste audio ou coupés ; *« if a `<video>` element gains an audio track or becomes un-muted without a user gesture, playback will pause »*.
- Politique macOS (<https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/>, 8 juin 2017) : *« Websites should assume any use of `<video>` or `<audio>` requires a user gesture click to play »*, et il faut regarder la promesse renvoyée par `play()` pour détecter un rejet. Les utilisateurs peuvent régler cela par site (sur iPadOS : menu **aA** de la barre d'adresse → Réglages du site web).

```js
const ctx = new AudioContext();   // 'suspended' sur iOS
boutonJouer.addEventListener('pointerup', () => {
  ctx.resume();
  const b = ctx.createBufferSource();           // certains contenus exigent un premier son
  b.buffer = ctx.createBuffer(1, 1, 22050);     // joué dans le geste lui-même
  b.connect(ctx.destination); b.start(0);
}, { once: true });
```

Appelé **synchroniquement**, avant tout `await`.

### 5.2 Le mode silencieux coupe le Web Audio — et comment y échapper

C'est documenté par WebKit (bug 237322, *« webaudio api is muted when the iOS ringer is muted »*, RESOLVED/CONFIGURATION CHANGED — <https://bugs.webkit.org/show_bug.cgi?id=237322>). Jean-Yves Avenard, ingénieur WebKit :

> « By default the type is **`ambient`** and so audio will be muted if the phone is muted. »
> « Add in your code something like **`navigator.audioSession.type = "playback"`** and audio will not be suspended. »

Asymétrie clé : `<audio>` / `<video>` passent par le canal média (non coupé par le silencieux), tandis que **Web Audio utilise par défaut le canal `ambient`** (coupé). `navigator.audioSession` est disponible depuis **iOS 17**.

```js
if ('audioSession' in navigator) navigator.audioSession.type = 'playback';
```

Les iPad 9 et 10 n'ont pas de commutateur silencieux physique (supprimé depuis l'iPad Air 2), mais le mode silencieux logiciel du Centre de contrôle produit le même effet. **[à tester sur appareil]**

### 5.3 Suspension en arrière-plan

L'`AudioContext` est suspendu quand la page passe en arrière-plan sur iOS/iPadOS, et la reprise automatique n'est pas fiable — trois bugs WebKit le documentent : <https://bugs.webkit.org/show_bug.cgi?id=237878>, <https://bugs.webkit.org/show_bug.cgi?id=261554> (*« AudioContext is getting suspended when page goes in the background even if `navigator.audioSession.type` is set to playback »*), <https://bugs.webkit.org/show_bug.cgi?id=263627> (*« AudioContext is not consistently resumed when page is brought to foreground »*).

```js
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && ctx.state === 'suspended') ctx.resume();
});
```

**Dans tous les cas** : prévoir un **retour visuel redondant** de chaque information sonore. Le jeu doit rester jouable sans son.

---

## 6. Récapitulatif des pièges et de leurs contournements

| # | Piège | Où | Contournement |
|---|---|---|---|
| 1 | Manette invisible tant qu'aucun bouton n'a été pressé (anti-empreinte, exigé par la spec) | Partout | Écran « Appuie sur un bouton pour commencer » ; ne jamais présumer d'une manette connectée |
| 2 | **Safari n'émet jamais `gamepadconnected` si `getGamepads()` n'a pas été appelé au moins une fois** (`Navigator` « aveugle ») | iPad | Au démarrage : poser l'écouteur **et** appeler `navigator.getGamepads()` |
| 3 | Le bouton **B** est capté par la navigation système iPadOS 26.0 → la page perd le focus manette | iPadOS 26.0 | Corrigé en Safari 26.1 ; exiger 26.1+, ne pas binder d'action vitale sur B, prévoir un écran de reprise de focus |
| 4 | `getGamepads()` : objets recyclés/double-bufferisés, `axes`/`buttons` en tableaux gelés, tableau creux, `index` réutilisé après déconnexion | Partout | Relire `navigator.getGamepads()[index]` à chaque `rAF`, ne garder que l'`index`, filtrer les `null` |
| 5 | `buttons.length` n'est pas 17 : **16** possible sur iPadOS (pas de bouton Home), **18** sur Chrome (pavé tactile DualSense, Share Series X) | Partout | Tester `buttons[i]?.pressed`, jamais la longueur |
| 6 | **Vibration manette impossible sur iPad** : désactivée au niveau du runtime WebKit (macOS uniquement) | iPad | Retour visuel et sonore uniquement ; `vibrationActuator?.playEffect?.()` avec `.then()` **et** `.catch()` sur PC |
| 7 | La page doit être au premier plan ; le Mode Isolement désactive la Gamepad API | iPad | Pause sur `visibilitychange`/`blur` ; message explicite si l'API est absente |
| 8 | Permissions Policy `gamepad` : `getGamepads()` **lève un `SecurityError`** en iframe cross-origin | Portails de jeux | Servir le jeu en pleine page, ou exiger `allow="gamepad; fullscreen"` |
| 9 | Aucune zone morte native ; le stick au repos dérive | Partout | Zone morte **radiale** (≈ 0,2) avec rééchelonnage + courbe de réponse douce |
| 10 | `Gamepad.id` n'a aucun format portable (`"… Extended Gamepad"` sur Safari, `"… (XInput STANDARD …)"` sur Chrome) | Partout | Ne jamais parser `id` ; se fier à `mapping === "standard"` |
| 11 | Le plein écran Safari sur iPad affiche un bouton non masquable et se quitte d'un balayage vers le bas | iPad | Ne pas s'appuyer dessus ; passer par l'installation à l'écran d'accueil (`standalone`) |
| 12 | **Verrouillage d'orientation impossible** (API derrière un drapeau *et* refusé sur app multi-scènes ; manifest non supporté) | iPad | HUD adaptatif aux deux orientations + carton « Tourne ta tablette » ; concevoir sur le ratio de fenêtre |
| 13 | `user-scalable=no` / `maximum-scale=1` ignorés depuis iOS 10 | iPad | `touch-action: none` (réponse officielle Apple) + `gesturestart` en secours |
| 14 | `preventDefault()` ignoré sur `touchstart`/`touchmove` (et `wheel` dès 14.1) attachés à `window`/`document`/`body`/racine | Partout | Attacher les écouteurs à l'élément de jeu ; `touch-action: none` en CSS ; `{ passive: false }` en dernier recours |
| 15 | `overscroll-behavior: none` **sans effet** sur un conteneur sans overflow scrollable | Jeu plein écran | `position: fixed; inset: 0` + `overflow: hidden` + `touch-action: none` |
| 16 | Le premier doigt émet aussi `mousedown`/`click` → double déclenchement | Partout | Tout en Pointer Events ; filtrer `pointerType === 'touch'` ; annuler le `pointerdown` primaire |
| 17 | `pointercancel` / `touchcancel` non traité → joystick collé, personnage qui court seul | Partout | Traiter `pointercancel` comme `pointerup`, systématiquement |
| 18 | Gestes système iPadOS non bloquables depuis le web (API réservée à UIKit) | iPad | Commandes tactiles loin des bords, à l'intérieur des `safe-area-inset` + marge de 24–32 px |
| 19 | Screen Wake Lock cassé dans les web apps installées avant iPadOS 18.4 | iPad 16.4–18.3 | Détecter l'échec sans planter ; cibler ≥ iPadOS 18.4 |
| 20 | Le verrou de veille est relâché à chaque passage en arrière-plan (spec) | Partout | Ré-acquérir sur `visibilitychange` |
| 21 | **Pas de `beforeunload`, pas de `freeze`/`resume`, pas de `wasDiscarded`** : la partie peut disparaître sans préavis | iPad | Sauvegarde continue + reprise automatique |
| 22 | `visibilitychange` ne part pas lors d'une navigation sortante sur WebKit | iPad | Écouter aussi `pagehide` |
| 23 | Un gestionnaire `unload` désactive le Page Cache de WebKit | Partout | Ne jamais en poser ; utiliser `pagehide` |
| 24 | Retour d'arrière-plan → `dt` énorme → simulation qui explose | Partout | Borner le pas de temps, pause explicite sur `document.hidden` |
| 25 | `AudioContext` suspendu au chargement **et** après chaque arrière-plan (reprise auto non fiable) | Partout | `resume()` dans un geste utilisateur, puis `resume()` défensif à chaque retour de visibilité |
| 26 | Le **mode silencieux coupe le Web Audio** (canal `ambient` par défaut) | iPad | `navigator.audioSession.type = 'playback'` (iOS 17+) ; retour visuel redondant |
| 27 | `100vh` instable sur iOS | iPad | `100svh`/`100dvh` (Safari 15.4+), ou mieux `position: fixed; inset: 0` |
| 28 | Absence de meta viewport → régressions de suppression d'événements tactiles | iPad | `width=device-width, initial-scale=1, viewport-fit=cover` obligatoire |

---

## 7. Ce que cette recherche impose à la conception

1. **Pas de plein écran « API » sur iPad.** L'expérience iPad de référence est une **PWA installée à l'écran d'accueil**. L'écran d'installation fait partie du jeu.
2. **Le jeu doit tolérer toutes les orientations et tous les ratios de fenêtre.** Aucun verrouillage n'existe, et le multitâche iPadOS peut donner n'importe quelle taille. Le HUD (joystick, boutons, jauges, compteur de vagues) doit être décrit en zones relatives, jamais en positions fixes paysage.
3. **Toutes les commandes tactiles vivent loin des bords**, à l'intérieur des zones sûres plus une marge. Les gestes système sont intouchables.
4. **La reprise est un état de premier ordre**, pas un détail technique : perte de focus manette, retour d'arrière-plan, purge d'onglet, `pointercancel`. Le jeu doit avoir un écran « Reprendre » et une sauvegarde continue par vague.
5. **Le retour de jeu est visuel et sonore, jamais haptique**, et **le son n'est jamais le seul porteur d'une information** — la vibration manette est impossible sur iPad, et le mode silencieux peut couper le Web Audio.
6. **L'écran « Appuie sur un bouton » n'est pas décoratif** : c'est la condition normative d'apparition de la manette, sur Chrome comme sur Safari, y compris pour une manette déjà appairée. Il sert aussi à débloquer l'audio et le plein écran d'un seul geste.
7. **Prérequis à écrire noir sur blanc dans le cahier** :
   - iPadOS **16.4** minimum (Fullscreen non préfixé, Wake Lock, lecture de l'orientation, `touch-action` complet) ;
   - iPadOS **18.4** recommandé (Wake Lock en web app installée) ;
   - iPadOS **26.1** si manette sur iPad (bouton B).
8. **Une seule API d'entrée tactile : Pointer Events.** Une seule boucle : `requestAnimationFrame`. Les gestionnaires d'événements écrivent un état, ils ne décident de rien. Et au démarrage, sur Safari, un `navigator.getGamepads()` d'amorçage obligatoire.

---

## 8. Points restés ouverts, à valider sur appareil réel

- Un appui bouton manette compte-t-il comme activation utilisateur dans Safari iPadOS (débloquant `AudioContext.resume()` et `requestFullscreen()`) ? Le code WebKit crée bien un `UserGestureIndicator` au dispatch des événements manette, mais le comportement de bout en bout n'a pas pu être vérifié sur pièces. C'est vérifié et documenté pour Chrome.
- Valeurs exactes de `safe-area-inset-*` sur iPad 9 vs iPad 10, en Safari vs en mode `standalone` — aucune table publiée par Apple.
- Interaction Fullscreen API × Stage Manager / fenêtrage iPadOS 26 — non documentée.
- Isolation exacte du stockage entre Safari et la PWA écran d'accueil sur iPadOS.
- Comportement du déchargement d'onglet sous pression mémoire — aucune documentation.
- Régression éventuelle de la loupe de sélection sur iPadOS 26 (bug WebKit 296492).
- Effet du mode silencieux logiciel sur le Web Audio d'un iPad 9/10 (pas de commutateur physique).
- Latence bout-en-bout doigt → réaction à l'écran sur iPad 9 (60 Hz), à mesurer sur le prototype de déplacement.
- Nombre maximal de points de contact retenus par Safari sur iPad (11 selon un fil du forum Apple, non normatif).

---

*Recherche menée le 15 août 2026 contre les sources primaires listées.*
*Spécifications de référence : W3C Gamepad (WD 2025-07-10), Touch Events (REC 2013-10-10), Pointer Events 3 (REC 2026-06-30), Fullscreen (Living Standard 2026-07-17), Screen Orientation (WD 2026-08-06), Screen Wake Lock (WD 2024-10-24), Web App Manifest (WD 2026-08-13), Web Audio 1.1 (FPWD 2024-11-05), DOM et HTML Living Standards, CSS Environment Variables L1.*
*WebKit : Safari 10.1, 11.1, 13, 14.1, 15.4, 15.5, 16.0, 16.4, 17.0, 18.0, 18.2, 18.4, 26.0, 26.1, 26.4, 26.6, 27 bêta. Chrome : 103, 126, 143, 149, 151.*
*Code source consulté le 15 août 2026 : WebKit (`main`) et Chromium (`main`).*
