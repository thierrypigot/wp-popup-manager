<?php
/**
 * Register the "popup" Custom Post Type and associated post meta.
 *
 * @package PopupManager
 */

defined( 'ABSPATH' ) || exit;

add_action( 'init', 'popup_manager_register_cpt' );
add_action( 'init', 'popup_manager_register_meta' );

/**
 * Register the popup CPT.
 */
function popup_manager_register_cpt(): void {
	$labels = array(
		'name'                  => _x( 'Popups', 'Post type general name', 'wp-popup-manager' ),
		'singular_name'         => _x( 'Popup', 'Post type singular name', 'wp-popup-manager' ),
		'menu_name'             => __( 'Popups', 'wp-popup-manager' ),
		'add_new'               => __( 'Add New', 'wp-popup-manager' ),
		'add_new_item'          => __( 'Add New Popup', 'wp-popup-manager' ),
		'edit_item'             => __( 'Edit Popup', 'wp-popup-manager' ),
		'new_item'              => __( 'New Popup', 'wp-popup-manager' ),
		'view_item'             => __( 'View Popup', 'wp-popup-manager' ),
		'search_items'          => __( 'Search Popups', 'wp-popup-manager' ),
		'not_found'             => __( 'No popups found.', 'wp-popup-manager' ),
		'not_found_in_trash'    => __( 'No popups found in Trash.', 'wp-popup-manager' ),
		'all_items'             => __( 'All Popups', 'wp-popup-manager' ),
		'item_published'        => __( 'Popup published.', 'wp-popup-manager' ),
		'item_updated'          => __( 'Popup updated.', 'wp-popup-manager' ),
	);

	register_post_type( 'popup', array(
		'labels'            => $labels,
		'public'            => false,
		'show_ui'           => true,
		'show_in_rest'      => true,
		'show_in_menu'      => true,
		'menu_icon'         => 'dashicons-slides',
		'menu_position'     => 25,
		'supports'          => array( 'title', 'editor', 'custom-fields' ),
		'capability_type'   => 'post',
		'map_meta_cap'      => true,
		'has_archive'       => false,
		'rewrite'           => false,
		'template'          => array(
			array( 'core/heading', array( 'level' => 2, 'placeholder' => __( 'Popup title', 'wp-popup-manager' ) ) ),
			array( 'core/paragraph', array( 'placeholder' => __( 'Popup content…', 'wp-popup-manager' ) ) ),
		),
	) );
}

/**
 * Register post meta with REST schema.
 */
