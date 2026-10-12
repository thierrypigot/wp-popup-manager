<?php
/**
 * Polylang compatibility.
 *
 * - The popup post type is offered in Polylang settings (it is not public, so
 *   Polylang does not list it by itself). Translation stays opt-in.
 * - When popups are translated, only the popups in the current language, or
 *   without language, are shown on the front.
 * - "Specific pages" and "Taxonomy" conditions also match the translations of
 *   the chosen pages and terms.
 * - A trigger button opens the translation of its popup in the current language.
 *   Without a published translation, the original popup is loaded anyway, so
 *   that the button never does nothing.
 * - Creating a translation copies the popup settings, never the statistics.
 * - The "Specific contents" picker shows the language of each content.
 *
 * Every function is a no-op without Polylang.
 *
 * @package PopupManager
 * @since   1.3.0
 */

defined( 'ABSPATH' ) || exit;

add_filter( 'pll_get_post_types', 'popup_manager_pll_post_types', 10, 2 );

/**
 * List the popup post type in Polylang settings.
 *
 * @param string[] $post_types  Post types.
 * @param bool     $is_settings True when Polylang builds its settings list.
 * @return string[]
 */
function popup_manager_pll_post_types( $post_types, $is_settings ) {
	if ( $is_settings ) {
		$post_types['popup'] = 'popup';
	}

	return $post_types;
}

add_filter( 'pll_copy_post_metas', 'popup_manager_pll_copy_metas', 10, 3 );

/**
 * Copy the settings when a translation is created. Polylang skips protected
 * meta (leading underscore), which all popup settings are.
 *
 * Statistics are never copied, and nothing is synchronized afterwards: each
 * translation keeps its own settings (pages, texts, dates may differ).
 *
 * @param string[] $keys Meta keys to copy.
 * @param bool     $sync True for a synchronization, false for the initial copy.
 * @param int      $from Source post ID.
 * @return string[]
 */
function popup_manager_pll_copy_metas( $keys, $sync, $from ) {
	if ( $sync || 'popup' !== get_post_type( $from ) ) {
		return $keys;
	}

	return array_merge(
		(array) $keys,
		array( '_popup_triggers', '_popup_conditions', '_popup_display', '_popup_frequency', '_popup_analytics_enabled' )
	);
}

/**
 * Whether popups are translated with Polylang.
 *
 * @return bool
 */
function popup_manager_pll_active(): bool {
	return function_exists( 'pll_is_translated_post_type' ) && pll_is_translated_post_type( 'popup' );
}

/**
 * Keep the popups in the current language, and those without language.
 *
 * @param WP_Post[] $popups Popups.
 * @return WP_Post[]
 */
function popup_manager_pll_filter_language( array $popups ): array {
	if ( ! popup_manager_pll_active() || ! function_exists( 'pll_current_language' ) ) {
		return $popups;
	}

	$current = pll_current_language();

	if ( ! $current ) {
		return $popups;
	}

	return array_values( array_filter( $popups, function ( WP_Post $popup ) use ( $current ) {
		$language = pll_get_post_language( $popup->ID );

		return ! $language || $current === $language;
	} ) );
}

/**
 * Add the translations of the given posts or terms.
 *
 * @param int[]  $ids  Post or term IDs.
 * @param string $kind 'post' or 'term'.
 * @return int[]
 */
function popup_manager_pll_with_translations( array $ids, string $kind = 'post' ): array {
	$callback = 'term' === $kind ? 'pll_get_term_translations' : 'pll_get_post_translations';

	if ( ! function_exists( $callback ) ) {
		return $ids;
	}

	$all = $ids;

	foreach ( $ids as $id ) {
		$all = array_merge( $all, array_map( 'absint', array_values( (array) $callback( $id ) ) ) );
	}

	return array_values( array_unique( $all ) );
}

