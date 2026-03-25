/**
 * Global settings page — WP Popup Manager.
 *
 * Full React application mounted on #popup-manager-root.
 *
 * @package PopupManager
 * @since   1.0.0
 */

import { createRoot, useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import {
	Card,
	CardBody,
	CardHeader,
	SelectControl,
	TextControl,
	Button,
	Notice,
	Spinner,
	__experimentalVStack as VStack,
	__experimentalHeading as Heading,
} from '@wordpress/components';

function SettingsApp() {
	const [ settings, setSettings ] = useState( null );
	const [ saving, setSaving ] = useState( false );
	const [ notice, setNotice ] = useState( null );

	// Load settings on mount.
	useEffect( () => {
		apiFetch( { path: '/popup-manager/v1/settings' } ).then( ( data ) => {
			setSettings( data );
		} );
	}, [] );

	const update = ( key, value ) => {
		setSettings( { ...settings, [ key ]: value } );
	};

	const save = async () => {
		setSaving( true );
		setNotice( null );

		try {
			const data = await apiFetch( {
				path: '/popup-manager/v1/settings',
				method: 'POST',
				data: settings,
			} );
			setSettings( data );
			setNotice( {
				status: 'success',
				message: __( 'Settings saved.', 'wp-popup-manager' ),
			} );
		} catch {
			setNotice( {
				status: 'error',
				message: __( 'Error saving settings.', 'wp-popup-manager' ),
			} );
		}

		setSaving( false );
	};

	if ( ! settings ) {
		return (
			<div style={ { padding: '2rem', textAlign: 'center' } } role="status">
				<Spinner />
				<span className="screen-reader-text">
					{ __( 'Loading settings…', 'wp-popup-manager' ) }
				</span>
			</div>
		);
	}

	return (
		<div style={ { maxWidth: 600 } }>
			<Heading level={ 1 } style={ { marginBottom: '1.5rem' } }>
				{ __( 'WP Popup Manager — Settings', 'wp-popup-manager' ) }
			</Heading>

			<div role="status" aria-live="polite">
				{ notice && (
					<Notice
						status={ notice.status }
						onDismiss={ () => setNotice( null ) }
						style={ { marginBottom: '1rem' } }
					>
						{ notice.message }
					</Notice>
				) }
			</div>

			<Card>
				<CardHeader>
					<Heading level={ 2 }>
						{ __( 'Default values', 'wp-popup-manager' ) }
					</Heading>
				</CardHeader>
				<CardBody>
					<VStack spacing={ 4 }>
						<SelectControl
							label={ __( 'Default animation', 'wp-popup-manager' ) }
							value={ settings.defaultAnimation }
							options={ [
								{ value: 'fade', label: __( 'Fade', 'wp-popup-manager' ) },
								{ value: 'slide-up', label: __( 'Slide up', 'wp-popup-manager' ) },
								{ value: 'scale', label: __( 'Scale', 'wp-popup-manager' ) },
								{ value: 'none', label: __( 'None', 'wp-popup-manager' ) },
							] }
							onChange={ ( v ) => update( 'defaultAnimation', v ) }
						/>

						<SelectControl
							label={ __( 'Default position', 'wp-popup-manager' ) }
							value={ settings.defaultPosition }
							options={ [
								{ value: 'center', label: __( 'Center', 'wp-popup-manager' ) },
								{ value: 'top', label: __( 'Top', 'wp-popup-manager' ) },
								{ value: 'top-left', label: __( 'Top left', 'wp-popup-manager' ) },
								{ value: 'top-right', label: __( 'Top right', 'wp-popup-manager' ) },
								{ value: 'center-left', label: __( 'Center left', 'wp-popup-manager' ) },
								{ value: 'center-right', label: __( 'Center right', 'wp-popup-manager' ) },
								{ value: 'bottom', label: __( 'Bottom', 'wp-popup-manager' ) },
								{ value: 'bottom-left', label: __( 'Bottom left', 'wp-popup-manager' ) },
								{ value: 'bottom-right', label: __( 'Bottom right', 'wp-popup-manager' ) },
								{ value: 'fullscreen', label: __( 'Fullscreen', 'wp-popup-manager' ) },
							] }
							onChange={ ( v ) => update( 'defaultPosition', v ) }
						/>

						<SelectControl
							label={ __( 'Default frequency', 'wp-popup-manager' ) }
							value={ settings.defaultFrequency }
							options={ [
								{ value: 'always', label: __( 'Every visit', 'wp-popup-manager' ) },
								{ value: 'once_per_session', label: __( 'Once per session', 'wp-popup-manager' ) },
								{ value: 'once_per_day', label: __( 'Once per day', 'wp-popup-manager' ) },
								{ value: 'once_ever', label: __( 'Once ever', 'wp-popup-manager' ) },
							] }
							onChange={ ( v ) => update( 'defaultFrequency', v ) }
						/>

						<TextControl
							label={ __( 'Custom CSS classes', 'wp-popup-manager' ) }
							value={ settings.customCssClasses }
							onChange={ ( v ) => update( 'customCssClasses', v ) }
							help={ __(
								'Classes added to each popup wrapper (space-separated).',
								'wp-popup-manager'
							) }
						/>
					</VStack>
				</CardBody>
			</Card>

			<div style={ { marginTop: '1.5rem' } }>
				<Button variant="primary" onClick={ save } isBusy={ saving } disabled={ saving }>
					{ saving
						? __( 'Saving…', 'wp-popup-manager' )
						: __( 'Save', 'wp-popup-manager' ) }
				</Button>
			</div>
		</div>
	);
}

// Mount React on the DOM.
window.addEventListener( 'DOMContentLoaded', () => {
	const root = document.getElementById( 'popup-manager-root' );
	if ( root ) {
		createRoot( root ).render( <SettingsApp /> );
	}
} );
