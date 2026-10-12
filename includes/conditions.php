<?php
/**
 * Server-side targeting condition evaluation.
 *
 * All conditions are evaluated in PHP.
 * If no condition is met, no HTML or JS is emitted.
 *
 * @package PopupManager
 * @since   1.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Invalidate transient when a popup is saved.
 */
add_action( 'save_post_popup', function () {
	delete_transient( 'popup_manager_published' );
} );

/**
 * Return active popups for the current page.
 *
 * @param int $queried_object_id Current queried object ID.
 * @return WP_Post[] Array of matching popups.
 */
function popup_manager_get_matching( int $queried_object_id ): array {
	$popups = popup_manager_pll_filter_language( popup_manager_get_published() );

	if ( empty( $popups ) ) {
		return array();
	}

	return array_values( array_filter( $popups, function ( WP_Post $popup ) use ( $queried_object_id ) {
		return popup_manager_conditions_met( $popup, $queried_object_id );
	} ) );
}

/**
 * Whether all the display conditions of a popup are met (AND logic).
 *
 * @param WP_Post $popup             Popup.
 * @param int     $queried_object_id Current queried object ID.
 * @return bool True when met, or when the popup has no condition.
 */
function popup_manager_conditions_met( WP_Post $popup, int $queried_object_id ): bool {
	$conditions = get_post_meta( $popup->ID, '_popup_conditions', true );

	if ( ! is_array( $conditions ) || empty( $conditions ) ) {
		// No conditions → display everywhere.
		return true;
	}

	foreach ( $conditions as $condition ) {
		if ( ! popup_manager_evaluate_condition( $condition, $queried_object_id ) ) {
			return false;
		}
	}

	return true;
}

/**
 * ID of the single content being displayed, 0 elsewhere (archives, search,
 * blog home without a posts page).
 *
 * get_queried_object_id() returns a term ID on a term archive: compared with
 * post IDs, it could match a page of the same ID.
 *
 * @return int
 */
function popup_manager_current_post_id(): int {
	return get_queried_object() instanceof WP_Post ? (int) get_queried_object_id() : 0;
}

/**
 * "Taxonomy" condition: the displayed content must have terms of the taxonomy
 * (prerequisite, in both modes), and one of the chosen terms ("include") or
 * none of them ("exclude").
 *
 * On a term archive of the same taxonomy (unless the "archives" option is
 * off), the archived term is checked the same way. Other archives, the home
 * page and the search never match.
 *
 * @param array $condition Condition: taxonomy, ids (term IDs), operator, children, archives.
 * @param int   $post_id   Displayed content, 0 when not a single content.
 * @return bool
 */
function popup_manager_evaluate_taxonomy( array $condition, int $post_id ): bool {
	$taxonomy = $condition['taxonomy'] ?? '';
	$ids      = array_filter( array_map( 'absint', (array) ( $condition['ids'] ?? array() ) ) );

	// Incomplete condition: no restriction, like the other conditions.
	if ( '' === $taxonomy || empty( $ids ) ) {
		return true;
	}

	if ( ! taxonomy_exists( $taxonomy ) ) {
		return false;
	}

	if ( $post_id ) {
		$current_terms = get_the_terms( $post_id, $taxonomy );
		$current_terms = is_array( $current_terms ) ? wp_list_pluck( $current_terms, 'term_id' ) : array();
	} else {
		$queried       = get_queried_object();
		$on_archive    = $queried instanceof WP_Term && $taxonomy === $queried->taxonomy && ( $condition['archives'] ?? true );
		$current_terms = $on_archive ? array( $queried->term_id ) : array();
	}

	if ( empty( $current_terms ) ) {
		return false;
	}

	// Translations of the chosen terms match too.
	$targets = popup_manager_pll_with_translations( $ids, 'term' );

	if ( ( $condition['children'] ?? true ) && is_taxonomy_hierarchical( $taxonomy ) ) {
		foreach ( $targets as $term_id ) {
			$children = get_term_children( $term_id, $taxonomy );

			if ( is_array( $children ) ) {
				$targets = array_merge( $targets, array_map( 'absint', $children ) );
			}
		}
	}

	$has_term = (bool) array_intersect( array_map( 'absint', $current_terms ), $targets );

	return 'exclude' === ( $condition['operator'] ?? 'include' ) ? ! $has_term : $has_term;
}

/**
 * Retrieve all published popups (with transient cache).
 *
 * @return WP_Post[]
 */
function popup_manager_get_published(): array {
	$cached = get_transient( 'popup_manager_published' );

	if ( false !== $cached ) {
		return $cached;
	}

	$query = new WP_Query( array(
		'post_type'      => 'popup',
		'post_status'    => 'publish',
		'posts_per_page' => 50,
		'no_found_rows'  => true,
		'fields'         => '',
		'lang'           => '', // All languages: the cache is shared, filtered per request.
	) );

	// Popups switched off from the list table are never emitted.
	$popups = array_values( array_filter( $query->posts, function ( WP_Post $popup ) {
		return popup_manager_is_enabled( $popup->ID );
	} ) );

	set_transient( 'popup_manager_published', $popups, HOUR_IN_SECONDS );

	return $popups;
}

