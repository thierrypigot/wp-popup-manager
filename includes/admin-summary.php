<?php
/**
 * "Setup" column in the popup list table: trigger, display conditions,
 * options, and a thumbnail of the appearance (position, size, overlay).
 *
 * Read only. Combinations that prevent the popup from ever showing are
 * flagged: date range over, or ending before the scheduled publication.
 *
 * @package PopupManager
 * @since   1.3.0
 */

defined( 'ABSPATH' ) || exit;

add_filter( 'manage_popup_posts_columns', 'popup_manager_summary_column_header', 30 );

function popup_manager_summary_column_header( array $columns ): array {
	$position = array_search( 'title', array_keys( $columns ), true );
	$column   = array( 'popup_summary' => __( 'Setup', 'wp-popup-manager' ) );

	if ( false === $position ) {
		return array_merge( $columns, $column );
	}

	return array_merge(
		array_slice( $columns, 0, $position + 1 ),
		$column,
		array_slice( $columns, $position + 1 )
	);
}

add_action( 'manage_popup_posts_custom_column', 'popup_manager_summary_column_content', 10, 2 );

function popup_manager_summary_column_content( string $column, int $post_id ): void {
	if ( 'popup_summary' !== $column ) {
		return;
	}

	$settings  = popup_manager_get_settings();
	$triggers  = get_post_meta( $post_id, '_popup_triggers', true );
	$trigger   = is_array( $triggers ) && is_array( $triggers[0] ?? null ) ? $triggers[0] : array( 'type' => 'click' );
	$display   = get_post_meta( $post_id, '_popup_display', true );
	$display   = is_array( $display ) ? $display : array();
	$frequency = get_post_meta( $post_id, '_popup_frequency', true );
	$frequency = is_array( $frequency ) ? $frequency : array();

	$conditions = get_post_meta( $post_id, '_popup_conditions', true );
	$conditions = is_array( $conditions ) ? $conditions : array();

	$options = array(
		popup_manager_summary_frequency( $frequency['type'] ?? $settings['defaultFrequency'] ?? 'always' ),
		/* translators: %s: animation name. */
		sprintf( __( 'Animation: %s', 'wp-popup-manager' ), popup_manager_summary_animation( $display, $settings ) ),
	);

	if ( false === ( $display['closeOnEsc'] ?? true ) ) {
		$options[] = __( 'Escape key disabled', 'wp-popup-manager' );
	}
	if ( ( $display['overlay'] ?? true ) && false === ( $display['closeOnOverlayClick'] ?? true ) ) {
		$options[] = __( 'Overlay click disabled', 'wp-popup-manager' );
	}

	echo '<div class="popup-manager-summary">';

	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in popup_manager_summary_thumbnail().
	echo popup_manager_summary_thumbnail( $display, $settings );

	echo '<dl class="popup-manager-summary__list">';

	popup_manager_summary_row( __( 'Trigger', 'wp-popup-manager' ), array( popup_manager_summary_trigger( $trigger ) ) );
	popup_manager_summary_row( __( 'Display', 'wp-popup-manager' ), popup_manager_summary_conditions( $conditions, $post_id ) );
	popup_manager_summary_row( __( 'Options', 'wp-popup-manager' ), array_map( function ( $label ) {
		return array( 'label' => $label );
	}, $options ) );

	echo '</dl></div>';
}

/**
 * Print a row of chips.
 *
 * @param string $term  Row label.
 * @param array  $chips List of array( 'label' => string, 'state' => ''|'warning'|'muted', 'title' => string ).
 */
function popup_manager_summary_row( string $term, array $chips ): void {
	echo '<div class="popup-manager-summary__row"><dt>' . esc_html( $term ) . '</dt><dd>';

	foreach ( $chips as $chip ) {
		$state = $chip['state'] ?? '';

		printf(
			'<span class="popup-manager-chip%1$s"%2$s>%3$s%4$s</span> ',
			$state ? ' popup-manager-chip--' . esc_attr( $state ) : '',
			! empty( $chip['title'] ) ? ' title="' . esc_attr( $chip['title'] ) . '"' : '',
			'warning' === $state ? '<span class="screen-reader-text">' . esc_html__( 'Warning:', 'wp-popup-manager' ) . ' </span>' : '',
			esc_html( $chip['label'] )
		);
	}

	echo '</dd></div>';
}

