=== WP Popup Manager ===
Contributors: wearewp
Tags: popup, modal, gutenberg, accessible, interactivity-api
Requires at least: 6.5
Tested up to: 7.0
Requires PHP: 8.1
Stable tag: 1.0.4
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
3. Configurez le déclencheur dans la barre latérale (clic, chargement de page, défilement, exit intent, inactivité)
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
- Profondeur de défilement (seuil en % configurable)
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
