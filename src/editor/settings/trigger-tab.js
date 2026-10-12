/**
 * "Trigger" tab of the settings modal.
 *
 * @package PopupManager
 * @since   1.4.0
 */

import { __ } from '@wordpress/i18n';
import { Notice, RadioControl, RangeControl, TextControl, __experimentalVStack as VStack } from '@wordpress/components';

import { TRIGGER_TYPES, usePopupMeta } from './shared';

export default function TriggerTab() {
	const [ meta, setMeta ] = usePopupMeta();
	const trigger = meta._popup_triggers[ 0 ] || { type: 'click' };
	const type = trigger.type;

	// Single trigger: switching type resets its parameters to their defaults.
	const setType = ( newType ) => {
		const next = { type: newType };
		if ( 'on_load' === newType ) {
			next.delay = 3;
		}
		if ( 'scroll' === newType ) {
			next.threshold = 50;
			next.openDelay = 0;
		}
		if ( 'section' === newType ) {
			next.anchor = '';
			next.openDelay = 0;
		}
		if ( 'inactivity' === newType ) {
			next.delay = 30;
		}
		setMeta( '_popup_triggers', [ next ] );
	};

	const update = ( key, value ) => setMeta( '_popup_triggers', [ { ...trigger, [ key ]: value } ] );

	return (
		<div className="popup-manager-settings__columns">
			<RadioControl
				label={ __( 'Trigger type', 'wp-popup-manager' ) }
				selected={ type }
				options={ TRIGGER_TYPES() }
				onChange={ setType }
			/>

			<VStack spacing={ 4 }>
				{ 'click' === type && (
					<p className="popup-manager-settings__hint">
						{ __( 'The popup opens when a visitor clicks a "Popup trigger" button pointing to it. Add that block wherever needed in your pages, patterns or templates.', 'wp-popup-manager' ) }
					</p>
				) }

				{ 'on_load' === type && (
					<RangeControl
						__nextHasNoMarginBottom
						label={ __( 'Delay (seconds)', 'wp-popup-manager' ) }
						value={ trigger.delay ?? 3 }
						onChange={ ( value ) => update( 'delay', value ) }
						min={ 0 }
						max={ 30 }
						step={ 1 }
					/>
				) }

				{ 'scroll' === type && (
					<RangeControl
						__nextHasNoMarginBottom
						label={ __( 'Scroll threshold (%)', 'wp-popup-manager' ) }
						value={ trigger.threshold ?? 50 }
						onChange={ ( value ) => update( 'threshold', value ) }
						min={ 10 }
						max={ 100 }
						step={ 5 }
						help={ __( 'Popup opens when the user scrolls past this percentage of the page.', 'wp-popup-manager' ) }
					/>
				) }

				{ 'section' === type && (
					<TextControl
						__nextHasNoMarginBottom
						label={ __( 'Section anchor', 'wp-popup-manager' ) }
						value={ trigger.anchor ?? '' }
						onChange={ ( value ) => update( 'anchor', value.replace( /^#/, '' ).replace( /[^A-Za-z0-9_:.-]/g, '' ) ) }
						help={ __( 'HTML anchor of the section, without the #. Set it in the "HTML anchor" field of the block (Advanced panel). The popup is only loaded on pages that contain this anchor.', 'wp-popup-manager' ) }
					/>
				) }

				{ 'section' === type && ! trigger.anchor && (
					<Notice status="warning" isDismissible={ false }>
						{ __( 'Without an anchor, this popup is never displayed.', 'wp-popup-manager' ) }
					</Notice>
				) }

				{ ( 'scroll' === type || 'section' === type ) && (
					<RangeControl
						__nextHasNoMarginBottom
						label={ __( 'Opening delay (milliseconds)', 'wp-popup-manager' ) }
						value={ trigger.openDelay ?? 0 }
						onChange={ ( value ) => update( 'openDelay', value ?? 0 ) }
						min={ 0 }
						max={ 10000 }
						step={ 100 }
						help={ __( 'Wait time between the trigger and the opening of the popup.', 'wp-popup-manager' ) }
					/>
				) }

				{ 'inactivity' === type && (
					<RangeControl
						__nextHasNoMarginBottom
						label={ __( 'Inactivity delay (seconds)', 'wp-popup-manager' ) }
						value={ trigger.delay ?? 30 }
						onChange={ ( value ) => update( 'delay', value ) }
						min={ 5 }
						max={ 120 }
						step={ 5 }
						help={ __( 'Popup opens after this many seconds without user interaction.', 'wp-popup-manager' ) }
					/>
				) }

				{ 'click' !== type && (
					<Notice status="warning" isDismissible={ false }>
						{ __(
							'This popup opens without user action. This may disrupt navigation for people using assistive technologies. Consider using a click trigger if possible.',
							'wp-popup-manager'
						) }
					</Notice>
				) }
			</VStack>
		</div>
	);
}
