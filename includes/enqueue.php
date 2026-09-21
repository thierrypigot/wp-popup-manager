<?php
/**
 * Strict conditional loading — RGESN principle.
 *
 * If no popup is active on the current page,
 * the plugin injects absolutely nothing: no script, no style, no HTML markup.
 *
 * @package PopupManager
 * @since   1.0.0
 */

defined( 'ABSPATH' ) || exit;

add_action( 'wp', 'popup_manager_maybe_enqueue' );

/**
 * Determine if popups should be displayed and inject them.
 */
function popup_manager_maybe_enqueue(): void {
	// Do nothing in admin or AJAX/REST requests.
	if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return;
	}

	$queried_object_id = get_queried_object_id();
	$active_popups     = popup_manager_get_matching( $queried_object_id );

	if ( empty( $active_popups ) ) {
		return; // 0 bytes added to the page.
	}

	// Enqueue the script module (Interactivity API store).
	add_action( 'wp_enqueue_scripts', function () {
		wp_enqueue_script_module(
			'@popup-manager/view',
			POPUP_MANAGER_URL . 'build/blocks/popup/view.js',
			array( '@wordpress/interactivity' ),
			POPUP_MANAGER_VERSION
		);

		wp_enqueue_style(
			'popup-manager-front',
			POPUP_MANAGER_URL . 'build/blocks/popup/style-index.css',
			array(),
			POPUP_MANAGER_VERSION
		);
	} );

	// Inject popup HTML into the footer.
	add_action( 'wp_footer', function () use ( $active_popups ) {
		foreach ( $active_popups as $popup ) {
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- popup_manager_render_popup escapes internally.
			echo popup_manager_render_popup( $popup );
		}
	} );
}

/**
 * Read the attributes of the Popup frame block, when the popup content uses one.
 *
 * Only the first popup-manager/popup block at the root is considered: it is the
 * frame of the popup, everything else is content.
 *
 * @param string $content Raw post content of the popup.
 * @return array Block attributes, empty when the popup has no frame block.
 */
function popup_manager_get_frame_attributes( string $content ): array {
	if ( false === strpos( $content, 'popup-manager/popup' ) ) {
		return array();
	}

	foreach ( parse_blocks( $content ) as $block ) {
		if ( 'popup-manager/popup' === ( $block['blockName'] ?? '' ) ) {
			return is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array();
		}
	}

	return array();
}

/**
 * Translate the Popup block attributes into the class and style attributes
 * of the dialog element.
 *
 * @param array $attrs Attributes returned by popup_manager_get_frame_attributes().
 * @return array {
 *     @type string $class Space separated class list, always including popup-manager-dialog.
 *     @type string $style Inline declarations, empty when nothing is customised.
 * }
 */
function popup_manager_get_frame_presentation( array $attrs ): array {
	$classes = array( 'popup-manager-dialog' );
	$style   = '';

	// Custom values (padding, radius, custom colors, shadow).
	if ( ! empty( $attrs['style'] ) && is_array( $attrs['style'] ) ) {
		$generated = wp_style_engine_get_styles( $attrs['style'] );
		$style     = $generated['css'] ?? '';

		// Same marker classes as wp_apply_colors_support() on a custom color.
		if ( ! empty( $attrs['style']['color']['background'] ) ) {
			$classes[] = 'has-background';
		}
		if ( ! empty( $attrs['style']['color']['text'] ) ) {
			$classes[] = 'has-text-color';
		}
	}

	// Preset colors.
	if ( ! empty( $attrs['backgroundColor'] ) && is_string( $attrs['backgroundColor'] ) ) {
		$slug = sanitize_html_class( $attrs['backgroundColor'] );

		if ( $slug ) {
			$classes[] = 'has-background';
			$classes[] = 'has-' . $slug . '-background-color';
		}
	}

	if ( ! empty( $attrs['textColor'] ) && is_string( $attrs['textColor'] ) ) {
		$slug = sanitize_html_class( $attrs['textColor'] );

		if ( $slug ) {
			$classes[] = 'has-text-color';
			$classes[] = 'has-' . $slug . '-color';
		}
	}

	// Additional classes, including the is-style-* of the style variations.
	if ( ! empty( $attrs['className'] ) && is_string( $attrs['className'] ) ) {
		foreach ( preg_split( '/\s+/', $attrs['className'], -1, PREG_SPLIT_NO_EMPTY ) as $class ) {
			$clean = sanitize_html_class( $class );

			if ( $clean ) {
				$classes[] = $clean;
			}
		}
	}

	return array(
		'class' => implode( ' ', array_unique( $classes ) ),
		'style' => $style,
	);
}

/**
 * Generate the full HTML for a popup with Interactivity API directives.
 *
 * @param WP_Post $popup The popup post object.
 * @return string The popup HTML.
 */