/**
 * Human readable trigger.
 *
 * @param array $trigger First trigger of the popup.
 * @return array Chip.
 */
function popup_manager_summary_trigger( array $trigger ): array {
	switch ( $trigger['type'] ?? 'click' ) {
		case 'on_load':
			$delay = absint( $trigger['delay'] ?? 0 );
			return array(
				'label' => $delay
					/* translators: %s: delay in seconds. */
					? sprintf( __( 'Page load, after %s s', 'wp-popup-manager' ), number_format_i18n( $delay ) )
					: __( 'Page load', 'wp-popup-manager' ),
			);

		case 'scroll':
			/* translators: %s: scroll percentage. */
			return array( 'label' => sprintf( __( 'Scroll to %s %%', 'wp-popup-manager' ), number_format_i18n( absint( $trigger['threshold'] ?? 50 ) ) ) );

		case 'section':
			$anchor = popup_manager_sanitize_anchor( $trigger['anchor'] ?? '' );

			if ( '' === $anchor ) {
				return array(
					'label' => __( 'Section reached, no anchor: never shown', 'wp-popup-manager' ),
					'state' => 'warning',
				);
			}

			/* translators: %s: HTML anchor. */
			return array( 'label' => sprintf( __( 'Section #%s reached', 'wp-popup-manager' ), $anchor ) );

		case 'exit_intent':
			return array( 'label' => __( 'Exit intent', 'wp-popup-manager' ) );

		case 'inactivity':
			/* translators: %s: delay in seconds. */
			return array( 'label' => sprintf( __( 'Inactivity of %s s', 'wp-popup-manager' ), number_format_i18n( absint( $trigger['delay'] ?? 30 ) ) ) );

		default:
			return array( 'label' => __( 'Click on a trigger button', 'wp-popup-manager' ) );
	}
}

/**
 * Human readable frequency.
 *
 * @param string $type Frequency type.
 * @return string
 */
function popup_manager_summary_frequency( string $type ): string {
	$labels = array(
		'always'           => __( 'Every visit', 'wp-popup-manager' ),
		'once_per_session' => __( 'Once per session', 'wp-popup-manager' ),
		'once_per_day'     => __( 'Once per day', 'wp-popup-manager' ),
		'once_ever'        => __( 'Once ever', 'wp-popup-manager' ),
	);

	return $labels[ $type ] ?? $labels['always'];
}

/**
 * Display conditions as chips.
 *
 * @param array $conditions Conditions meta.
 * @param int   $post_id    Popup ID.
 * @return array Chips.
 */