function popup_manager_register_meta(): void {

	// --- Triggers ---
	register_post_meta( 'popup', '_popup_triggers', array(
		'show_in_rest'  => array(
			'schema' => array(
				'type'  => 'array',
				'items' => array(
					'type'       => 'object',
					'properties' => array(
						'type'  => array(
							'type' => 'string',
							'enum' => array( 'click', 'on_load', 'exit_intent', 'scroll', 'inactivity' ),
						),
						'delay' => array(
							'type'    => 'integer',
							'default' => 0,
						),
						'threshold' => array(
							'type'    => 'integer',
							'default' => 50,
						),
					),
				),
			),
		),
		'single'        => true,
		'type'          => 'array',
		'default'       => array( array( 'type' => 'click' ) ),
		'auth_callback' => function () {
			return current_user_can( 'edit_posts' );
		},
		'sanitize_callback' => 'popup_manager_sanitize_triggers',
	) );

	// --- Conditions ---
	register_post_meta( 'popup', '_popup_conditions', array(
		'show_in_rest'  => array(
			'schema' => array(
				'type'  => 'array',
				'items' => array(
					'type'       => 'object',
					'properties' => array(
						'type'     => array(
							'type' => 'string',
							'enum' => array( 'page', 'post_type', 'date_range', 'time_range', 'user_role', 'device', 'referrer' ),
						),
						'ids'      => array(
							'type'  => 'array',
							'items' => array( 'type' => 'integer' ),
						),
						'values'   => array(
							'type'  => 'array',
							'items' => array( 'type' => 'string' ),
						),
						'operator' => array(
							'type'    => 'string',
							'enum'    => array( 'include', 'exclude' ),
							'default' => 'include',
						),
						'start'     => array( 'type' => 'string' ),
						'startTime' => array( 'type' => 'string' ),
						'end'       => array( 'type' => 'string' ),
						'endTime'   => array( 'type' => 'string' ),
						'pattern'   => array( 'type' => 'string' ),
					),
				),
			),
		),
		'single'        => true,
		'type'          => 'array',
		'default'       => array(),
		'auth_callback' => function () {
			return current_user_can( 'edit_posts' );
		},
		'sanitize_callback' => 'popup_manager_sanitize_conditions',
	) );

	// --- Display ---
	register_post_meta( 'popup', '_popup_display', array(
		'show_in_rest'  => array(
			'schema' => array(
				'type'       => 'object',
				'properties' => array(
					'animation'         => array(
						'type'    => 'string',
						'enum'    => array( 'fade', 'slide-up', 'scale', 'none' ),
						'default' => 'fade',
					),
					'position'          => array(
						'type'    => 'string',
						'enum'    => array( 'center', 'top', 'top-left', 'top-right', 'center-left', 'center-right', 'bottom', 'bottom-left', 'bottom-right', 'fullscreen' ),
						'default' => 'center',
					),
					'size'              => array(
						'type'    => 'string',
						'enum'    => array( 'small', 'medium', 'large', 'fullscreen' ),
						'default' => 'medium',
					),
					'overlay'           => array(
						'type'    => 'boolean',
						'default' => true,
					),
					'overlayColor'      => array(
						'type'    => 'string',
						'default' => 'rgba(0,0,0,0.5)',
					),
					'closeOnOverlayClick' => array(
						'type'    => 'boolean',
						'default' => true,
					),
					'closeOnEsc'        => array(
						'type'    => 'boolean',
						'default' => true,
					),
				),
			),
		),
		'single'        => true,
		'type'          => 'object',
		'default'       => array(
			'animation'           => 'fade',
			'position'            => 'center',
			'size'                => 'medium',
			'overlay'             => true,
			'overlayColor'        => 'rgba(0,0,0,0.5)',
			'closeOnOverlayClick' => true,
			'closeOnEsc'          => true,
		),
		'auth_callback' => function () {
			return current_user_can( 'edit_posts' );
		},
		'sanitize_callback' => 'popup_manager_sanitize_display',
	) );

	// --- Frequency ---
	register_post_meta( 'popup', '_popup_frequency', array(
		'show_in_rest'  => array(
			'schema' => array(
				'type'       => 'object',
				'properties' => array(
					'type'           => array(
						'type'    => 'string',
						'enum'    => array( 'always', 'once_per_session', 'once_per_day', 'once_ever' ),
						'default' => 'always',
					),
					'cookieDuration' => array(
						'type'    => 'integer',
						'default' => 30,
					),
				),
			),
		),
		'single'        => true,
		'type'          => 'object',
		'default'       => array(
			'type'           => 'always',
			'cookieDuration' => 30,
		),
		'auth_callback' => function () {
			return current_user_can( 'edit_posts' );
		},
		'sanitize_callback' => 'popup_manager_sanitize_frequency',
	) );

	// --- Analytics (opt-in) ---
	register_post_meta( 'popup', '_popup_analytics_enabled', array(
		'show_in_rest'      => true,
		'single'            => true,
		'type'              => 'boolean',
		'default'           => false,
		'auth_callback'     => function () {
			return current_user_can( 'edit_posts' );
		},
		'sanitize_callback' => 'rest_sanitize_boolean',
	) );
}

/**
 * Sanitize callbacks.
 *
 * @since 1.0.0
 */
function popup_manager_sanitize_triggers( $value ): array {
	if ( ! is_array( $value ) ) {
		return array( array( 'type' => 'click' ) );
	}

	$allowed_types = array( 'click', 'on_load', 'exit_intent', 'scroll', 'inactivity' );

	return array_values( array_filter( array_map( function ( $item ) use ( $allowed_types ) {
		if ( ! is_array( $item ) || empty( $item['type'] ) || ! in_array( $item['type'], $allowed_types, true ) ) {
			return null;
		}

		$clean = array( 'type' => $item['type'] );

		if ( isset( $item['delay'] ) ) {
			$clean['delay'] = absint( $item['delay'] );
		}
		if ( isset( $item['threshold'] ) ) {
			$clean['threshold'] = min( 100, max( 0, absint( $item['threshold'] ) ) );
		}

		return $clean;
	}, $value ) ) );
}