function popup_manager_render_popup( WP_Post $popup ): string {
	$popup_id  = $popup->ID;
	$title     = get_the_title( $popup );
	$title_id   = 'popup-' . $popup_id . '-title';
	$content_id = 'popup-' . $popup_id . '-content';

	// Retrieve meta.
	$triggers  = get_post_meta( $popup_id, '_popup_triggers', true );
	$display   = get_post_meta( $popup_id, '_popup_display', true );
	$frequency = get_post_meta( $popup_id, '_popup_frequency', true );

	if ( ! is_array( $triggers ) ) {
		$triggers = array( array( 'type' => 'click' ) );
	}
	if ( ! is_array( $display ) ) {
		$display = array();
	}
	if ( ! is_array( $frequency ) ) {
		$frequency = array();
	}

	// Default values.
	$defaults = popup_manager_get_settings();

	$animation           = $display['animation'] ?? $defaults['defaultAnimation'] ?? 'fade';
	$position            = $display['position'] ?? $defaults['defaultPosition'] ?? 'center';
	$size                = $display['size'] ?? 'medium';
	$overlay             = $display['overlay'] ?? true;
	$overlay_color       = $display['overlayColor'] ?? 'rgba(0,0,0,0.5)';
	$close_on_overlay    = $display['closeOnOverlayClick'] ?? true;
	$close_on_esc        = $display['closeOnEsc'] ?? true;
	$frequency_type      = $frequency['type'] ?? $defaults['defaultFrequency'] ?? 'always';

	// Determine primary trigger.
	$primary_trigger = $triggers[0] ?? array( 'type' => 'click' );
	$trigger_type    = $primary_trigger['type'] ?? 'click';
	$delay           = absint( $primary_trigger['delay'] ?? 0 );
	$threshold       = absint( $primary_trigger['threshold'] ?? 50 );

	// Determine ARIA role.
	$is_auto_trigger = in_array( $trigger_type, array( 'on_load', 'exit_intent', 'scroll', 'inactivity' ), true );
	$role            = $is_auto_trigger ? 'alertdialog' : 'dialog';

	// Analytics opt-in.
	$analytics_enabled = (bool) get_post_meta( $popup_id, '_popup_analytics_enabled', true );

	// Interactivity API context.
	$context = array(
		'popupId'             => $popup_id,
		'isOpen'              => false,
		'triggerType'         => $trigger_type,
		'delay'               => $delay,
		'threshold'           => $threshold,
		'closeOnOverlayClick' => (bool) $close_on_overlay,
		'closeOnEsc'          => (bool) $close_on_esc,
		'frequencyType'       => $frequency_type,
		'analyticsEnabled'    => $analytics_enabled,
	);

	// Gutenberg content.
	$content = apply_filters( 'the_content', $popup->post_content ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Core filter.

	// Frame styling, driven by the Popup block when the content uses one.
	$frame = popup_manager_get_frame_presentation( popup_manager_get_frame_attributes( $popup->post_content ) );

	// Global custom CSS classes.
	$custom_classes = trim( $defaults['customCssClasses'] ?? '' );
	$wrapper_class  = 'popup-manager-wrapper' . ( $custom_classes ? ' ' . esc_attr( $custom_classes ) : '' );

	ob_start();
	?>
	<div
		class="<?php echo esc_attr( $wrapper_class ); ?>"
		data-popup-id="<?php echo esc_attr( $popup_id ); ?>"
		data-wp-interactive="popup-manager"
		<?php
		echo wp_interactivity_data_wp_context( $context ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Core function, pre-escaped.
		?>
		data-wp-init="callbacks.initTrigger"
		data-wp-on--keydown="actions.handleKeydown"
		data-wp-watch="callbacks.watchOpenState"
		data-wp-class--is-open="context.isOpen"
	>
		<?php // Hidden button to let the external trigger open in the correct context. ?>
		<button
			type="button"
			data-wp-on--click="actions.openFromTrigger"
			hidden
			aria-hidden="true"
			tabindex="-1"
		></button>

		<?php if ( $overlay ) : ?>
		<div
			class="popup-manager-overlay"
			data-wp-on--click="actions.closeFromOverlay"
			style="background:<?php echo esc_attr( $overlay_color ); ?>"
			role="presentation"
			aria-hidden="true"
		></div>
		<?php endif; ?>

		<div
			role="<?php echo esc_attr( $role ); ?>"
			aria-modal="true"
			aria-labelledby="<?php echo esc_attr( $title_id ); ?>"
			<?php if ( $is_auto_trigger ) : ?>aria-describedby="<?php echo esc_attr( $content_id ); ?>"<?php endif; ?>
			class="<?php echo esc_attr( $frame['class'] ); ?>"
			<?php if ( '' !== $frame['style'] ) : ?>style="<?php echo esc_attr( $frame['style'] ); ?>"<?php endif; ?>
			data-animation="<?php echo esc_attr( $animation ); ?>"
			data-position="<?php echo esc_attr( $position ); ?>"
			data-size="<?php echo esc_attr( $size ); ?>"
			aria-hidden="true"
			data-wp-bind--aria-hidden="state.isHidden"
		>
			<span id="<?php echo esc_attr( $title_id ); ?>" class="popup-manager-title screen-reader-only">
				<?php echo esc_html( $title ); ?>
			</span>

			<button
				type="button"
				class="popup-manager-close"
				aria-label="<?php echo esc_attr__( 'Close', 'wp-popup-manager' ); ?>"
				data-wp-on--click="actions.close"
			>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>

			<div id="<?php echo esc_attr( $content_id ); ?>" class="popup-manager-content">
				<?php
				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Already escaped by the_content filter.
				echo $content;
				?>
			</div>
		</div>

		<div class="popup-manager-live screen-reader-only" aria-live="assertive" aria-atomic="true"></div>
	</div>
	<?php
	return ob_get_clean();
}
