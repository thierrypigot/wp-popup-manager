<?php
/**
 * Analytics columns in the popup list table.
 *
 * @package PopupManager
 */

defined( 'ABSPATH' ) || exit;

add_filter( 'manage_popup_posts_columns', 'popup_manager_analytics_column_header' );

function popup_manager_analytics_column_header( array $columns ): array {
	$insert_after = 'title';
	$position     = array_search( $insert_after, array_keys( $columns ), true );

	if ( false === $position ) {
		$columns['popup_analytics'] = __( 'Statistics', 'wp-popup-manager' );
		return $columns;
	}

	return array_merge(
		array_slice( $columns, 0, $position + 1 ),
		array( 'popup_analytics' => __( 'Statistics', 'wp-popup-manager' ) ),
		array_slice( $columns, $position + 1 )
	);
}

add_action( 'manage_popup_posts_custom_column', 'popup_manager_analytics_column_content', 10, 2 );

function popup_manager_analytics_column_content( string $column, int $post_id ): void {
	if ( 'popup_analytics' !== $column ) {
		return;
	}

	$enabled = (bool) get_post_meta( $post_id, '_popup_analytics_enabled', true );

	if ( ! $enabled ) {
		echo '<span aria-label="' . esc_attr__( 'Analytics disabled', 'wp-popup-manager' ) . '">—</span>';
		return;
	}

	$impressions = absint( get_post_meta( $post_id, '_popup_analytics_impressions', true ) );

	printf(
		'<span class="popup-manager-stats">%s&nbsp;%s</span>',
		esc_html( number_format_i18n( $impressions ) ),
		esc_html__( 'views', 'wp-popup-manager' )
	);
}

add_action( 'admin_head-edit.php', 'popup_manager_analytics_column_css' );

function popup_manager_analytics_column_css(): void {
	global $post_type;
	if ( 'popup' !== $post_type ) {
		return;
	}
	echo '<style>.column-popup_analytics { width: 160px; white-space: nowrap; } .popup-manager-stats { color: #50575e; font-variant-numeric: tabular-nums; }</style>';
}
