/**
 * Editor UI of the popup CPT.
 *
 * - On/off switch in the post status area (PluginPostStatusInfo), usable
 *   once the popup is published.
 * - "Popup settings" panel: a summary of the settings (same as the "Setup"
 *   column of the list table), each line opening the matching tab.
 * - Settings modal with four tabs: Trigger, Conditions, Appearance,
 *   Frequency & analytics. Changes apply at once and are saved with the post.
 *
 * @package PopupManager
 * @since   1.0.0
 * @since   1.4.0 Settings moved from four sidebar panels to a tabbed modal.
 */

import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel, PluginPostStatusInfo } from '@wordpress/editor';
import { useEffect, useState } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { createBlock, cloneBlock } from '@wordpress/blocks';
import { Button, Modal, Notice, TabPanel, ToggleControl } from '@wordpress/components';

import AppearancePreview from './settings/preview';
import TriggerTab from './settings/trigger-tab';
import ConditionsTab from './settings/conditions-tab';
import AppearanceTab from './settings/appearance-tab';
import FrequencyTab from './settings/frequency-tab';
import { describeConditions, describeFrequency, describeTrigger, usePopupMeta, useSummaryContext } from './settings/shared';

import './settings/settings.css';

/**
 * On/off switch, same meta as the switch of the list table.
 *
 * @since 1.3.0
 */
function EnabledToggle() {
	const [ meta, setMeta ] = usePopupMeta();
	// Saved status: until the popup is published, the switch stays off and cannot be used.
	const isPublished = useSelect( ( select ) => 'publish' === select( 'core/editor' ).getCurrentPostAttribute( 'status' ), [] );

	return (
		<PluginPostStatusInfo className="popup-manager-enabled-toggle">
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Popup active', 'wp-popup-manager' ) }
				checked={ isPublished && !! meta._popup_enabled }
				disabled={ ! isPublished }
				onChange={ ( value ) => setMeta( '_popup_enabled', value ) }
				help={
					isPublished
						? __( 'A disabled popup stays published but is no longer shown on the site.', 'wp-popup-manager' )
						: __( 'Publish the popup to be able to enable it.', 'wp-popup-manager' )
				}
			/>
		</PluginPostStatusInfo>
	);
}

/**
 * Frame of the popup.
 *
 * The background, padding, radius and shadow of the dialog are carried by the
 * Popup block. Popups created before that block existed have no frame block at
 * the root: they keep rendering exactly as before, and this offers to wrap
 * their content on demand.
 */
function FrameNotice() {
	const { hasFrame, rootBlocks } = useSelect( ( select ) => {
		const blocks = select( blockEditorStore ).getBlocks();

		return {
			hasFrame: blocks.some( ( block ) => block.name === 'popup-manager/popup' ),
			rootBlocks: blocks,
		};
	}, [] );

	const { replaceBlocks, insertBlocks } = useDispatch( blockEditorStore );

	if ( hasFrame ) {
		return (
			<p className="popup-manager-settings__hint">
				{ __( 'Background, padding, radius and shadow of the frame are set on the Popup block itself, in the block sidebar.', 'wp-popup-manager' ) }
			</p>
		);
	}

	const wrapInFrame = () => {
		const frame = createBlock(
			'popup-manager/popup',
			{ lock: { remove: true, move: true } },
			rootBlocks.map( ( block ) => cloneBlock( block ) )
		);

		if ( rootBlocks.length ) {
			replaceBlocks(
				rootBlocks.map( ( block ) => block.clientId ),
				frame
			);
		} else {
			insertBlocks( frame );
		}
	};

	return (
		<Notice status="info" isDismissible={ false }>
			<p>{ __( 'This popup has no Popup block at the root, so its frame cannot be customised.', 'wp-popup-manager' ) }</p>
			<Button variant="secondary" onClick={ wrapInFrame }>
				{ __( 'Customize the frame', 'wp-popup-manager' ) }
			</Button>
		</Notice>
	);
}

const TABS = () => [
	{ name: 'trigger', title: __( 'Trigger', 'wp-popup-manager' ) },
	{ name: 'conditions', title: __( 'Conditions', 'wp-popup-manager' ) },
	{ name: 'appearance', title: __( 'Appearance', 'wp-popup-manager' ) },
	{ name: 'frequency', title: __( 'Frequency & Analytics', 'wp-popup-manager' ) },
];

/**
 * Settings modal.
 */
