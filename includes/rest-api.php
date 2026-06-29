<?php
/**
 * REST API — Global settings endpoints.
 *
 * @package PopupManager
 */

defined( 'ABSPATH' ) || exit;

add_action( 'rest_api_init', 'popup_manager_register_rest_routes' );

/**
 * Register REST routes.
 */
function popup_manager_register_rest_routes(): void {

	register_rest_route( 'popup-manager/v1', '/settings', array(
		array(
			'methods'             => 'GET',
			'callback'            => 'popup_manager_rest_get_settings',
			'permission_callback' => function () {
				return current_user_can( 'manage_options' );
			},
		),
		array(
			'methods'             => 'POST',
			'callback'            => 'popup_manager_rest_save_settings',
			'permission_callback' => function () {
				return current_user_can( 'manage_options' );
			},
			'args'                => array(
				'defaultAnimation' => array(
					'type'              => 'string',
					'enum'              => array( 'fade', 'slide-up', 'scale', 'none' ),
					'sanitize_callback' => function ( $v ) {
						$allowed = array( 'fade', 'slide-up', 'scale', 'none' );
						return in_array( $v, $allowed, true ) ? $v : 'fade';
					},
				),
				'defaultPosition'  => array(
					'type'              => 'string',
					'enum'              => array( 'center', 'top', 'top-left', 'top-right', 'center-left', 'center-right', 'bottom', 'bottom-left', 'bottom-right', 'fullscreen' ),
					'sanitize_callback' => function ( $v ) {
						$allowed = array( 'center', 'top', 'top-left', 'top-right', 'center-left', 'center-right', 'bottom', 'bottom-left', 'bottom-right', 'fullscreen' );
						return in_array( $v, $allowed, true ) ? $v : 'center';
					},
				),
				'defaultFrequency' => array(
					'type'              => 'string',
					'enum'              => array( 'always', 'once_per_session', 'once_per_day', 'once_ever' ),
					'sanitize_callback' => function ( $v ) {
						$allowed = array( 'always', 'once_per_session', 'once_per_day', 'once_ever' );
						return in_array( $v, $allowed, true ) ? $v : 'always';
					},
				),
				'customCssClasses' => array(
					'type'              => 'string',
					'sanitize_callback' => 'popup_manager_sanitize_css_classes',
				),
			),
		),
	) );

	// Analytics endpoint (Beacon API receiver).
	register_rest_route( 'popup-manager/v1', '/analytics', array(
		'methods'             => 'POST',
		'callback'            => 'popup_manager_rest_record_analytics',
		'permission_callback' => '__return_true', // Public — Beacon API sends no cookies/auth.
		'args'                => array(
			'events' => array(
				'type'              => 'array',
				'required'          => true,
				'sanitize_callback' => 'popup_manager_sanitize_analytics_events',
				'items'             => array(
					'type'       => 'object',
					'properties' => array(
						'popupId' => array( 'type' => 'integer' ),
						'type'    => array(
							'type' => 'string',
							'enum' => array( 'impression', 'close' ),
						),
					),
				),
			),
		),
	) );
}

/**
 * Rate-limit analytics endpoint by IP (60 events per 60 seconds).
 */
function popup_manager_analytics_check_rate_limit(): bool {
	$ip    = sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ?? '' ) );
	$key   = 'popup_analytics_rl_' . md5( $ip );
	$count = (int) get_transient( $key );

	if ( $count >= 60 ) {
		return false;
	}

	set_transient( $key, $count + 1, 60 );

	return true;
}

/**
 * Record analytics events.
 */
function popup_manager_rest_record_analytics( \WP_REST_Request $request ): \WP_REST_Response {
	if ( ! popup_manager_analytics_check_rate_limit() ) {
		return new \WP_REST_Response( array( 'ok' => false ), 429 );
	}

	$events = array_slice( (array) $request->get_param( 'events' ), 0, 10 );

	foreach ( $events as $event ) {
		$popup_id = absint( $event['popupId'] ?? 0 );
		$type     = $event['type'] ?? '';

		if ( 0 === $popup_id || ! in_array( $type, array( 'impression', 'close' ), true ) ) {
			continue;
		}

		// Verify the post exists and belongs to the popup CPT.
		$post = get_post( $popup_id );
		if ( ! $post || 'popup' !== $post->post_type || 'publish' !== $post->post_status ) {
			continue;
		}

		// Check that analytics is enabled for this popup.
		if ( ! get_post_meta( $popup_id, '_popup_analytics_enabled', true ) ) {
			continue;
		}

		// Increment counter stored in post meta.
		$meta_key = '_popup_analytics_' . $type . 's';
		$current  = absint( get_post_meta( $popup_id, $meta_key, true ) );
		update_post_meta( $popup_id, $meta_key, $current + 1 );
	}

	return new \WP_REST_Response( array( 'ok' => true ), 200 );
}

/**
 * Sanitize analytics events array.
 */
function popup_manager_sanitize_analytics_events( $value ): array {
	if ( ! is_array( $value ) ) {
		return array();
	}

	return array_values( array_filter( array_map( function ( $item ) {
		if ( ! is_array( $item ) ) {
			return null;
		}

		$popup_id = absint( $item['popupId'] ?? 0 );
		$type     = $item['type'] ?? '';

		if ( 0 === $popup_id || ! in_array( $type, array( 'impression', 'close' ), true ) ) {
			return null;
		}

		return array(
			'popupId' => $popup_id,
			'type'    => $type,
		);
	}, $value ) ) );
}

/**
 * GET settings.
 */
function popup_manager_rest_get_settings(): \WP_REST_Response {
	return new \WP_REST_Response( popup_manager_get_settings(), 200 );
}

/**
 * POST settings.
 */
function popup_manager_rest_save_settings( \WP_REST_Request $request ): \WP_REST_Response {
	$settings = popup_manager_get_settings();

	$fields = array( 'defaultAnimation', 'defaultPosition', 'defaultFrequency', 'customCssClasses' );

	foreach ( $fields as $field ) {
		if ( $request->has_param( $field ) ) {
			$settings[ $field ] = $request->get_param( $field );
		}
	}

	update_option( 'popup_manager_settings', $settings );

	return new \WP_REST_Response( $settings, 200 );
}

/**
 * Sanitize a space-separated list of CSS class names.
 *
 * @param string $value Raw input.
 * @return string Sanitized class names.
 */
function popup_manager_sanitize_css_classes( $value ): string {
	if ( ! is_string( $value ) ) {
		return '';
	}

	// Split, sanitize each class individually, rejoin.
	$classes = array_filter( array_map( 'sanitize_html_class', explode( ' ', $value ) ) );

	return implode( ' ', $classes );
}

/**
 * Retrieve settings with defaults.
 */
function popup_manager_get_settings(): array {
	$defaults = array(
		'defaultAnimation' => 'fade',
		'defaultPosition'  => 'center',
		'defaultFrequency' => 'always',
		'customCssClasses' => '',
	);

	$saved = get_option( 'popup_manager_settings', array() );

	if ( ! is_array( $saved ) ) {
		$saved = array();
	}

	return wp_parse_args( $saved, $defaults );
}