function popup_manager_summary_conditions( array $conditions, int $post_id ): array {
	$chips = array();

	foreach ( $conditions as $condition ) {
		if ( ! is_array( $condition ) ) {
			continue;
		}

		$exclude = 'exclude' === ( $condition['operator'] ?? 'include' );
		$values  = array_filter( (array) ( $condition['values'] ?? array() ), 'is_string' );

		switch ( $condition['type'] ?? '' ) {
			case 'page':
				$ids = array_filter( array_map( 'absint', (array) ( $condition['ids'] ?? array() ) ) );

				if ( ! $ids ) {
					break;
				}

				$count = count( $ids );
				$label = $exclude
					/* translators: %s: number of contents. */
					? sprintf( _n( 'Except %s content', 'Except %s contents', $count, 'wp-popup-manager' ), number_format_i18n( $count ) )
					/* translators: %s: number of contents. */
					: sprintf( _n( '%s content', '%s contents', $count, 'wp-popup-manager' ), number_format_i18n( $count ) );

				// Tooltip: count per content type, then the first titles.
				$per_type = array();
				foreach ( $ids as $id ) {
					$type_object = get_post_type_object( (string) get_post_type( $id ) );
					$type_name   = $type_object ? $type_object->labels->singular_name : __( 'Deleted', 'wp-popup-manager' );

					$per_type[ $type_name ] = ( $per_type[ $type_name ] ?? 0 ) + 1;
				}

				$details = array();
				foreach ( $per_type as $type_name => $type_count ) {
					$details[] = $type_name . ' × ' . number_format_i18n( $type_count );
				}

				$titles = array_filter( array_map( 'get_the_title', array_slice( $ids, 0, 10 ) ) );

				$chips[] = array(
					'label' => $label,
					'title' => $titles
						/* translators: 1: taxonomy name, 2: list of terms. */
						? sprintf( __( '%1$s: %2$s', 'wp-popup-manager' ), implode( ', ', $details ), implode( ', ', $titles ) . ( $count > 10 ? '…' : '' ) )
						: implode( ', ', $details ),
				);
				break;

			case 'post_type':
				if ( ! $values ) {
					break;
				}

				$names = array_map( function ( $type ) {
					$object = get_post_type_object( $type );
					return $object ? $object->labels->singular_name : $type;
				}, $values );

				$chips[] = array(
					'type'  => 'post_type',
					'label' => implode( ', ', $names ),
				);
				break;

			case 'taxonomy':
				$taxonomy = get_taxonomy( $condition['taxonomy'] ?? '' );
				$term_ids = array_filter( array_map( 'absint', (array) ( $condition['ids'] ?? array() ) ) );

				if ( ! $taxonomy || ! $term_ids ) {
					break;
				}

				$names = array();
				foreach ( $term_ids as $term_id ) {
					$term    = get_term( $term_id, $taxonomy->name );
					$names[] = $term instanceof WP_Term ? $term->name : '#' . $term_id;
				}

				$format = $exclude
					/* translators: 1: taxonomy name, 2: list of terms. */
					? __( '%1$s: all except %2$s', 'wp-popup-manager' )
					/* translators: 1: taxonomy name, 2: list of terms. */
					: __( '%1$s: %2$s', 'wp-popup-manager' );

				$chips[] = array(
					'type'  => 'taxonomy',
					'label' => sprintf( $format, $taxonomy->labels->name, implode( ', ', $names ) ),
					'title' => implode( ' · ', array_filter( array(
						is_taxonomy_hierarchical( $taxonomy->name ) && ( $condition['children'] ?? true ) ? __( 'Child terms included', 'wp-popup-manager' ) : '',
						( $condition['archives'] ?? true ) ? __( 'Term archives included', 'wp-popup-manager' ) : __( 'Contents only, not the archives', 'wp-popup-manager' ),
					) ) ),
				);
				break;

			case 'date_range':
				$chip = popup_manager_summary_date_range( $condition, $post_id );
				if ( $chip ) {
					$chips[] = $chip;
				}
				break;

			case 'time_range':
				$start = $condition['startTime'] ?? '';
				$end   = $condition['endTime'] ?? '';

				if ( '' === $start && '' === $end ) {
					break;
				}

				$chips[] = array(
					/* translators: 1: start time, 2: end time. */
					'label' => sprintf( __( '%1$s – %2$s', 'wp-popup-manager' ), $start ? $start : '00:00', $end ? $end : '23:59' ),
				);
				break;

			case 'user_role':
				if ( ! $values ) {
					break;
				}

				$role_names = wp_roles()->get_names();
				$names      = array_map( function ( $role ) use ( $role_names ) {
					if ( 'logged_out' === $role ) {
						return __( 'Logged-out visitors', 'wp-popup-manager' );
					}
					return isset( $role_names[ $role ] ) ? translate_user_role( $role_names[ $role ] ) : $role;
				}, $values );

				$chips[] = array(
					/* translators: %s: list of roles. */
					'label' => $exclude ? sprintf( __( 'Except %s', 'wp-popup-manager' ), implode( ', ', $names ) ) : implode( ', ', $names ),
				);
				break;

			case 'device':
				if ( ! $values ) {
					break;
				}

				$devices = array(
					'desktop' => __( 'Desktop', 'wp-popup-manager' ),
					'tablet'  => __( 'Tablet', 'wp-popup-manager' ),
					'mobile'  => __( 'Mobile', 'wp-popup-manager' ),
				);

				$chips[] = array(
					'label' => implode( ', ', array_map( function ( $device ) use ( $devices ) {
						return $devices[ $device ] ?? $device;
					}, $values ) ),
				);
				break;

			case 'referrer':
				$pattern = $condition['pattern'] ?? '';

				if ( '' !== $pattern ) {
					/* translators: %s: referrer URL pattern. */
					$chips[] = array( 'label' => sprintf( __( 'From “%s”', 'wp-popup-manager' ), $pattern ) );
				}
				break;
		}
	}

	// "Only on these contents": content types and taxonomy can only remove some of them.
	$limited = false;
	foreach ( $conditions as $condition ) {
		if ( is_array( $condition ) && 'page' === ( $condition['type'] ?? '' ) && 'include' === ( $condition['operator'] ?? 'include' ) && array_filter( (array) ( $condition['ids'] ?? array() ) ) ) {
			$limited = true;
		}
	}

	if ( $limited ) {
		foreach ( $chips as $index => $chip ) {
			if ( in_array( $chip['type'] ?? '', array( 'post_type', 'taxonomy' ), true ) ) {
				/* translators: %s: condition summary. */
				$chips[ $index ]['label'] = sprintf( __( '%s (redundant with the chosen contents)', 'wp-popup-manager' ), $chip['label'] );
				$chips[ $index ]['state'] = 'warning';
			}
		}
	}

	if ( ! $chips ) {
		$chips[] = array(
			'label' => __( 'Everywhere', 'wp-popup-manager' ),
			'state' => 'muted',
		);
	}

	return $chips;
}

