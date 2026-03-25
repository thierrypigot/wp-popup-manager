<?php
/**
 * Uninstall — WP Popup Manager.
 *
 * Removes all plugin data when the plugin is deleted
 * via the WordPress admin. Does NOT run on deactivation.
 *
 * @package PopupManager
 * @since   1.0.0
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Delete plugin settings.
delete_option( 'popup_manager_settings' );

// Delete transient cache.
delete_transient( 'popup_manager_published' );

// Popup CPT posts and their meta are intentionally preserved.
// The content belongs to the user and may be reused if the plugin
// is reinstalled or replaced by another solution.
