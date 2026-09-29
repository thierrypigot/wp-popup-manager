=== WP Popup Manager ===
Contributors: wearewp
Tags: popup, modal, gutenberg, accessible, interactivity-api
Requires at least: 6.6
Tested up to: 7.0
Requires PHP: 8.1
Stable tag: 1.2.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Gestionnaire de popups accessibles, intégré nativement à Gutenberg — conforme RGAA/WCAG 2.2 AA, éco-conçu (RGESN), propulsé par l'Interactivity API.

== Description ==

WP Popup Manager est une extension WordPress de gestion de popups conçue de A à Z pour l'écosystème WordPress moderne :

= Intégration Gutenberg complète =

- Créez le contenu de vos popups avec n'importe quel bloc Gutenberg natif
- Configurez les déclencheurs, conditions et apparence via les panneaux de la barre latérale
- Le bloc déclencheur utilise le bouton natif core/button pour un contrôle total du style
- Pas de constructeur propriétaire — vos popups sont du contenu WordPress standard

= Accessibilité avant tout (RGAA / WCAG 2.2 AA) =

- Patron WAI-ARIA dialog/alertdialog intégralement implémenté
- Piège au focus (Tab/Shift+Tab confiné à la popup)
- Restauration du focus à la fermeture
- Touche Échap ferme la popup
- aria-modal, aria-labelledby, inert sur le contenu en arrière-plan
- prefers-reduced-motion respecté
- Région live annonce la popup aux lecteurs d'écran
- Bouton de fermeture 44x44px minimum (cible tactile)

= Éco-conception (RGESN) =

- Zéro impact si aucune popup n'est active : aucun JS, CSS ou HTML injecté
- Budget JS : moins de 3 Ko gzip (store Interactivity API)
- Budget CSS : moins de 1,5 Ko gzip
- Aucune requête réseau à l'exécution (données inlinées via le contexte Interactivity API)
- Aucune dépendance externe, aucune bibliothèque tierce

= Architecture server-first =

- HTML rendu côté serveur (PHP)
- WordPress Interactivity API pour l'hydratation déclarative
- Compatible WordPress 7

== Installation ==

1. Uploadez le dossier `wp-popup-manager` dans `/wp-content/plugins/`
2. Activez l'extension dans le menu Extensions
3. Rendez-vous dans Popups > Ajouter pour créer votre première popup

== Utilisation ==

1. Créez une nouvelle popup (Popups > Ajouter)
2. Ajoutez du contenu avec des blocs Gutenberg
3. Configurez le déclencheur dans la barre latérale (clic, chargement de page, défilement, section atteinte, exit intent, inactivité)
4. Définissez les conditions d'affichage (pages, types de contenu, plage de dates, heure, rôle utilisateur, appareil, référent)
5. Choisissez l'apparence (animation, grille de position, taille, overlay avec pipette de couleur)
6. Définissez la fréquence (à chaque visite, une fois par session, une fois par jour, une seule fois)
7. Activez optionnellement les analytics (suivi des impressions et fermetures via Beacon API)
8. Publiez

Pour les popups déclenchées au clic, insérez un bloc **Popup Trigger** dans n'importe quelle page ou article. Le déclencheur utilise un bouton natif core/button pour un contrôle total du style.

== Fonctionnalités ==