/**
 * Date range chip, with its state compared to now and to the publication date.
 *
 * Same comparison as popup_manager_evaluate_condition(): local time, Y-m-d H:i strings.
 *
 * @param array $condition Date range condition.
 * @param int   $post_id   Popup ID.
 * @return array|null Chip, null when the range is empty.
 */
function popup_manager_summary_date_range( array $condition, int $post_id ): ?array {
	$start = $condition['start'] ?? '';
	$end   = $condition['end'] ?? '';

	if ( '' === $start && '' === $end ) {
		return null;
	}

	$start_full = $start ? $start . ' ' . ( ( $condition['startTime'] ?? '' ) ?: '00:00' ) : '';
	$end_full   = $end ? $end . ' ' . ( ( $condition['endTime'] ?? '' ) ?: '23:59' ) : '';
	$now        = current_time( 'Y-m-d H:i' );

	$format = function ( string $datetime ): string {
		$timestamp = strtotime( $datetime );
		return $timestamp ? date_i18n( _x( 'M j, Y', 'popup date range', 'wp-popup-manager' ), $timestamp ) : $datetime;
	};

	if ( $start_full && $end_full ) {
		/* translators: 1: start date, 2: end date. */
		$label = sprintf( __( '%1$s → %2$s', 'wp-popup-manager' ), $format( $start_full ), $format( $end_full ) );
	} elseif ( $start_full ) {
		/* translators: %s: start date. */
		$label = sprintf( __( 'From %s', 'wp-popup-manager' ), $format( $start_full ) );
	} else {
		/* translators: %s: end date. */
		$label = sprintf( __( 'Until %s', 'wp-popup-manager' ), $format( $end_full ) );
	}

	$title = trim( $start_full . ' → ' . $end_full );
	$state = '';

	if ( $end_full && $now > $end_full ) {
		/* translators: %s: date range. */
		$label = sprintf( __( '%s (ended)', 'wp-popup-manager' ), $label );
		$state = 'warning';
	} elseif ( $end_full && 'future' === get_post_status( $post_id ) && get_post_field( 'post_date', $post_id ) > $end_full . ':59' ) {
		/* translators: %s: date range. */
		$label = sprintf( __( '%s (ends before the publication)', 'wp-popup-manager' ), $label );
		$state = 'warning';
	} elseif ( $start_full && $now < $start_full ) {
		/* translators: %s: date range. */
		$label = sprintf( __( '%s (upcoming)', 'wp-popup-manager' ), $label );
	}

	return array(
		'label' => $label,
		'state' => $state,
		'title' => $title,
	);
}

