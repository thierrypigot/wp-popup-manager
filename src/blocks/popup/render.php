<?php
/**
 * Server-side render for the popup block.
 *
 * Generates the full dialog HTML with Interactivity API directives.
 * This file is called via block.json "render" for the editor,
 * but the actual front-end render goes through popup_manager_render_popup() in enqueue.php.
 *
 * @package PopupManager
 */

defined( 'ABSPATH' ) || exit;

// This render.php is a placeholder for the editor block.
// Front-end popup rendering is handled by includes/enqueue.php
// which calls popup_manager_render_popup() for each active popup.
echo '';
