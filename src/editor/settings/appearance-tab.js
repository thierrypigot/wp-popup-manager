/**
 * "Appearance" tab of the settings modal, with a live preview.
 *
 * @package PopupManager
 * @since   1.4.0
 */

import { __ } from '@wordpress/i18n';
import {
	ColorPicker,
	SelectControl,
	ToggleControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	__experimentalVStack as VStack,
} from '@wordpress/components';

import AppearancePreview, { describeAppearance } from './preview';
import { ANIMATIONS, POSITIONS, usePopupMeta } from './shared';

const ARROWS = {
	'top-left': '↖',
	top: '↑',
	'top-right': '↗',
	'center-left': '←',
	center: '●',
	'center-right': '→',
	'bottom-left': '↙',
	bottom: '↓',
	'bottom-right': '↘',
};

export default function AppearanceTab( { frameNotice } ) {
	const [ meta, setMeta ] = usePopupMeta();
	const display = meta._popup_display;
	const update = ( key, value ) => setMeta( '_popup_display', { ...display, [ key ]: value } );
	const isFullscreen = 'fullscreen' === display.position;

	return (
		<div className="popup-manager-settings__columns">
			<VStack spacing={ 5 }>
				<fieldset>
					<legend className="popup-manager-settings__legend">{ __( 'Position', 'wp-popup-manager' ) }</legend>
					<div className="popup-manager-positions" role="radiogroup" aria-label={ __( 'Position', 'wp-popup-manager' ) }>
						{ POSITIONS().map( ( { value, label } ) => (
							<button
								key={ value }
								type="button"
								role="radio"
								aria-checked={ display.position === value }
								aria-label={ label }
								disabled={ isFullscreen }
								className="popup-manager-positions__cell"
								onClick={ () => update( 'position', value ) }
							>
								<span aria-hidden="true">{ ARROWS[ value ] }</span>
							</button>
						) ) }
					</div>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Fullscreen', 'wp-popup-manager' ) }
						checked={ isFullscreen }
						onChange={ ( checked ) => update( 'position', checked ? 'fullscreen' : 'center' ) }
					/>
				</fieldset>

				{ ! isFullscreen && (
					<ToggleGroupControl
						__nextHasNoMarginBottom
						label={ __( 'Size', 'wp-popup-manager' ) }
						value={ display.size }
						onChange={ ( value ) => update( 'size', value ) }
						isBlock
					>
						<ToggleGroupControlOption value="small" label={ __( 'Small', 'wp-popup-manager' ) } />
						<ToggleGroupControlOption value="medium" label={ __( 'Medium', 'wp-popup-manager' ) } />
						<ToggleGroupControlOption value="large" label={ __( 'Large', 'wp-popup-manager' ) } />
					</ToggleGroupControl>
				) }

				<SelectControl
					__nextHasNoMarginBottom
					label={ __( 'Animation', 'wp-popup-manager' ) }
					value={ display.animation }
					options={ ANIMATIONS() }
					onChange={ ( value ) => update( 'animation', value ) }
				/>

				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Close with Escape key', 'wp-popup-manager' ) }
					checked={ display.closeOnEsc }
					onChange={ ( value ) => update( 'closeOnEsc', value ) }
				/>

				{ frameNotice }
			</VStack>

			<VStack spacing={ 5 }>
				<figure className="popup-manager-settings__preview">
					<AppearancePreview display={ display } width={ 280 } />
					<figcaption>{ describeAppearance( display ) }</figcaption>
				</figure>

				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Show overlay', 'wp-popup-manager' ) }
					checked={ display.overlay }
					onChange={ ( value ) => update( 'overlay', value ) }
				/>

				{ display.overlay && (
					<>
						<fieldset>
							<legend className="popup-manager-settings__legend">{ __( 'Overlay color', 'wp-popup-manager' ) }</legend>
							<ColorPicker color={ display.overlayColor } onChange={ ( value ) => update( 'overlayColor', value ) } enableAlpha />
						</fieldset>
						<ToggleControl
							__nextHasNoMarginBottom
							label={ __( 'Close on overlay click', 'wp-popup-manager' ) }
							checked={ display.closeOnOverlayClick }
							onChange={ ( value ) => update( 'closeOnOverlayClick', value ) }
						/>
					</>
				) }
			</VStack>
		</div>
	);
}