/**
 * Human readable animation.
 *
 * @param array $display  Display meta.
 * @param array $settings Global settings (defaults).
 * @return string
 */
function popup_manager_summary_animation( array $display, array $settings ): string {
	$animations = array(
		'fade'     => __( 'Fade', 'wp-popup-manager' ),
		'slide-up' => __( 'Slide up', 'wp-popup-manager' ),
		'scale'    => __( 'Scale', 'wp-popup-manager' ),
		'none'     => __( 'None', 'wp-popup-manager' ),
	);

	return $animations[ $display['animation'] ?? $settings['defaultAnimation'] ?? 'fade' ] ?? $animations['fade'];
}

/**
 * Thumbnail of the appearance: a screen with the popup at its position and
 * size, over the overlay color.
 *
 * @param array $display  Display meta.
 * @param array $settings Global settings (defaults).
 * @return string SVG markup.
 */
function popup_manager_summary_thumbnail( array $display, array $settings ): string {
	$position = $display['position'] ?? $settings['defaultPosition'] ?? 'center';
	$size     = $display['size'] ?? 'medium';
	$overlay  = $display['overlay'] ?? true;
	$color    = popup_manager_sanitize_color_for_svg( $display['overlayColor'] ?? 'rgba(0,0,0,0.5)' );

	$animation = popup_manager_summary_animation( $display, $settings );

	$positions = array(
		'top-left'     => __( 'top left', 'wp-popup-manager' ),
		'top'          => __( 'top', 'wp-popup-manager' ),
		'top-right'    => __( 'top right', 'wp-popup-manager' ),
		'center-left'  => __( 'center left', 'wp-popup-manager' ),
		'center'       => __( 'center', 'wp-popup-manager' ),
		'center-right' => __( 'center right', 'wp-popup-manager' ),
		'bottom-left'  => __( 'bottom left', 'wp-popup-manager' ),
		'bottom'       => __( 'bottom', 'wp-popup-manager' ),
		'bottom-right' => __( 'bottom right', 'wp-popup-manager' ),
		'fullscreen'   => __( 'fullscreen', 'wp-popup-manager' ),
	);
	$sizes = array(
		'small'  => __( 'small', 'wp-popup-manager' ),
		'medium' => __( 'medium', 'wp-popup-manager' ),
		'large'  => __( 'large', 'wp-popup-manager' ),
	);

	// Screen 64 × 40, popup 16, 24 or 34 wide.
	$widths = array( 'small' => 16, 'medium' => 24, 'large' => 34 );
	$size   = isset( $widths[ $size ] ) ? $size : 'large';

	if ( 'fullscreen' === $position ) {
		$x = 3;
		$y = 3;
		$w = 58;
		$h = 34;
	} else {
		$w     = $widths[ $size ];
		$h     = (int) round( $w * 0.6 );
		$parts = explode( '-', $position );
		$v     = in_array( $parts[0], array( 'top', 'bottom' ), true ) ? $parts[0] : 'center';
		$hz    = in_array( end( $parts ), array( 'left', 'right' ), true ) ? end( $parts ) : 'center';
		$x     = 'left' === $hz ? 4 : ( 'right' === $hz ? 60 - $w : ( 64 - $w ) / 2 );
		$y     = 'top' === $v ? 4 : ( 'bottom' === $v ? 36 - $h : ( 40 - $h ) / 2 );
	}

	$label = 'fullscreen' === $position
		/* translators: 1: position, 2: animation. */
		? sprintf( __( 'Appearance: %1$s, %2$s animation', 'wp-popup-manager' ), $positions['fullscreen'], $animation )
		/* translators: 1: position, 2: size, 3: animation. */
		: sprintf( __( 'Appearance: %1$s, %2$s size, %3$s animation', 'wp-popup-manager' ), $positions[ $position ] ?? $positions['center'], $sizes[ $size ], $animation );

	$label .= $overlay ? ', ' . __( 'with overlay', 'wp-popup-manager' ) : ', ' . __( 'without overlay', 'wp-popup-manager' );

	ob_start();
	?>
	<figure class="popup-manager-thumb">
		<svg viewBox="0 0 64 40" width="64" height="40" role="img" aria-label="<?php echo esc_attr( $label ); ?>" focusable="false">
			<title><?php echo esc_html( $label ); ?></title>
			<rect x="0.5" y="0.5" width="63" height="39" rx="3" class="popup-manager-thumb__screen" />
			<?php if ( $overlay ) : ?>
			<rect x="0.5" y="0.5" width="63" height="39" rx="3" fill="<?php echo esc_attr( $color ); ?>" />
			<?php endif; ?>
			<rect x="<?php echo esc_attr( $x ); ?>" y="<?php echo esc_attr( $y ); ?>" width="<?php echo esc_attr( $w ); ?>" height="<?php echo esc_attr( $h ); ?>" rx="1.5" class="popup-manager-thumb__popup" />
		</svg>
	</figure>
	<?php
	return (string) ob_get_clean();
}

