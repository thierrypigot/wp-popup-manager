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
	$popups = popup_manager_get_published();

	if ( empty( $popups ) ) {
		return array();
	}

	$matching = array();

	foreach ( $popups as $popup ) {
		$conditions = get_post_meta( $popup->ID, '_popup_conditions', true );

		if ( ! is_array( $conditions ) || empty( $conditions ) ) {
			// No conditions → display everywhere.
			$matching[] = $popup;
			continue;
		}

		// AND logic: all conditions must be true.
		$all_met = true;

		foreach ( $conditions as $condition ) {
			if ( ! popup_manager_evaluate_condition( $condition, $queried_object_id ) ) {
				$all_met = false;
				break;
			}
		}

		if ( $all_met ) {
			$matching[] = $popup;
		}
	}

	return $matching;
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
	) );

	$popups = $query->posts;

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

			$is_in = in_array( $queried_object_id, array_map( 'absint', $ids ), true );

			return 'include' === $operator ? $is_in : ! $is_in;

		case 'post_type':
			$values = $condition['values'] ?? array();

			if ( empty( $values ) ) {
				return true;
			}

			$current_post_type = get_post_type( $queried_object_id );

			return in_array( $current_post_type, $values, true );

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
			// Unknown condition type → consider it as met.
			return true;
	}
}
