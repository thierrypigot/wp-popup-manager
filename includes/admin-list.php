<?php
/**
 * On/off switch of published popups in the list table: "Active" column,
 * "Active" / "Inactive" views and bulk actions.
 *
 * The switch only applies to published popups. Until then it stays off and
 * cannot be used. A disabled popup keeps its publication status but
 * is never emitted on the front.
 *
 * @package PopupManager
 * @since   1.3.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Whether a popup is enabled. Popups saved before 1.3.0 have no meta: enabled.
 *
 * @param int $post_id Popup ID.
 * @return bool
 */
function popup_manager_is_enabled( int $post_id ): bool {
	return (bool) get_post_meta( $post_id, '_popup_enabled', true );
}

/**
 * Save the switch state.
 *
 * The meta is always written, even when disabled: a missing meta falls back to
 * the default (enabled). The boolean sanitize callback stores '1' or ''.
 *
 * @param int  $post_id Popup ID.
 * @param bool $enabled New state.
 */
function popup_manager_set_enabled( int $post_id, bool $enabled ): void {
	update_post_meta( $post_id, '_popup_enabled', $enabled );
}

/**
 * Meta query matching the active or inactive popups.
 *
 * @param bool $enabled True for active popups, false for inactive ones.
 * @return array
 */
function popup_manager_enabled_meta_query( bool $enabled ): array {
	if ( ! $enabled ) {
		return array(
			array(
				'key'     => '_popup_enabled',
				'value'   => array( '', '0' ),
				'compare' => 'IN',
			),
		);
	}

	return array(
		'relation' => 'OR',
		array(
			'key'     => '_popup_enabled',
			'compare' => 'NOT EXISTS',
		),
		array(
			'key'     => '_popup_enabled',
			'value'   => array( '', '0' ),
			'compare' => 'NOT IN',
		),
	);
}

/**
 * Invalidate the published popups cache whenever the switch changes, from the
 * list table or from the editor. The REST API saves meta after save_post, so
 * the save_post_popup invalidation alone could cache the previous value.
 *
 * @param int|int[] $meta_id  Meta ID(s).
 * @param int       $post_id  Post ID.
 * @param string    $meta_key Meta key.
 */
function popup_manager_enabled_flush_cache( $meta_id, $post_id, $meta_key ): void {
	if ( '_popup_enabled' === $meta_key ) {
		delete_transient( 'popup_manager_published' );
	}
}
add_action( 'added_post_meta', 'popup_manager_enabled_flush_cache', 10, 3 );
add_action( 'updated_post_meta', 'popup_manager_enabled_flush_cache', 10, 3 );
add_action( 'deleted_post_meta', 'popup_manager_enabled_flush_cache', 10, 3 );

add_action( 'transition_post_status', 'popup_manager_enable_on_publish', 10, 3 );
add_action( 'rest_after_insert_popup', 'popup_manager_enable_on_publish_rest' );

/**
 * Publishing a popup puts it online: a popup switched off, then moved back to
 * draft, is active again when it is published (or when its schedule is reached).
 *
 * @param string  $new_status New post status.
 * @param string  $old_status Old post status.
 * @param WP_Post $post       Post object.
 */
function popup_manager_enable_on_publish( string $new_status, string $old_status, WP_Post $post ): void {
	if ( 'popup' === $post->post_type && 'publish' === $new_status && 'publish' !== $old_status ) {
		delete_post_meta( $post->ID, '_popup_enabled' );
		popup_manager_just_published( $post->ID );
	}
}

/**
 * The block editor sends the whole meta object, switch included, and the REST
 * API saves it after the status transition: reset the switch again.
 *
 * @param WP_Post $post Inserted or updated popup.
 */
function popup_manager_enable_on_publish_rest( WP_Post $post ): void {
	if ( in_array( $post->ID, popup_manager_just_published(), true ) ) {
		delete_post_meta( $post->ID, '_popup_enabled' );
	}
}

/**
 * Popups published during the current request.
 *
 * @param int $post_id Popup to record, 0 to read only.
 * @return int[]
 */
function popup_manager_just_published( int $post_id = 0 ): array {
	static $ids = array();

	if ( $post_id ) {
		$ids[] = $post_id;
	}

	return $ids;
}

/*
 * Column.
 */

add_filter( 'manage_popup_posts_columns', 'popup_manager_enabled_column_header', 20 );