/**
 * Keep only color syntaxes accepted by the overlay setting.
 *
 * @param mixed $color Raw color.
 * @return string
 */
function popup_manager_sanitize_color_for_svg( $color ): string {
	$color = is_string( $color ) ? trim( $color ) : '';

	if ( preg_match( '/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i', $color ) || preg_match( '/^rgba?\(\s*[\d.\s,%]+\)$/i', $color ) ) {
		return $color;
	}

	return 'rgba(0,0,0,0.5)';
}

add_action( 'admin_enqueue_scripts', 'popup_manager_summary_column_css' );

function popup_manager_summary_column_css( string $hook ): void {
	if ( 'edit.php' !== $hook ) {
		return;
	}

	global $post_type;
	if ( 'popup' !== $post_type ) {
		return;
	}

	$css = '
		.fixed .column-popup_summary { width: 38%; }
		.popup-manager-summary { display: flex; gap: 12px; align-items: flex-start; }
		.popup-manager-thumb { flex: none; margin: 2px 0 0; }
		.popup-manager-thumb svg { display: block; }
		.popup-manager-thumb__screen { fill: #f6f7f7; stroke: #8c8f94; }
		.popup-manager-thumb__popup { fill: #fff; stroke: var(--wp-admin-theme-color, #2271b1); stroke-width: 1.5; }
		.popup-manager-summary__list { display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; margin: 0; min-width: 0; }
		.popup-manager-summary__row { display: contents; }
		.popup-manager-summary__list dt { color: #646970; font-size: 12px; line-height: 22px; }
		.popup-manager-summary__list dd { margin: 0; min-width: 0; }
		.popup-manager-chip { display: inline-block; max-width: 100%; margin: 0 2px 2px 0; padding: 1px 8px; border-radius: 11px; background: #f0f0f1; color: #1d2327; font-size: 12px; line-height: 20px; overflow-wrap: anywhere; }
		.popup-manager-chip--muted { background: transparent; box-shadow: inset 0 0 0 1px #dcdcde; color: #50575e; }
		.popup-manager-chip--warning { background: #fcf0f1; color: #8a2424; box-shadow: inset 0 0 0 1px #f0b8b8; }
		@media screen and (max-width: 782px) {
			.fixed .column-popup_summary { width: auto; }
			.popup-manager-summary { flex-wrap: wrap; }
		}
	';

	wp_register_style( 'popup-manager-admin-summary', false );
	wp_enqueue_style( 'popup-manager-admin-summary' );
	wp_add_inline_style( 'popup-manager-admin-summary', $css );
}