function SettingsModal( { initialTab, onClose } ) {
	return (
		<Modal title={ __( 'Popup settings', 'wp-popup-manager' ) } onRequestClose={ onClose } size="large" className="popup-manager-settings">
			<TabPanel className="popup-manager-settings__tabs" tabs={ TABS() } initialTabName={ initialTab }>
				{ ( tab ) => (
					<div className="popup-manager-settings__panel">
						{ 'trigger' === tab.name && <TriggerTab /> }
						{ 'conditions' === tab.name && <ConditionsTab /> }
						{ 'appearance' === tab.name && <AppearanceTab frameNotice={ <FrameNotice /> } /> }
						{ 'frequency' === tab.name && <FrequencyTab /> }
					</div>
				) }
			</TabPanel>
			<div className="popup-manager-settings__footer">
				<p className="popup-manager-settings__hint">{ __( 'Changes apply at once. Save the popup to keep them.', 'wp-popup-manager' ) }</p>
				<Button variant="primary" onClick={ onClose }>
					{ __( 'Done', 'wp-popup-manager' ) }
				</Button>
			</div>
		</Modal>
	);
}

/**
 * One line of the summary, opening the matching tab.
 */
function SummaryRow( { term, values, onClick } ) {
	const hasWarning = values.some( ( value ) => value.warning );

	return (
		<li>
			<button type="button" className="popup-manager-summary__row" onClick={ onClick }>
				<span className="popup-manager-summary__term">{ term }</span>
				{ values.map( ( value, index ) => (
					<span key={ index } className={ `popup-manager-summary__value${ value.warning ? ' is-warning' : '' }${ value.muted ? ' is-muted' : '' }` }>
						{ value.label }
					</span>
				) ) }
				{ hasWarning && <span className="screen-reader-text">{ __( 'Warning: check this setting, it may prevent the popup from being shown.', 'wp-popup-manager' ) }</span> }
			</button>
		</li>
	);
}

/**
 * "Popup settings" panel of the sidebar.
 */
const PANEL_NAME = 'popup-manager-sidebar/popup-manager-settings';

/**
 * Open the settings panel the first time a user meets it: it is the only
 * panel of the plugin. Closing it afterwards is remembered by the editor.
 */
function useOpenPanelOnce() {
	const isOpened = useSelect( ( select ) => select( 'core/editor' ).isEditorPanelOpened?.( PANEL_NAME ), [] );
	const { toggleEditorPanelOpened } = useDispatch( 'core/editor' );

	useEffect( () => {
		let seen = false;
		try {
			seen = !! window.localStorage.getItem( 'popupManagerSettingsPanelSeen' );
			window.localStorage.setItem( 'popupManagerSettingsPanelSeen', '1' );
		} catch ( error ) {
			seen = true;
		}

		if ( ! seen && false === isOpened && toggleEditorPanelOpened ) {
			toggleEditorPanelOpened( PANEL_NAME );
		}
		// Only on the first render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );
}

function SettingsPanel() {
	useOpenPanelOnce();
	const [ meta ] = usePopupMeta();
	const context = useSummaryContext();
	const [ openTab, setOpenTab ] = useState( null );

	const trigger = describeTrigger( meta._popup_triggers[ 0 ] );
	const conditions = describeConditions( meta._popup_conditions, context );
	const display = meta._popup_display;

	return (
		<PluginDocumentSettingPanel name="popup-manager-settings" title={ __( 'Popup settings', 'wp-popup-manager' ) } icon="admin-generic">
			<div className="popup-manager-summary">
				<button
					type="button"
					className="popup-manager-summary__preview"
					onClick={ () => setOpenTab( 'appearance' ) }
					aria-label={ __( 'Edit the appearance', 'wp-popup-manager' ) }
				>
					<AppearancePreview display={ display } width={ 96 } />
				</button>
				<ul className="popup-manager-summary__list">
					<SummaryRow term={ __( 'Trigger', 'wp-popup-manager' ) } values={ [ trigger ] } onClick={ () => setOpenTab( 'trigger' ) } />
					<SummaryRow term={ __( 'Display', 'wp-popup-manager' ) } values={ conditions } onClick={ () => setOpenTab( 'conditions' ) } />
					<SummaryRow
						term={ __( 'Options', 'wp-popup-manager' ) }
						values={ [
							{ label: describeFrequency( meta._popup_frequency ) },
							...( meta._popup_analytics_enabled ? [ { label: __( 'Analytics enabled', 'wp-popup-manager' ) } ] : [] ),
						] }
						onClick={ () => setOpenTab( 'frequency' ) }
					/>
				</ul>
				<Button variant="secondary" className="popup-manager-summary__edit" onClick={ () => setOpenTab( 'trigger' ) } aria-haspopup="dialog">
					{ __( 'Edit the settings…', 'wp-popup-manager' ) }
				</Button>
			</div>

			{ openTab && <SettingsModal initialTab={ openTab } onClose={ () => setOpenTab( null ) } /> }
		</PluginDocumentSettingPanel>
	);
}

/**
 * Register the editor plugin.
 */
registerPlugin( 'popup-manager-sidebar', {
	render: () => (
		<>
			<EnabledToggle />
			<SettingsPanel />
		</>
	),
} );
