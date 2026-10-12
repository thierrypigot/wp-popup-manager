/**
 * "Frequency & analytics" tab of the settings modal.
 *
 * @package PopupManager
 * @since   1.4.0
 */

import { __ } from '@wordpress/i18n';
import { RadioControl, ToggleControl } from '@wordpress/components';

import { FREQUENCIES, usePopupMeta } from './shared';

export default function FrequencyTab() {
	const [ meta, setMeta ] = usePopupMeta();
	const frequency = meta._popup_frequency;

	return (
		<div className="popup-manager-settings__columns">
			<RadioControl
				label={ __( 'Show popup', 'wp-popup-manager' ) }
				selected={ frequency.type }
				options={ FREQUENCIES() }
				onChange={ ( type ) => setMeta( '_popup_frequency', { ...frequency, type } ) }
			/>

			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Enable analytics', 'wp-popup-manager' ) }
				checked={ meta._popup_analytics_enabled }
				onChange={ ( value ) => setMeta( '_popup_analytics_enabled', value ) }
				help={ __( 'Tracks impressions and closes. Adds 1 HTTP request per page view containing this popup.', 'wp-popup-manager' ) }
			/>
		</div>
	);
}