function popup_manager_sanitize_conditions( $value ): array {
	if ( ! is_array( $value ) ) {
		return array();
	}

	$allowed_types = array( 'page', 'post_type', 'date_range', 'time_range', 'user_role', 'device', 'referrer' );

	return array_values( array_filter( array_map( function ( $item ) use ( $allowed_types ) {
		if ( ! is_array( $item ) || empty( $item['type'] ) || ! in_array( $item['type'], $allowed_types, true ) ) {
			return null;
		}

		$clean = array( 'type' => $item['type'] );

		if ( isset( $item['ids'] ) && is_array( $item['ids'] ) ) {
			$clean['ids'] = array_map( 'absint', $item['ids'] );
		}
		if ( isset( $item['values'] ) && is_array( $item['values'] ) ) {
			$clean['values'] = array_map( 'sanitize_text_field', $item['values'] );
		}
		if ( isset( $item['operator'] ) ) {
			$clean['operator'] = in_array( $item['operator'], array( 'include', 'exclude' ), true )
				? $item['operator']
				: 'include';
		}
		if ( isset( $item['start'] ) ) {
			$clean['start'] = sanitize_text_field( $item['start'] );
		}
		if ( isset( $item['startTime'] ) ) {
			$clean['startTime'] = sanitize_text_field( $item['startTime'] );
		}
		if ( isset( $item['end'] ) ) {
			$clean['end'] = sanitize_text_field( $item['end'] );
		}
		if ( isset( $item['endTime'] ) ) {
			$clean['endTime'] = sanitize_text_field( $item['endTime'] );
		}
		if ( isset( $item['pattern'] ) ) {
			$clean['pattern'] = sanitize_text_field( $item['pattern'] );
		}

		return $clean;
	}, $value ) ) );
}

function popup_manager_sanitize_display( $value ): array {
	$defaults = array(
		'animation'           => 'fade',
		'position'            => 'center',
		'size'                => 'medium',
		'overlay'             => true,
		'overlayColor'        => 'rgba(0,0,0,0.5)',
		'closeOnOverlayClick' => true,
		'closeOnEsc'          => true,
	);

	if ( ! is_array( $value ) ) {
		return $defaults;
	}

	$clean = array();

	$clean['animation'] = isset( $value['animation'] ) && in_array( $value['animation'], array( 'fade', 'slide-up', 'scale', 'none' ), true )
		? $value['animation']
		: $defaults['animation'];

	$clean['position'] = isset( $value['position'] ) && in_array( $value['position'], array( 'center', 'top', 'top-left', 'top-right', 'center-left', 'center-right', 'bottom', 'bottom-left', 'bottom-right', 'fullscreen' ), true )
		? $value['position']
		: $defaults['position'];

	$clean['size'] = isset( $value['size'] ) && in_array( $value['size'], array( 'small', 'medium', 'large', 'fullscreen' ), true )
		? $value['size']
		: $defaults['size'];

	$clean['overlay']             = isset( $value['overlay'] ) ? (bool) $value['overlay'] : $defaults['overlay'];
	$clean['overlayColor']        = isset( $value['overlayColor'] ) ? sanitize_text_field( $value['overlayColor'] ) : $defaults['overlayColor'];
	$clean['closeOnOverlayClick'] = isset( $value['closeOnOverlayClick'] ) ? (bool) $value['closeOnOverlayClick'] : $defaults['closeOnOverlayClick'];
	$clean['closeOnEsc']          = isset( $value['closeOnEsc'] ) ? (bool) $value['closeOnEsc'] : $defaults['closeOnEsc'];

	return $clean;
}

function popup_manager_sanitize_frequency( $value ): array {
	$defaults = array(
		'type'           => 'always',
		'cookieDuration' => 30,
	);

	if ( ! is_array( $value ) ) {
		return $defaults;
	}

	$clean = array();

	$clean['type'] = isset( $value['type'] ) && in_array( $value['type'], array( 'always', 'once_per_session', 'once_per_day', 'once_ever' ), true )
		? $value['type']
		: $defaults['type'];

	$clean['cookieDuration'] = isset( $value['cookieDuration'] ) ? absint( $value['cookieDuration'] ) : $defaults['cookieDuration'];

	return $clean;
}
