<?php
/**
 * Plugin Name:       WP Popup Manager
 * Description:       Accessible popup manager natively integrated with Gutenberg — RGAA/WCAG 2.2 AA compliant, eco-designed (RGESN), Interactivity API powered.
 * Version:           1.0.0
 * Requires at least: 6.5
 * Requires PHP:      8.1
 * Author:            WeAre[WP]
 * Author URI:        https://www.wearewp.pro
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       wp-popup-manager
 *
 * @package PopupManager
 * @since   1.0.0
 */

defined( 'ABSPATH' ) || exit;

define( 'POPUP_MANAGER_VERSION', '1.0.0' );
define( 'POPUP_MANAGER_FILE', __FILE__ );
define( 'POPUP_MANAGER_PATH', plugin_dir_path( __FILE__ ) );
define( 'POPUP_MANAGER_URL', plugin_dir_url( __FILE__ ) );

require_once POPUP_MANAGER_PATH . 'includes/register-cpt.php';
require_once POPUP_MANAGER_PATH . 'includes/conditions.php';
require_once POPUP_MANAGER_PATH . 'includes/enqueue.php';
require_once POPUP_MANAGER_PATH . 'includes/rest-api.php';

/**
 * Register blocks.
 */
add_action( 'init', function () {
	register_block_type( POPUP_MANAGER_PATH . 'build/blocks/popup' );
	register_block_type( POPUP_MANAGER_PATH . 'build/blocks/popup-trigger' );
} );

/**
 * Enqueue editor assets (sidebar panels) only for the popup CPT.
 */
add_action( 'enqueue_block_editor_assets', function () {
	$screen = get_current_screen();

	if ( ! $screen || 'popup' !== $screen->post_type ) {
		return;
	}

	$asset_file = POPUP_MANAGER_PATH . 'build/editor/sidebar-panel.asset.php';

	if ( ! file_exists( $asset_file ) ) {
		return;
	}

	$asset = require $asset_file;

	wp_enqueue_script(
		'popup-manager-sidebar',
		POPUP_MANAGER_URL . 'build/editor/sidebar-panel.js',
		$asset['dependencies'],
		$asset['version'],
		true
	);

	wp_set_script_translations(
		'popup-manager-sidebar',
		'wp-popup-manager',
		POPUP_MANAGER_PATH . 'languages'
	);
} );

/**
 * Global settings page.
 */
add_action( 'admin_menu', function () {
	add_options_page(
		__( 'Popup Manager', 'wp-popup-manager' ),
		__( 'Popup Manager', 'wp-popup-manager' ),
		'manage_options',
		'popup-manager-settings',
		function () {
			echo '<div class="wrap"><div id="popup-manager-root"></div></div>';
		}
	);
} );

add_action( 'admin_enqueue_scripts', function ( string $hook ) {
	if ( 'settings_page_popup-manager-settings' !== $hook ) {
		return;
	}

	$asset_file = POPUP_MANAGER_PATH . 'build/editor/settings-page.asset.php';

	if ( ! file_exists( $asset_file ) ) {
		return;
	}

	$asset = require $asset_file;

	wp_enqueue_script(
		'popup-manager-settings',
		POPUP_MANAGER_URL . 'build/editor/settings-page.js',
		$asset['dependencies'],
		$asset['version'],
		true
	);

	wp_enqueue_style(
		'popup-manager-settings',
		POPUP_MANAGER_URL . 'build/editor/settings-page.css',
		array( 'wp-components' ),
		$asset['version']
	);
} );