function popup_manager_enabled_column_header( array $columns ): array {
	$position = array_search( 'title', array_keys( $columns ), true );
	$column   = array( 'popup_enabled' => _x( 'Active', 'list table column', 'wp-popup-manager' ) );

	if ( false === $position ) {
		return array_merge( $columns, $column );
	}

	return array_merge(
		array_slice( $columns, 0, $position ),
		$column,
		array_slice( $columns, $position )
	);
}

add_action( 'manage_popup_posts_custom_column', 'popup_manager_enabled_column_content', 10, 2 );

function popup_manager_enabled_column_content( string $column, int $post_id ): void {
	if ( 'popup_enabled' !== $column ) {
		return;
	}

	$status       = get_post_status( $post_id );
	$is_published = 'publish' === $status;
	$enabled      = $is_published && popup_manager_is_enabled( $post_id );
	$hint         = '';

	// Until the popup is published, the switch stays off and cannot be used.
	if ( 'future' === $status ) {
		/* translators: %s: scheduled publication date. */
		$hint = sprintf( __( 'Scheduled for %s. The popup can be enabled once published.', 'wp-popup-manager' ), get_the_date( '', $post_id ) );
	} elseif ( ! $is_published ) {
		$hint = __( 'Publish the popup to be able to enable it.', 'wp-popup-manager' );
	}

	printf(
		'<button type="button" class="popup-manager-switch" role="switch" aria-checked="%1$s" aria-label="%2$s" data-popup-id="%3$d"%4$s%5$s><span class="popup-manager-switch__track" aria-hidden="true"></span></button>',
		$enabled ? 'true' : 'false',
		/* translators: %s: popup title. */
		esc_attr( sprintf( __( 'Enable “%s”', 'wp-popup-manager' ), get_the_title( $post_id ) ) ),
		absint( $post_id ),
		$is_published && current_user_can( 'edit_post', $post_id ) ? '' : ' aria-disabled="true"',
		'' !== $hint ? ' title="' . esc_attr( $hint ) . '"' : ''
	);
}

/*
 * Switch (AJAX).
 */

add_action( 'wp_ajax_popup_manager_toggle_enabled', 'popup_manager_ajax_toggle_enabled' );

function popup_manager_ajax_toggle_enabled(): void {
	check_ajax_referer( 'popup_manager_toggle_enabled' );

	$post_id = absint( $_POST['popup_id'] ?? 0 );
	$post    = get_post( $post_id );

	if ( ! $post || 'popup' !== $post->post_type || 'publish' !== $post->post_status ) {
		wp_send_json_error( null, 404 );
	}

	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		wp_send_json_error( null, 403 );
	}

	popup_manager_set_enabled( $post_id, rest_sanitize_boolean( wp_unslash( $_POST['enabled'] ?? '' ) ) );

	wp_send_json_success( array( 'enabled' => popup_manager_is_enabled( $post_id ) ) );
}

/*
 * Views "Active" / "Inactive".
 */

add_filter( 'views_edit-popup', 'popup_manager_enabled_views' );

function popup_manager_enabled_views( array $views ): array {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only list filter.
	$current = isset( $_GET['popup_enabled'] ) ? sanitize_key( wp_unslash( $_GET['popup_enabled'] ) ) : '';

	$items = array(
		'active'   => array(
			'label' => __( 'Active', 'wp-popup-manager' ),
			'value' => '1',
			'query' => true,
		),
		'inactive' => array(
			'label' => __( 'Inactive', 'wp-popup-manager' ),
			'value' => '0',
			'query' => false,
		),
	);

	foreach ( $items as $key => $item ) {
		$query = new WP_Query( array(
			'post_type'      => 'popup',
			'post_status'    => 'publish',
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'meta_query'     => popup_manager_enabled_meta_query( $item['query'] ), // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- Few popups.
		) );

		$is_current = $item['value'] === $current;

		$views[ 'popup_' . $key ] = sprintf(
			'<a href="%1$s"%2$s>%3$s <span class="count">(<span class="popup-manager-count-%4$s">%5$s</span>)</span></a>',
			esc_url( add_query_arg( array( 'post_type' => 'popup', 'popup_enabled' => $item['value'] ), admin_url( 'edit.php' ) ) ),
			$is_current ? ' class="current" aria-current="page"' : '',
			esc_html( $item['label'] ),
			esc_attr( $key ),
			esc_html( number_format_i18n( $query->found_posts ) )
		);
	}

	return $views;
}

