import { __ } from '@wordpress/i18n';
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';

/**
 * Editor interface for the popup block.
 *
 * The preview carries the same .popup-manager-dialog class, the same custom
 * properties and the same data-size / data-position attributes as the front
 * end dialog, so global styles, block supports and style variations render
 * identically in both places. Only the fixed positioning — which belongs to
 * .popup-manager-wrapper — is left out.
 */
export default function Edit() {
	const display = useSelect( ( select ) => {
		const editor = select( 'core/editor' );

		if ( ! editor?.getCurrentPostType || 'popup' !== editor.getCurrentPostType() ) {
			return {};
		}

		return editor.getEditedPostAttribute( 'meta' )?._popup_display || {};
	}, [] );

	const blockProps = useBlockProps( {
		className: 'popup-manager-dialog popup-manager-editor-dialog',
		'data-size': display.size || 'medium',
		'data-position': display.position || 'center',
	} );

	const innerBlocksProps = useInnerBlocksProps( {
		className: 'popup-manager-content',
	} );

	return (
		<div { ...blockProps }>
			<span className="popup-manager-editor-badge">
				{ __( 'Popup', 'wp-popup-manager' ) }
			</span>

			<button
				type="button"
				className="popup-manager-close"
				disabled
				aria-hidden="true"
				tabIndex={ -1 }
			>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>

			<div { ...innerBlocksProps } />
		</div>
	);
}
