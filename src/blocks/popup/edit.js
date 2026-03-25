import { __ } from '@wordpress/i18n';
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

/**
 * Editor interface for the popup block.
 *
 * Displays a simplified dialog preview with InnerBlocks
 * to allow inserting native Gutenberg blocks as content.
 */
export default function Edit() {
	const blockProps = useBlockProps( {
		className: 'popup-manager-editor-preview',
	} );

	return (
		<div { ...blockProps }>
			<div className="popup-manager-editor-dialog">
				<div className="popup-manager-editor-header">
					<span className="popup-manager-editor-badge">
						{ __( 'Popup', 'wp-popup-manager' ) }
					</span>
					<button
						type="button"
						className="popup-manager-editor-close"
						disabled
						aria-label={ __( 'Close', 'wp-popup-manager' ) }
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							aria-hidden="true"
						>
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>
				<div className="popup-manager-editor-content">
					<InnerBlocks
						template={ [
							[ 'core/heading', { level: 2, placeholder: __( 'Popup title', 'wp-popup-manager' ) } ],
							[ 'core/paragraph', { placeholder: __( 'Popup content…', 'wp-popup-manager' ) } ],
						] }
					/>
				</div>
			</div>
		</div>
	);
}