/**
 * Detect device type from User-Agent.
 *
 * @return string 'mobile', 'tablet', or 'desktop'.
 */
function popup_manager_detect_device(): string {
	if ( ! isset( $_SERVER['HTTP_USER_AGENT'] ) ) {
		return 'desktop';
	}

	$ua = sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) );

	// Tablet detection first (tablets also match mobile patterns).
	if ( preg_match( '/iPad|Android(?!.*Mobile)|Tablet/i', $ua ) ) {
		return 'tablet';
	}

	// Mobile detection.
	if ( preg_match( '/Mobile|iPhone|iPod|Android.*Mobile|webOS|BlackBerry|Opera Mini|IEMobile/i', $ua ) ) {
		return 'mobile';
	}

	return 'desktop';
}

/**
 * Evaluate a single condition.
 *
 * @param array $condition The condition to evaluate.
 * @param int   $queried_object_id Current queried object ID.
 * @return bool
 */
function popup_manager_evaluate_condition( array $condition, int $queried_object_id ): bool {
	$type = $condition['type'] ?? '';

	switch ( $type ) {

		case 'page':
			$ids      = $condition['ids'] ?? array();
			$operator = $condition['operator'] ?? 'include';

			if ( empty( $ids ) ) {
				return true;
			}

			// Translations of the chosen pages match too.
			$is_in = in_array( $queried_object_id, popup_manager_pll_with_translations( array_map( 'absint', $ids ) ), true );

			return 'include' === $operator ? $is_in : ! $is_in;

		case 'post_type':
			$values = $condition['values'] ?? array();

			if ( empty( $values ) ) {
				return true;
			}

			// Only a single content has a content type (not an archive, not the search).
			if ( ! $queried_object_id ) {
				return false;
			}

			$current_post_type = get_post_type( $queried_object_id );

			return in_array( $current_post_type, $values, true );

		case 'taxonomy':
			return popup_manager_evaluate_taxonomy( $condition, $queried_object_id );

		case 'date_range':
			$now       = current_time( 'Y-m-d H:i' );
			$now_date  = current_time( 'Y-m-d' );
			$now_time  = current_time( 'H:i' );

			$start      = $condition['start'] ?? '';
			$start_time = $condition['startTime'] ?? '';
			$end        = $condition['end'] ?? '';
			$end_time   = $condition['endTime'] ?? '';

			// Build full datetime for comparison.
			$start_full = $start ? $start . ( $start_time ? ' ' . $start_time : ' 00:00' ) : '';
			$end_full   = $end ? $end . ( $end_time ? ' ' . $end_time : ' 23:59' ) : '';

			if ( $start_full && $now < $start_full ) {
				return false;
			}

			if ( $end_full && $now > $end_full ) {
				return false;
			}

			return true;

		case 'time_range':
			$start_time = $condition['startTime'] ?? '';
			$end_time   = $condition['endTime'] ?? '';
			$now_time   = current_time( 'H:i' );

			if ( '' === $start_time && '' === $end_time ) {
				return true;
			}

			// Handle overnight ranges (e.g. 22:00 → 06:00).
			if ( $start_time && $end_time && $start_time > $end_time ) {
				return $now_time >= $start_time || $now_time <= $end_time;
			}

			if ( $start_time && $now_time < $start_time ) {
				return false;
			}

			if ( $end_time && $now_time > $end_time ) {
				return false;
			}

			return true;

		case 'user_role':
			$values   = $condition['values'] ?? array();
			$operator = $condition['operator'] ?? 'include';

			if ( empty( $values ) ) {
				return true;
			}

			$user = wp_get_current_user();

			// Logged-out users have no roles.
			if ( ! $user->exists() ) {
				$has_role = in_array( 'logged_out', $values, true );
				return 'include' === $operator ? $has_role : ! $has_role;
			}

			$has_role = ! empty( array_intersect( $user->roles, $values ) );

			return 'include' === $operator ? $has_role : ! $has_role;

		case 'device':
			$values = $condition['values'] ?? array();

			if ( empty( $values ) ) {
				return true;
			}

			$device = popup_manager_detect_device();

			return in_array( $device, $values, true );

		case 'referrer':
			$pattern = $condition['pattern'] ?? '';

			if ( '' === $pattern ) {
				return true;
			}

			$referrer = wp_get_raw_referer();

			if ( ! $referrer ) {
				return false;
			}

			return false !== stripos( $referrer, $pattern );

		default:
			// Unknown condition type → deny by default (principle of least privilege).
			return false;
	}
}
