<?php
/**
 * Appearance of the popup frame: block style variations and the theme.json
 * settings the frame controls depend on.
 *
 * @package PopupManager
 * @since   1.1.0
 */

defined( 'ABSPATH' ) || exit;

add_action( 'init', 'popup_manager_register_block_styles', 20 );
add_filter( 'wp_theme_json_data_default', 'popup_manager_filter_theme_json_default' );

/**
 * Register the two frame variations of the Popup block.
 *
 * "Framed" carries no style data on purpose: its rendering comes from the
 * default values of the --pm-dialog-* custom properties, which keeps global
 * styles and theme.json able to override the frame.
 */
function popup_manager_register_block_styles(): void {
	register_block_style(
		'popup-manager/popup',
		array(
			'name'       => 'framed',
			'label'      => __( 'Framed', 'wp-popup-manager' ),
			'is_default' => true,
		)
	);

	register_block_style(
		'popup-manager/popup',
		array(
			'name'       => 'borderless',
			'label'      => __( 'Borderless', 'wp-popup-manager' ),
			'style_data' => array(
				'color'   => array(
					'background' => 'transparent',
				),
				'spacing' => array(
					'padding' => array(
						'top'    => '0',
						'right'  => '0',
						'bottom' => '0',
						'left'   => '0',
					),
				),
				'shadow'  => 'none',
			),
		)
	);
}

/**
 * Enable, for the Popup block only, the settings its frame controls need.
 *
 * Core disables spacing.padding and border.radius by default, so without this
 * the inspector would show no control on themes that do not opt in. Applied to
 * the default layer: a theme can still turn any of them off.
 *
 * @param WP_Theme_JSON_Data $theme_json Default theme.json data.
 * @return WP_Theme_JSON_Data
 */
function popup_manager_filter_theme_json_default( $theme_json ) {
	if ( ! is_object( $theme_json ) || ! method_exists( $theme_json, 'update_with' ) ) {
		return $theme_json;
	}

	return $theme_json->update_with(
		array(
			'version'  => 3,
			'settings' => array(
				'blocks' => array(
					'popup-manager/popup' => array(
						'border'  => array( 'radius' => true ),
						'color'   => array(
							'background' => true,
							'text'       => true,
						),
						'spacing' => array( 'padding' => true ),
					),
				),
			),
		)
	);
}
