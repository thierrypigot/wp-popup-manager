<?php
/**
 * Server-side render for the popup-trigger block.
 *
 * Wraps the inner core/button with Interactivity API context on the wrapper,
 * and injects the click directive on the button element.
 * Converts the link to a button for proper semantics.
 *
 * @package PopupManager
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner blocks content (core/button).
 * @var WP_Block $block      Block instance.
 */

defined( 'ABSPATH' ) || exit;

$popup_id = absint( $attributes['popupId'] ?? 0 );

if ( 0 === $popup_id || empty( $content ) ) {
	return;
}

// Inject the click directive on the button/link element inside core/button.
$processor = new WP_HTML_Tag_Processor( $content );

if ( $processor->next_tag( array( 'class_name' => 'wp-block-button__link' ) ) ) {
	$processor->set_attribute( 'data-wp-on--click', 'actions.openById' );
	$processor->remove_attribute( 'href' );
}

$content = $processor->get_updated_html();

// Convert <a> to <button type="button"> for proper semantics.
$content = preg_replace(
	'/<a\b([^>]*)>/',
	'<button type="button"$1>',
	$content
);
$content = str_replace( '</a>', '</button>', $content );

// Context on the wrapper so getContext() works from the inner button.
$context = wp_interactivity_data_wp_context( array( 'popupId' => $popup_id ) );

printf(
	'<div %1$s data-wp-interactive="popup-manager" %2$s>%3$s</div>',
	get_block_wrapper_attributes(),
	$context,
	$content
);
