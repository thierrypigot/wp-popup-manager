=== WP Popup Manager ===
Contributors: wearewp
Tags: popup, modal, gutenberg, accessible, interactivity-api
Requires at least: 6.5
Tested up to: 7.0
Requires PHP: 8.1
Stable tag: 1.0.2
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Accessible popup manager natively integrated with Gutenberg — RGAA/WCAG 2.2 AA compliant, eco-designed (RGESN), Interactivity API powered.

== Description ==

WP Popup Manager is a WordPress popup plugin built from the ground up for the modern WordPress ecosystem:

= Full Gutenberg Integration =

- Create popup content using any native Gutenberg block
- Configure triggers, conditions, and display settings via sidebar panels
- Trigger block uses native core/button for full styling control
- No proprietary builder — your popups are standard WordPress content

= Accessibility First (RGAA / WCAG 2.2 AA) =

- WAI-ARIA dialog/alertdialog pattern fully implemented
- Focus trap (Tab/Shift+Tab confined to popup)
- Focus restoration on close
- Escape key closes the popup
- aria-modal, aria-labelledby, inert on background content
- prefers-reduced-motion respected
- Live region announces popup to screen readers
- Close button 44x44px minimum touch target

= Eco-Designed (RGESN) =

- Zero impact when no popup is active: no JS, no CSS, no HTML injected
- JS budget: < 3 KB gzip (Interactivity API store)
- CSS budget: < 1.5 KB gzip
- No network request at runtime (data inlined via Interactivity API context)
- No external dependency, no third-party library

= Server-First Architecture =

- HTML rendered server-side (PHP)
- WordPress Interactivity API for declarative hydration
- WordPress 7-ready

== Installation ==

1. Upload the `wp-popup-manager` folder to `/wp-content/plugins/`
2. Activate the plugin in the Plugins menu
3. Go to Popups > Add New to create your first popup

== Usage ==

1. Create a new Popup (Popups > Add New)
2. Add content using Gutenberg blocks
3. Configure the trigger in the sidebar (click, page load, scroll, exit intent, inactivity)
4. Set display conditions (pages, post types, date range, time of day, user role, device, referrer)
5. Choose appearance settings (animation, position grid, size, overlay with color picker)
6. Set frequency (every visit, once per session, once per day, once ever)
7. Optionally enable analytics (impressions/closes tracking via Beacon API)
8. Publish

For click-triggered popups, insert a **Popup Trigger** block in any page or post content. The trigger uses a native core/button so you get full styling control.

== Features ==

= Triggers (exclusive) =
- Click (trigger button block)
- Page load (configurable delay)
- Scroll depth (configurable threshold %)
- Exit intent (mouse leaves window)
- Inactivity (configurable delay)

= Display Conditions (AND logic) =
- Specific pages (include/exclude by title search)
- Content types (post, page, product…)
- Date range with start/end time
- Time of day (daily recurring — supports overnight ranges)
- User role (include/exclude, supports logged_out)
- Device type (desktop, mobile, tablet)
- Referrer URL pattern

= Appearance =
- Animations: fade, slide-up, scale, none
- 9-position grid + fullscreen
- Sizes: small (400px), medium (600px), large (800px)
- Overlay with color picker and alpha channel
- Close on overlay click (configurable)
- Close on Escape key (configurable)

= Frequency =
- Every visit
- Once per session (sessionStorage)
- Once per day (localStorage with 24h expiry)
- Once ever (localStorage permanent)

= Analytics (opt-in) =
- Disabled by default (RGESN compliance)
- Tracks impressions and closes per popup
- Single HTTP request via Beacon API at pagehide
- Data stored as post meta counters

= Global Settings =
- Default animation, position, frequency
- Custom CSS classes
- Full React admin page

== Changelog ==

= 1.0.2 =
* Traductions internalisées dans le plugin (fr_FR incluse)

= 1.0.1 =
* Ajout des mises à jour automatiques via Plugin Update Checker (GitHub Releases)

= 1.0.0 =
* Initial release
* Custom Post Type with native Gutenberg editor
* Popup Trigger block (wraps native core/button for full styling)
* Interactivity API store (open, close, focus trap, inert, Escape, focus restoration)
* Triggers: click, page load, scroll depth, exit intent, inactivity
* Conditions: pages, content types, date range with time, time of day, user role, device, referrer
* Frequency: every visit, once per session, once per day, once ever
* Animations: fade, slide-up, scale with prefers-reduced-motion support
* 9-position grid + fullscreen
* Analytics opt-in via Beacon API
* Full RGAA/WCAG 2.2 AA accessibility (dialog pattern, focus trap, live region, 44px touch targets)
* Conditional loading — zero JS/CSS if zero popup active (RGESN)
* Global settings page (React)
* uninstall.php with safe cleanup (preserves popup content)