/**
 * Translation of a popup in the current language, or the popup itself.
 *
 * @param int $popup_id Popup ID.
 * @return int
 */
function popup_manager_pll_translate_popup( int $popup_id ): int {
	if ( ! popup_manager_pll_active() || ! function_exists( 'pll_get_post' ) ) {
		return $popup_id;
	}

	// Polylang keeps the link to a trashed or draft translation: published only.
	$translated = (int) pll_get_post( $popup_id );

	return $translated && 'publish' === get_post_status( $translated ) ? $translated : $popup_id;
}

/**
 * Record the popup of a trigger button rendered in the page, after translation.
 * A popup in another language is not loaded by the language filter: it is
 * loaded as a fallback in the footer.
 *
 * @param int $popup_id Popup ID, 0 to read only.
 * @return int[] Popups requested by the trigger buttons of the page.
 */
function popup_manager_pll_request_fallback( int $popup_id = 0 ): array {
	static $ids = array();

	if ( $popup_id && ! in_array( $popup_id, $ids, true ) ) {
		$ids[] = $popup_id;
	}

	return $ids;
}

/**
 * Popups to load as a fallback: requested by a trigger button, in another
 * language than the page, published, enabled, and whose conditions are met.
 *
 * @return WP_Post[]
 */
function popup_manager_pll_fallback_popups(): array {
	static $popups = null;

	if ( null !== $popups ) {
		return $popups;
	}

	$popups = array();

	if ( ! popup_manager_pll_active() || ! function_exists( 'pll_current_language' ) ) {
		return $popups;
	}

	$current = pll_current_language();

	foreach ( popup_manager_pll_request_fallback() as $popup_id ) {
		$popup    = get_post( $popup_id );
		$language = $popup ? pll_get_post_language( $popup->ID ) : false;

		if (
			! $popup
			|| 'popup' !== $popup->post_type
			|| 'publish' !== $popup->post_status
			|| ! $language
			|| $current === $language // Same language: already handled by the regular flow.
			|| ! popup_manager_is_enabled( $popup->ID )
			|| '' !== popup_manager_get_section_anchor( $popup )
			|| ! popup_manager_conditions_met( $popup, popup_manager_current_post_id() )
		) {
			continue;
		}

		$popups[] = $popup;
	}

	return $popups;
}

add_action( 'wp_footer', 'popup_manager_pll_enqueue_fallback', 1 );
add_action( 'wp_footer', 'popup_manager_pll_print_fallback', 11 );

/**
 * Enqueue the front assets when a fallback popup is needed. The trigger
 * buttons are rendered by now, in block and classic themes alike.
 */
function popup_manager_pll_enqueue_fallback(): void {
	if ( ! is_admin() && popup_manager_pll_fallback_popups() ) {
		popup_manager_enqueue_assets();
	}
}

function popup_manager_pll_print_fallback(): void {
	if ( ! is_admin() ) {
		popup_manager_print_popups( popup_manager_pll_fallback_popups() );
	}
}

add_action( 'rest_api_init', 'popup_manager_pll_rest_language' );

/**
 * Expose the language of translated contents to the "Specific contents"
 * picker. Polylang (free) does not add it to the REST API. Only computed when
 * requested through _fields.
 */
function popup_manager_pll_rest_language(): void {
	if ( ! function_exists( 'pll_get_post_language' ) || ! function_exists( 'pll_is_translated_post_type' ) ) {
		return;
	}

	foreach ( get_post_types( array( 'show_in_rest' => true ) ) as $post_type ) {
		if ( ! pll_is_translated_post_type( $post_type ) ) {
			continue;
		}

		register_rest_field( $post_type, 'popup_manager_lang', array(
			'get_callback' => function ( $item ) {
				return (string) pll_get_post_language( (int) $item['id'] );
			},
			'schema'       => array(
				'type'     => 'string',
				'context'  => array( 'edit' ),
				'readonly' => true,
			),
		) );
	}
}