= Déclencheurs (exclusifs) =
- Clic (bloc bouton déclencheur)
- Chargement de page (délai configurable)
- Profondeur de défilement (seuil en % configurable, délai d'ouverture en millisecondes)
- Section atteinte (ancre HTML d'un bloc, délai d'ouverture en millisecondes). La popup n'est chargée que sur les pages où l'ancre est rendue
- Exit intent (souris quitte la fenêtre)
- Inactivité (délai configurable)

= Conditions d'affichage (logique ET) =
- Pages spécifiques (inclure/exclure par recherche de titre)
- Types de contenu (article, page, produit...)
- Plage de dates avec heure de début/fin
- Heure de la journée (récurrent quotidien, supporte les plages nocturnes)
- Rôle utilisateur (inclure/exclure, supporte logged_out)
- Type d'appareil (bureau, mobile, tablette)
- Motif d'URL référent

= Apparence =
- Animations : fondu, slide-up, scale, aucune
- Grille de 9 positions + plein écran
- Tailles : petite (400px), moyenne (600px), grande (800px)
- Overlay avec pipette de couleur et canal alpha
- Fermeture au clic sur l'overlay (configurable)
- Fermeture à la touche Échap (configurable)

= Personnalisation du cadre =

Le cadre de la popup (fond, couleur du texte, marges intérieures, rayon, ombre) se pilote nativement depuis Gutenberg, à trois niveaux.

**1. Par popup** — sélectionnez le bloc **Popup** dans l'éditeur de la popup et utilisez les réglages de la barre latérale du bloc (Couleurs, Dimensions, Bordure, Ombre). L'aperçu dans l'éditeur est identique au rendu au front.

**2. Styles globaux** — Éditeur de site > Styles > Blocs > Popup. Les valeurs définies là s'appliquent à toutes les popups du site.

**3. theme.json** — un thème peut définir le cadre par défaut :

`
{
	"version": 3,
	"styles": {
		"blocks": {
			"popup-manager/popup": {
				"color": { "background": "#111111", "text": "#ffffff" },
				"spacing": { "padding": { "top": "3rem", "right": "3rem", "bottom": "3rem", "left": "3rem" } },
				"border": { "radius": "0px" }
			}
		}
	}
}
`

= Variations de style =

Deux variations sont disponibles dans l'onglet Styles du bloc Popup :

- **Cadre** (par défaut) — fond blanc, marges de 2rem, rayon de 8px, ombre portée
- **Sans cadre** — fond transparent, aucune marge, aucune ombre : le contenu occupe toute la popup, bord à bord. Le bouton de fermeture se place **au-dessus du cadre** et ne masque donc rien du contenu. Utile pour un formulaire tiers embarqué (Brevo, Mailchimp) ou une image pleine largeur.

= Propriétés personnalisées CSS =

Le cadre s'appuie sur des variables CSS, surchargeables depuis un thème enfant ou la CSS additionnelle :

- `--pm-dialog-bg` — fond de la popup (défaut : `#fff`)
- `--pm-dialog-color` — couleur du texte (défaut : `#1e1e1e`)
- `--pm-dialog-padding` — marges intérieures (défaut : `2rem`)
- `--pm-dialog-radius` — rayon des angles (défaut : `8px`)
- `--pm-dialog-shadow` — ombre portée (défaut : `0 4px 24px rgba(0, 0, 0, 0.15)`)
- `--pm-content-offset` — espace réservé en haut pour le bouton de fermeture (défaut : `3.5rem`, soit son décalage de 0.75rem plus sa hauteur de 2.75rem). Mis à `0` en « Sans cadre », où le bouton passe au-dessus du cadre, et en plein écran, où il est fixé au coin de la fenêtre
- `--pm-fullscreen-inset` — marges du contenu en plein écran (défaut : `2rem`)
- `--pm-fade` — hauteur du fondu de défilement en bas du contenu (défaut : `3rem` quand il reste du contenu, `0px` en bas de liste)

Le bouton de fermeture conserve son propre fond et sa propre couleur quelle que soit la variation, afin de garantir un contraste minimum de 4,5:1 et une cible tactile de 44 px.

Les popups créées avant la version 1.1.0 n'ont pas de bloc Popup à la racine : elles s'affichent exactement comme avant. Pour les rendre personnalisables, ouvrez la popup et cliquez sur **Personnaliser le cadre** dans le panneau Apparence de la barre latérale. L'action est annulable avec Ctrl+Z.

= Fréquence =
- À chaque visite
- Une fois par session (sessionStorage)
- Une fois par jour (localStorage avec expiration 24h)
- Une seule fois (localStorage permanent)

= Analytics (opt-in) =
- Désactivé par défaut (conformité RGESN)
- Suit les impressions et fermetures par popup
- Requête HTTP unique via Beacon API au pagehide
- Données stockées en post meta

= Réglages globaux =
- Animation, position et fréquence par défaut
- Classes CSS personnalisées
- Page d'administration React

== Changelog ==

= 1.2.0 =
* Nouveau déclencheur « Section atteinte » : la popup s'ouvre quand la section portant l'ancre HTML choisie arrive à 70 % de la hauteur de l'écran. Si la section est déjà visible au chargement (page courte, lien vers l'ancre), la popup attend le premier défilement
* La popup n'est chargée que sur les pages où l'ancre est réellement rendue : sans l'ancre, aucun HTML, script ni style n'est ajouté. Une ancre présente uniquement dans le contenu d'une popup n'est pas prise en compte
* Délai d'ouverture en millisecondes (0 à 10 000) pour les déclencheurs « Section atteinte » et « Profondeur de défilement »

