/**
 * Picture of the appearance: a screen with the popup at its position and
 * size, over the overlay color. Same drawing as the list table thumbnail
 * (popup_manager_summary_thumbnail()), at any width.
 *
 * @package PopupManager
 * @since   1.4.0
 */

import { __, sprintf } from '@wordpress/i18n';

import { ANIMATIONS, POSITIONS } from './shared';

const WIDTHS = { small: 16, medium: 24, large: 34 };

/**
 * Text alternative of the picture.
 *
 * @param {Object} display Display meta.
 * @return {string} Label.
 */
export function describeAppearance( display ) {
	const animation = ANIMATIONS().find( ( item ) => item.value === display.animation )?.label ?? display.animation;
	const sizes = {
		small: __( 'small', 'wp-popup-manager' ),
		medium: __( 'medium', 'wp-popup-manager' ),
		large: __( 'large', 'wp-popup-manager' ),
	};

	const label =
		'fullscreen' === display.position
			? sprintf( /* translators: 1: position, 2: animation. */ __( 'Appearance: %1$s, %2$s animation', 'wp-popup-manager' ), __( 'fullscreen', 'wp-popup-manager' ), animation )
			: sprintf(
					/* translators: 1: position, 2: size, 3: animation. */
					__( 'Appearance: %1$s, %2$s size, %3$s animation', 'wp-popup-manager' ),
					POSITIONS().find( ( item ) => item.value === display.position )?.label ?? display.position,
					sizes[ display.size ] ?? sizes.large,
					animation
			  );

	return `${ label }, ${ display.overlay ? __( 'with overlay', 'wp-popup-manager' ) : __( 'without overlay', 'wp-popup-manager' ) }`;
}

/**
 * Appearance picture.
 *
 * @param {Object} props         Props.
 * @param {Object} props.display Display meta.
 * @param {number} props.width   Rendered width in pixels.
 */
export default function AppearancePreview( { display, width = 64 } ) {
	let x;
	let y;
	let w;
	let h;

	if ( 'fullscreen' === display.position ) {
		x = 3;
		y = 3;
		w = 58;
		h = 34;
	} else {
		w = WIDTHS[ display.size ] ?? WIDTHS.large;
		h = Math.round( w * 0.6 );

		const parts = ( display.position || 'center' ).split( '-' );
		const vertical = [ 'top', 'bottom' ].includes( parts[ 0 ] ) ? parts[ 0 ] : 'center';
		const horizontal = [ 'left', 'right' ].includes( parts[ parts.length - 1 ] ) ? parts[ parts.length - 1 ] : 'center';

		x = { left: 4, right: 60 - w, center: ( 64 - w ) / 2 }[ horizontal ];
		y = { top: 4, bottom: 36 - h, center: ( 40 - h ) / 2 }[ vertical ];
	}

	const label = describeAppearance( display );

	return (
		<svg
			className="popup-manager-preview"
			viewBox="0 0 64 40"
			width={ width }
			height={ Math.round( ( width * 40 ) / 64 ) }
			role="img"
			aria-label={ label }
			focusable="false"
		>
			<title>{ label }</title>
			<rect x="0.5" y="0.5" width="63" height="39" rx="3" className="popup-manager-preview__screen" />
			{ display.overlay && <rect x="0.5" y="0.5" width="63" height="39" rx="3" fill={ display.overlayColor || 'rgba(0,0,0,0.5)' } /> }
			<rect x={ x } y={ y } width={ w } height={ h } rx="1.5" className="popup-manager-preview__popup" />
		</svg>
	);
}
