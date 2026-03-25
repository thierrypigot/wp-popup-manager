import { __ } from '@wordpress/i18n';
import { useBlockProps, InnerBlocks, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, Placeholder } from '@wordpress/components';
import { useSelect } from '@wordpress/data';

/**
 * Editor interface for the popup-trigger block.
 *
 * Uses a native core/button via InnerBlocks so the user gets
 * all built-in button styling options (colors, typography, border-radius, etc.).
 */
export default function Edit( { attributes, setAttributes } ) {
	const { popupId } = attributes;
	const blockProps = useBlockProps();

	// Retrieve list of published popups.
	const popups = useSelect( ( select ) => {
		const { getEntityRecords } = select( 'core' );
		return (
			getEntityRecords( 'postType', 'popup', {
				per_page: 100,
				status: 'publish',
				_fields: 'id,title',
			} ) || []
		);
	}, [] );

	const popupOptions = [
		{ value: 0, label: __( '— Select a popup —', 'wp-popup-manager' ) },
		...popups.map( ( popup ) => ( {
			value: popup.id,
			label: popup.title.rendered || `#${ popup.id }`,
		} ) ),
	];

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Popup trigger', 'wp-popup-manager' ) }>
					<SelectControl
						label={ __( 'Popup to open', 'wp-popup-manager' ) }
						value={ popupId }
						options={ popupOptions }
						onChange={ ( value ) =>
							setAttributes( { popupId: parseInt( value, 10 ) } )
						}
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ popupId ? (
					<InnerBlocks
						allowedBlocks={ [ 'core/buttons' ] }
						template={ [
							[ 'core/buttons', { templateLock: 'all' }, [
								[ 'core/button', { text: __( 'Learn more', 'wp-popup-manager' ) } ],
							] ],
						] }
						templateLock="all"
					/>
				) : (
					<Placeholder
						icon="slides"
						label={ __( 'Popup Trigger', 'wp-popup-manager' ) }
						instructions={ __(
							'Select a popup in the block settings.',
							'wp-popup-manager'
						) }
					/>
				) }
			</div>
		</>
	);
}