add_action( 'pre_get_posts', 'popup_manager_enabled_filter_list' );

function popup_manager_enabled_filter_list( WP_Query $query ): void {
	if ( ! is_admin() || ! $query->is_main_query() || 'popup' !== $query->get( 'post_type' ) ) {
		return;
	}

	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only list filter.
	if ( ! isset( $_GET['popup_enabled'] ) || ! in_array( $_GET['popup_enabled'], array( '0', '1' ), true ) ) {
		return;
	}

	$query->set( 'post_status', 'publish' );
	$query->set( 'meta_query', popup_manager_enabled_meta_query( '1' === $_GET['popup_enabled'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended, WordPress.DB.SlowDBQuery.slow_db_query_meta_query
}

/*
 * Bulk actions.
 */

add_filter( 'bulk_actions-edit-popup', 'popup_manager_enabled_bulk_actions' );

function popup_manager_enabled_bulk_actions( array $actions ): array {
	return array_merge(
		array(
			'popup_manager_enable'  => __( 'Enable', 'wp-popup-manager' ),
			'popup_manager_disable' => __( 'Disable', 'wp-popup-manager' ),
		),
		$actions
	);
}

add_filter( 'handle_bulk_actions-edit-popup', 'popup_manager_enabled_handle_bulk_actions', 10, 3 );

/**
 * Apply the bulk action. WordPress has already checked the bulk-posts nonce.
 *
 * @param string $redirect_to Redirect URL.
 * @param string $action      Bulk action.
 * @param int[]  $post_ids    Selected popups.
 * @return string
 */
function popup_manager_enabled_handle_bulk_actions( string $redirect_to, string $action, array $post_ids ): string {
	if ( ! in_array( $action, array( 'popup_manager_enable', 'popup_manager_disable' ), true ) ) {
		return $redirect_to;
	}

	$enabled = 'popup_manager_enable' === $action;
	$done    = 0;
	$skipped = 0;

	foreach ( array_map( 'absint', $post_ids ) as $post_id ) {
		if ( 'popup' !== get_post_type( $post_id ) || 'publish' !== get_post_status( $post_id ) || ! current_user_can( 'edit_post', $post_id ) ) {
			++$skipped;
			continue;
		}

		popup_manager_set_enabled( $post_id, $enabled );
		++$done;
	}

	return add_query_arg(
		array(
			'popup_manager_bulk'    => $enabled ? 'enabled' : 'disabled',
			'popup_manager_done'    => $done,
			'popup_manager_skipped' => $skipped,
		),
		$redirect_to
	);
}

add_filter( 'removable_query_args', function ( array $args ): array {
	return array_merge( $args, array( 'popup_manager_bulk', 'popup_manager_done', 'popup_manager_skipped' ) );
} );

add_action( 'admin_notices', 'popup_manager_enabled_bulk_notice' );

function popup_manager_enabled_bulk_notice(): void {
	$screen = get_current_screen();

	// phpcs:disable WordPress.Security.NonceVerification.Recommended -- Display only.
	if ( ! $screen || 'edit-popup' !== $screen->id || empty( $_GET['popup_manager_bulk'] ) ) {
		return;
	}

	$enabled = 'enabled' === $_GET['popup_manager_bulk'];
	$done    = absint( $_GET['popup_manager_done'] ?? 0 );
	$skipped = absint( $_GET['popup_manager_skipped'] ?? 0 );
	// phpcs:enable

	$messages = array();

	if ( $done ) {
		$messages[] = sprintf(
			$enabled
				/* translators: %s: number of popups. */
				? _n( '%s popup enabled.', '%s popups enabled.', $done, 'wp-popup-manager' )
				/* translators: %s: number of popups. */
				: _n( '%s popup disabled.', '%s popups disabled.', $done, 'wp-popup-manager' ),
			number_format_i18n( $done )
		);
	}

	if ( $skipped ) {
		$messages[] = sprintf(
			/* translators: %s: number of popups. */
			_n(
				'%s popup ignored: only published popups can be enabled or disabled.',
				'%s popups ignored: only published popups can be enabled or disabled.',
				$skipped,
				'wp-popup-manager'
			),
			number_format_i18n( $skipped )
		);
	}

	if ( $messages ) {
		wp_admin_notice(
			esc_html( implode( ' ', $messages ) ),
			array(
				'type'        => $skipped && ! $done ? 'warning' : 'success',
				'dismissible' => true,
			)
		);
	}
}

/*
 * Assets.
 */

add_action( 'admin_enqueue_scripts', 'popup_manager_enabled_column_assets' );

function popup_manager_enabled_column_assets( string $hook ): void {
	if ( 'edit.php' !== $hook ) {
		return;
	}

	global $post_type;
	if ( 'popup' !== $post_type ) {
		return;
	}

	$css = '
		.fixed .column-popup_enabled { width: 70px; }
		.popup-manager-switch { position: relative; display: inline-flex; align-items: center; min-width: 44px; min-height: 44px; margin: -10px 0; padding: 0; border: 0; background: none; cursor: pointer; }
		.popup-manager-switch__track { position: relative; width: 36px; height: 20px; border-radius: 10px; background: #8c8f94; transition: background-color .15s ease; }
		.popup-manager-switch__track::after { content: ""; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: transform .15s ease; }
		.popup-manager-switch[aria-checked="true"] .popup-manager-switch__track { background: var(--wp-admin-theme-color, #2271b1); }
		.popup-manager-switch[aria-checked="true"] .popup-manager-switch__track::after { transform: translateX(16px); }
		.popup-manager-switch:focus-visible { outline: 2px solid var(--wp-admin-theme-color, #2271b1); outline-offset: 2px; border-radius: 12px; }
		.popup-manager-switch[aria-disabled="true"] { cursor: not-allowed; opacity: .5; }
		.popup-manager-switch[aria-busy="true"] { cursor: progress; opacity: .6; }
		@media (prefers-reduced-motion: reduce) { .popup-manager-switch__track, .popup-manager-switch__track::after { transition: none; } }
	';

	wp_register_style( 'popup-manager-admin-list', false );
	wp_enqueue_style( 'popup-manager-admin-list' );
	wp_add_inline_style( 'popup-manager-admin-list', $css );

	$config = array(
		'ajaxUrl' => admin_url( 'admin-ajax.php' ),
		'nonce'   => wp_create_nonce( 'popup_manager_toggle_enabled' ),
		'error'   => __( 'The change could not be saved.', 'wp-popup-manager' ),
	);

	$js = '
		( function ( config ) {
			// Keep the "Active" / "Inactive" view counters in sync with the switches.
			function shiftCounts( enabled ) {
				[ [ "active", enabled ? 1 : -1 ], [ "inactive", enabled ? -1 : 1 ] ].forEach( function ( pair ) {
					var count = document.querySelector( ".popup-manager-count-" + pair[ 0 ] );
					if ( count ) {
						count.textContent = Math.max( 0, parseInt( count.textContent.replace( /\D/g, "" ), 10 ) + pair[ 1 ] );
					}
				} );
			}

			document.addEventListener( "click", function ( event ) {
				var button = event.target.closest( ".popup-manager-switch" );

				if ( ! button || "true" === button.getAttribute( "aria-disabled" ) || "true" === button.getAttribute( "aria-busy" ) ) {
					return;
				}

				var next = "true" !== button.getAttribute( "aria-checked" );
				var body = new URLSearchParams( {
					action: "popup_manager_toggle_enabled",
					_ajax_nonce: config.nonce,
					popup_id: button.dataset.popupId,
					enabled: next ? "1" : "0"
				} );

				button.setAttribute( "aria-busy", "true" );
				button.setAttribute( "aria-checked", next ? "true" : "false" );

				fetch( config.ajaxUrl, { method: "POST", credentials: "same-origin", body: body } )
					.then( function ( response ) { return response.json(); } )
					.then( function ( result ) {
						if ( ! result || ! result.success ) {
							throw new Error();
						}
						button.setAttribute( "aria-checked", result.data.enabled ? "true" : "false" );
						shiftCounts( result.data.enabled );
					} )
					.catch( function () {
						button.setAttribute( "aria-checked", next ? "false" : "true" );
						window.alert( config.error );
					} )
					.finally( function () {
						button.removeAttribute( "aria-busy" );
					} );
			} );
		} )( ' . wp_json_encode( $config ) . ' );
	';

	wp_register_script( 'popup-manager-admin-list', false, array(), POPUP_MANAGER_VERSION, true );
	wp_enqueue_script( 'popup-manager-admin-list' );
	wp_add_inline_script( 'popup-manager-admin-list', $js );
}
