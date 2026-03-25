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
$popup_processor = new WP_HTML_Tag_Processor( $content );

if ( $popup_processor->next_tag( array( 'class_name' => 'wp-block-button__link' ) ) ) {
	$popup_processor->set_attribute( 'data-wp-on--click', 'actions.openById' );
	$popup_processor->remove_attribute( 'href' );
}

$popup_content = $popup_processor->get_updated_html();

// Convert <a> to <button type="button"> for proper semantics.
$popup_content = preg_replace(
	'/<a\b([^>]*)>/',
	'<button type="button"$1>',
	$popup_content
);
$popup_content = str_replace( '</a>', '</button>', $popup_content );

// Context on the wrapper so getContext() works from the inner button.
$popup_context = wp_interactivity_data_wp_context( array( 'popupId' => $popup_id ) );

// All three values are pre-escaped by WordPress core functions.
printf(
	'<div %1$s data-wp-interactive="popup-manager" %2$s>%3$s</div>',
	get_block_wrapper_attributes(), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Core function, pre-escaped.
	$popup_context, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_interactivity_data_wp_context() output.
	$popup_content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Block inner content from WP_HTML_Tag_Processor.
);