= 1.1.1 =
* Correctif : le bouton de fermeture ne recouvrait plus seulement le contenu en « Sans cadre », mais dès que la popup avait un padding inférieur à 1,5rem. Le bouton est positionné depuis le dialog et la réserve depuis le contenu : la réserve doit donc couvrir seule tout son encombrement, elle passe de 2rem à 3,5rem
* Correctif : en « Sans cadre », le bouton de fermeture se place au-dessus du cadre pour ne rien masquer du contenu bord à bord. Le cadre cède 4rem de hauteur afin que le bouton reste dans la fenêtre quelle que soit la position. Le plein écran est inchangé, son bouton étant fixé au coin de la fenêtre
* Correctif : `box-sizing: border-box` forcé sur le dialog et son contenu. Il n'était posé que sur le plein écran, ailleurs le plugin comptait sur le thème. Quand le thème ne le fait pas, `max-height` s'applique à la boîte de contenu et la popup dépasse la fenêtre de la valeur de son propre padding, d'où une barre de défilement sur la page

= 1.1.0 =
* Cadre de la popup pilotable depuis Gutenberg : fond, couleur du texte, marges intérieures, rayon et ombre réglables sur le bloc Popup, dans les styles globaux (Styles > Blocs > Popup) et dans le `theme.json` d'un thème
* Variations de style « Cadre » (par défaut) et « Sans cadre » (contenu bord à bord, pour les formulaires tiers embarqués)
* Aperçu dans l'éditeur fidèle au rendu au front (mêmes styles, même largeur selon la taille choisie)
* Bouton « Personnaliser le cadre » pour encapsuler une popup existante dans le bloc Popup, sans migration automatique en base
* Défilement : c'est désormais le contenu qui défile à l'intérieur du cadre, et non plus la popup entière. Le bouton de fermeture reste visible pendant le défilement et la barre de défilement ne chevauche plus les angles arrondis ni l'ombre
* Défilement : un fondu en bas du contenu signale qu'il reste quelque chose à lire, et disparaît une fois le bas atteint. Fonctionne sur fond transparent (variation « Sans cadre »)
* Accessibilité : la zone de défilement de la popup devient atteignable au clavier quand le contenu ne comporte aucun élément focalisable (WCAG 2.1.1)
* Mobile : hauteur maximale en `dvh` (avec repli en `vh`) pour tenir compte de la barre d'URL
* CSS du cadre exposée en propriétés personnalisées (`--pm-dialog-*`)
* Les styles de l'éditeur ne sont plus chargés au front (CSS front allégée)
* WordPress 6.6 minimum requis (variations de style avec `style_data`)

= 1.0.4 =
* Sécurité : rate limiting (60 req/min par IP) sur l'endpoint analytics public
* Sécurité : vérification du post type et du statut avant écriture des compteurs analytics
* Sécurité : limite à 10 événements maximum par requête analytics
* Sécurité : validation stricte de `overlayColor` (regex couleur CSS via `sanitize_hex_color` + rgba/hsla)
* Sécurité : `sanitize_callback` des enums de réglages valide l'appartenance à l'enum
* Sécurité : condition de type inconnu retourne `false` par défaut (principe de moindre privilège)
* Code : CSS admin injecté via `wp_add_inline_style()` au lieu de `echo <style>`

= 1.0.3 =
* Affichage des stats d'impressions dans la liste des popups

= 1.0.2 =
* Traductions internalisées dans le plugin (fr_FR incluse)
* readme.txt traduit en français
* Compatibilité déclarée avec WordPress 7.0

= 1.0.1 =
* Ajout des mises à jour automatiques via Plugin Update Checker (GitHub Releases)

= 1.0.0 =
* Version initiale
* Custom Post Type avec l'éditeur Gutenberg natif
* Bloc Popup Trigger (encapsule core/button pour un contrôle total du style)
* Store Interactivity API (ouverture, fermeture, piège au focus, inert, Échap, restauration du focus)
* Déclencheurs : clic, chargement de page, profondeur de défilement, exit intent, inactivité
* Conditions : pages, types de contenu, plage de dates avec heure, heure de la journée, rôle utilisateur, appareil, référent
* Fréquence : à chaque visite, une fois par session, une fois par jour, une seule fois
* Animations : fondu, slide-up, scale avec support de prefers-reduced-motion
* Grille de 9 positions + plein écran
* Analytics opt-in via Beacon API
* Accessibilité complète RGAA/WCAG 2.2 AA (patron dialog, piège au focus, région live, cibles tactiles 44px)
* Chargement conditionnel — zéro JS/CSS si aucune popup active (RGESN)
* Page de réglages globaux (React)
* uninstall.php avec nettoyage sécurisé (préserve le contenu des popups)
