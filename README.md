# WP Popup Manager

[![WordPress 6.5+](https://img.shields.io/badge/WordPress-6.5%2B-21759b?logo=wordpress&logoColor=white)](https://wordpress.org)
[![PHP 8.1+](https://img.shields.io/badge/PHP-8.1%2B-777BB4?logo=php&logoColor=white)](https://www.php.net)
[![License: GPL v2+](https://img.shields.io/badge/License-GPL--2.0--or--later-blue)](https://www.gnu.org/licenses/gpl-2.0.html)
[![Version 1.0.4](https://img.shields.io/badge/version-1.0.4-green)](#changelog)
[![WCAG 2.2 AA](https://img.shields.io/badge/WCAG-2.2%20AA-228B22)](#accessibility-first-rgaa--wcag-22-aa)
[![RGESN](https://img.shields.io/badge/RGESN-eco--designed-2E8B57)](#eco-designed-rgesn)

> Accessible popup manager natively integrated with Gutenberg — RGAA/WCAG 2.2 AA compliant, eco-designed (RGESN), Interactivity API powered.

> [!IMPORTANT]
> **Download the plugin from the [latest release](https://github.com/thierrypigot/wp-popup-manager/releases/latest), not from the green "Code" button.**
>
> Use the `wp-popup-manager.zip` file listed under **Assets**. It is the only installable archive: it contains the compiled JS/CSS and the bundled update library.
>
> The source ZIP from the "Code" button (or a `git clone` without `--recurse-submodules`) ships without the `build/` folder and with an empty `plugin-update-checker/` folder, which makes WordPress fail with *"The plugin could not be activated because it triggered a fatal error."*

## Description

WP Popup Manager is a WordPress popup plugin built from the ground up for the modern WordPress ecosystem.

### Full Gutenberg Integration

- Create popup content using any native Gutenberg block
- Configure triggers, conditions, and display settings via sidebar panels
- Trigger block uses native `core/button` for full styling control
- No proprietary builder — your popups are standard WordPress content

### Accessibility First (RGAA / WCAG 2.2 AA)

- WAI-ARIA `dialog`/`alertdialog` pattern fully implemented
- Focus trap (Tab/Shift+Tab confined to popup)
- Focus restoration on close
- Escape key closes the popup
- `aria-modal`, `aria-labelledby`, `inert` on background content
- `prefers-reduced-motion` respected
- Live region announces popup to screen readers
- Close button 44x44px minimum touch target

### Eco-Designed (RGESN)

- Zero impact when no popup is active: no JS, no CSS, no HTML injected
- JS budget: < 3 KB gzip (Interactivity API store)
- CSS budget: < 1.5 KB gzip
- No network request at runtime (data inlined via Interactivity API context)
- No external dependency, no third-party library

### Server-First Architecture

- HTML rendered server-side (PHP)
- WordPress Interactivity API for declarative hydration
- WordPress 7-ready

## Installation

1. Download `wp-popup-manager.zip` from the [latest release](https://github.com/thierrypigot/wp-popup-manager/releases/latest) (**Assets** section)
2. In WordPress, go to **Plugins > Add New > Upload Plugin**, select the ZIP as is and click **Install Now**
   *(FTP alternative: unzip it locally, then upload the resulting `wp-popup-manager` folder to `/wp-content/plugins/`)*
3. Activate the plugin in the Plugins menu
4. Go to **Popups > Add New** to create your first popup

> Building from source? Clone with `git clone --recurse-submodules`, then run `npm ci && npm run build` before uploading.

## Usage

1. Create a new Popup (**Popups > Add New**)
2. Add content using Gutenberg blocks
3. Configure the trigger in the sidebar (click, page load, scroll, exit intent, inactivity)
4. Set display conditions (pages, post types, date range, time of day, user role, device, referrer)
5. Choose appearance settings (animation, position grid, size, overlay with color picker)
6. Set frequency (every visit, once per session, once per day, once ever)
7. Optionally enable analytics (impressions/closes tracking via Beacon API)
8. Publish

For click-triggered popups, insert a **Popup Trigger** block in any page or post content. The trigger uses a native `core/button` so you get full styling control.

## Features

### Triggers (exclusive)

- **Click** — trigger button block
- **Page load** — configurable delay
- **Scroll depth** — configurable threshold %
- **Exit intent** — mouse leaves window
- **Inactivity** — configurable delay

### Display Conditions (AND logic)

- Specific pages (include/exclude by title search)
- Content types (post, page, product…)
- Date range with start/end time
- Time of day (daily recurring — supports overnight ranges)
- User role (include/exclude, supports `logged_out`)
- Device type (desktop, mobile, tablet)
- Referrer URL pattern

### Appearance

- Animations: fade, slide-up, scale, none
- 9-position grid + fullscreen
- Sizes: small (400px), medium (600px), large (800px)
- Overlay with color picker and alpha channel
- Close on overlay click (configurable)
- Close on Escape key (configurable)

### Frequency

- Every visit
- Once per session (`sessionStorage`)
- Once per day (`localStorage` with 24h expiry)
- Once ever (`localStorage` permanent)

### Analytics (opt-in)

- Disabled by default (RGESN compliance)
- Tracks impressions and closes per popup
- Single HTTP request via Beacon API at `pagehide`
- Data stored as post meta counters

### Global Settings

- Default animation, position, frequency
- Custom CSS classes
- Full React admin page

<details>
<summary><strong>Changelog</strong></summary>

### 1.0.4

- Security: rate limiting (60 req/min per IP) on the public analytics endpoint
- Security: post type and publish status check before writing analytics counters
- Security: max 10 events per analytics request
- Security: strict CSS color validation for `overlayColor` (`sanitize_hex_color` + rgba/hsla regex)
- Security: settings enum `sanitize_callback` now validates enum membership
- Security: unknown display condition type returns `false` by default (least privilege)
- Code: admin column CSS injected via `wp_add_inline_style()` instead of raw `echo`

### 1.0.3

- Analytics impression count column in the popup list table

### 1.0.0

- Initial release
- Custom Post Type with native Gutenberg editor
- Popup Trigger block (wraps native `core/button` for full styling)
- Interactivity API store (open, close, focus trap, inert, Escape, focus restoration)
- Triggers: click, page load, scroll depth, exit intent, inactivity
- Conditions: pages, content types, date range with time, time of day, user role, device, referrer
- Frequency: every visit, once per session, once per day, once ever
- Animations: fade, slide-up, scale with `prefers-reduced-motion` support
- 9-position grid + fullscreen
- Analytics opt-in via Beacon API
- Full RGAA/WCAG 2.2 AA accessibility (dialog pattern, focus trap, live region, 44px touch targets)
- Conditional loading — zero JS/CSS if zero popup active (RGESN)
- Global settings page (React)
- `uninstall.php` with safe cleanup (preserves popup content)

</details>

## About

WP Popup Manager is built and maintained by [WeAre\[WP\]](https://www.wearewp.pro), a French WordPress agency specializing in accessible, high-performance websites for businesses of all sizes.

Need help with your WordPress project? [Get in touch](https://www.wearewp.pro/contact).

## License

This project is licensed under the GPL-2.0-or-later — see the [LICENSE](LICENSE) file for details.
