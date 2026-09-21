<?php
/**
 * Server-side render for the popup block.
 *
 * The popup frame itself (wrapper, overlay, dialog, close button) is produced
 * by popup_manager_render_popup() in includes/enqueue.php, which reads this
 * block's attributes to style the dialog. This file therefore only returns the
 * inner blocks, with no wrapper of its own.
 *
 * @package PopupManager
 */

defined( 'ABSPATH' ) || exit;

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Inner blocks, already rendered and escaped by core.
echo $content;
