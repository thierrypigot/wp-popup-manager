/**
 * Sidebar panels for the popup CPT.
 *
 * 4 PluginDocumentSettingPanel panels:
 * - Triggers
 * - Display Conditions
 * - Appearance
 * - Frequency
 *
 * @package PopupManager
 * @since   1.0.0
 */

import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { createBlock, cloneBlock } from '@wordpress/blocks';
import {
	Button,
	RadioControl,
	RangeControl,
	SelectControl,
	ToggleControl,
	TextControl,
	Notice,
	ColorPicker,
	FormTokenField,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	__experimentalVStack as VStack,
} from '@wordpress/components';

/**
 * Hook to read/write a post_meta of the popup CPT.
 */
function usePopupMeta( metaKey, defaultValue ) {
	const postType = useSelect( ( select ) => select( 'core/editor' ).getCurrentPostType(), [] );
	const [ meta, setMeta ] = useEntityProp( 'postType', postType, 'meta' );

	const value = meta?.[ metaKey ] ?? defaultValue;
	const setValue = ( newValue ) => {
		setMeta( { ...meta, [ metaKey ]: newValue } );
	};

	return [ value, setValue ];
}

/**
 * Triggers panel.
 */
function TriggerPanel() {
	const [ triggers, setTriggers ] = usePopupMeta( '_popup_triggers', [ { type: 'click' } ] );

	// Single trigger (exclusive selection).
	const currentTrigger = triggers[ 0 ] || { type: 'click' };
	const triggerType = currentTrigger.type;
	const isAutoTrigger = triggerType !== 'click';

	const setTrigger = ( type ) => {
		const newTrigger = { type };
		if ( type === 'on_load' ) {
			newTrigger.delay = 3;
		}
		if ( type === 'scroll' ) {
			newTrigger.threshold = 50;
		}
		if ( type === 'inactivity' ) {
			newTrigger.delay = 30;
		}
		setTriggers( [ newTrigger ] );
	};

	const updateParam = ( key, value ) => {
		setTriggers( [ { ...currentTrigger, [ key ]: value } ] );
	};

	return (
		<PluginDocumentSettingPanel
			name="popup-manager-triggers"
			title={ __( 'Trigger', 'wp-popup-manager' ) }
			icon="visibility"
		>
			<VStack spacing={ 3 }>
				<RadioControl
					label={ __( 'Trigger type', 'wp-popup-manager' ) }
					selected={ triggerType }
					options={ [
						{ value: 'click', label: __( 'Click (trigger button)', 'wp-popup-manager' ) },
						{ value: 'on_load', label: __( 'Page load', 'wp-popup-manager' ) },
						{ value: 'scroll', label: __( 'Scroll depth', 'wp-popup-manager' ) },
						{ value: 'exit_intent', label: __( 'Exit intent (mouse)', 'wp-popup-manager' ) },
						{ value: 'inactivity', label: __( 'Inactivity', 'wp-popup-manager' ) },
					] }
					onChange={ setTrigger }
				/>

				{ triggerType === 'on_load' && (
					<RangeControl
						label={ __( 'Delay (seconds)', 'wp-popup-manager' ) }
						value={ currentTrigger.delay ?? 3 }
						onChange={ ( v ) => updateParam( 'delay', v ) }
						min={ 0 }
						max={ 30 }
						step={ 1 }
					/>
				) }

				{ triggerType === 'scroll' && (
					<RangeControl
						label={ __( 'Scroll threshold (%)', 'wp-popup-manager' ) }
						value={ currentTrigger.threshold ?? 50 }
						onChange={ ( v ) => updateParam( 'threshold', v ) }
						min={ 10 }
						max={ 100 }
						step={ 5 }
						help={ __( 'Popup opens when the user scrolls past this percentage of the page.', 'wp-popup-manager' ) }
					/>
				) }

				{ triggerType === 'inactivity' && (
					<RangeControl
						label={ __( 'Inactivity delay (seconds)', 'wp-popup-manager' ) }
						value={ currentTrigger.delay ?? 30 }
						onChange={ ( v ) => updateParam( 'delay', v ) }
						min={ 5 }
						max={ 120 }
						step={ 5 }
						help={ __( 'Popup opens after this many seconds without user interaction.', 'wp-popup-manager' ) }
					/>
				) }

				{ isAutoTrigger && (
					<Notice status="warning" isDismissible={ false }>
						{ __(
							'This popup opens without user action. This may disrupt navigation for people using assistive technologies. Consider using a click trigger if possible.',
							'wp-popup-manager'
						) }
					</Notice>
				) }
			</VStack>
		</PluginDocumentSettingPanel>
	);
}

/**
 * Page selector sub-component with FormTokenField.
 * Searches pages by title, stores IDs.
 */
function PageSelector( { ids, operator, onChangeIds, onChangeOperator } ) {
	// Load all pages (lightweight, _fields=id,title).
	const pages = useSelect( ( select ) => {
		return (
			select( 'core' ).getEntityRecords( 'postType', 'page', {
				per_page: 100,
				_fields: 'id,title',
				orderby: 'title',
				order: 'asc',
			} ) || []
		);
	}, [] );

	// Map ID → title for display.
	const idToTitle = {};
	const suggestions = [];
	pages.forEach( ( p ) => {
		const title = p.title.rendered || `#${ p.id }`;
		idToTitle[ p.id ] = title;
		suggestions.push( title );
	} );

	// Reverse map title → ID.
	const titleToId = {};
	pages.forEach( ( p ) => {
		titleToId[ p.title.rendered || `#${ p.id }` ] = p.id;
	} );

	// Current tokens (titles from IDs).
	const tokens = ids.map( ( id ) => idToTitle[ id ] || `#${ id }` );

	return (
		<>
			<SelectControl
				label={ __( 'Operator', 'wp-popup-manager' ) }
				value={ operator }
				options={ [
					{ value: 'include', label: __( 'Include', 'wp-popup-manager' ) },
					{ value: 'exclude', label: __( 'Exclude', 'wp-popup-manager' ) },
				] }
				onChange={ onChangeOperator }
			/>
			<FormTokenField
				label={ __( 'Pages', 'wp-popup-manager' ) }
				value={ tokens }
				suggestions={ suggestions }
				onChange={ ( newTokens ) => {
					const newIds = newTokens
						.map( ( token ) => titleToId[ token ] )
						.filter( Boolean );
					onChangeIds( newIds );
				} }
				__experimentalExpandOnFocus
			/>
		</>
	);
}

/**
 * Display Conditions panel.
 */
function ConditionsPanel() {
	const [ conditions, setConditions ] = usePopupMeta( '_popup_conditions', [] );

	const getCondition = ( type ) => conditions.find( ( c ) => c.type === type );
	const hasCondition = ( type ) => !! getCondition( type );

	const updateCondition = ( type, data ) => {
		const existing = conditions.find( ( c ) => c.type === type );
		if ( existing ) {
			setConditions(
				conditions.map( ( c ) => ( c.type === type ? { ...c, ...data } : c ) )
			);
		} else {
			setConditions( [ ...conditions, { type, ...data } ] );
		}
	};

	const removeCondition = ( type ) => {
		setConditions( conditions.filter( ( c ) => c.type !== type ) );
	};

	const pageCondition = getCondition( 'page' );
	const postTypeCondition = getCondition( 'post_type' );
	const dateCondition = getCondition( 'date_range' );
	const timeCondition = getCondition( 'time_range' );
	const userRoleCondition = getCondition( 'user_role' );
	const deviceCondition = getCondition( 'device' );
	const referrerCondition = getCondition( 'referrer' );

	return (
		<PluginDocumentSettingPanel
			name="popup-manager-conditions"
			title={ __( 'Display Conditions', 'wp-popup-manager' ) }
			icon="filter"
		>
			<VStack spacing={ 4 }>
				{ /* Specific pages */ }
				<ToggleControl
					label={ __( 'Specific pages', 'wp-popup-manager' ) }
					checked={ hasCondition( 'page' ) }
					onChange={ ( checked ) => {
						if ( checked ) {
							updateCondition( 'page', { ids: [], operator: 'include' } );
						} else {
							removeCondition( 'page' );
						}
					} }
				/>
				{ hasCondition( 'page' ) && (
					<PageSelector
						ids={ pageCondition?.ids || [] }
						operator={ pageCondition?.operator || 'include' }
						onChangeIds={ ( ids ) => updateCondition( 'page', { ids } ) }
						onChangeOperator={ ( operator ) => updateCondition( 'page', { operator } ) }
					/>
				) }

				{ /* Content types */ }
				<ToggleControl
					label={ __( 'Content types', 'wp-popup-manager' ) }
					checked={ hasCondition( 'post_type' ) }
					onChange={ ( checked ) => {
						if ( checked ) {
							updateCondition( 'post_type', { values: [ 'page' ] } );
						} else {
							removeCondition( 'post_type' );
						}
					} }
				/>
				{ hasCondition( 'post_type' ) && (
					<FormTokenField
						label={ __( 'Content types', 'wp-popup-manager' ) }
						value={ postTypeCondition?.values || [] }
						suggestions={ [ 'post', 'page', 'product', 'popup' ] }
						onChange={ ( values ) => updateCondition( 'post_type', { values } ) }
					/>
				) }

				{ /* Date range */ }
				<ToggleControl
					label={ __( 'Date range', 'wp-popup-manager' ) }
					checked={ hasCondition( 'date_range' ) }
					onChange={ ( checked ) => {
						if ( checked ) {
							updateCondition( 'date_range', { start: '', end: '' } );
						} else {
							removeCondition( 'date_range' );
						}
					} }
				/>
				{ hasCondition( 'date_range' ) && (
					<>
							<TextControl
							label={ __( 'Start date', 'wp-popup-manager' ) }
							type="date"
							value={ dateCondition?.start || '' }
							onChange={ ( value ) =>
								updateCondition( 'date_range', { start: value } )
							}
						/>
						<TextControl
							label={ __( 'End date', 'wp-popup-manager' ) }
							type="date"
							value={ dateCondition?.end || '' }
							onChange={ ( value ) =>
								updateCondition( 'date_range', { end: value } )
							}
						/>
						<TextControl
							label={ __( 'Start time', 'wp-popup-manager' ) }
							type="time"
							value={ dateCondition?.startTime || '' }
							onChange={ ( value ) =>
								updateCondition( 'date_range', { startTime: value } )
							}
						/>
						<TextControl
							label={ __( 'End time', 'wp-popup-manager' ) }
							type="time"
							value={ dateCondition?.endTime || '' }
							onChange={ ( value ) =>
								updateCondition( 'date_range', { endTime: value } )
							}
						/>
					</>
				) }
			{ /* Time range (daily recurring — happy hour) */ }
				<ToggleControl
					label={ __( 'Time of day', 'wp-popup-manager' ) }
					checked={ hasCondition( 'time_range' ) }
					onChange={ ( checked ) => {
						if ( checked ) {
							updateCondition( 'time_range', { startTime: '17:00', endTime: '19:00' } );
						} else {
							removeCondition( 'time_range' );
						}
					} }
				/>
				{ hasCondition( 'time_range' ) && (
					<>
						<TextControl
							label={ __( 'From', 'wp-popup-manager' ) }
							type="time"
							value={ timeCondition?.startTime || '17:00' }
							onChange={ ( value ) =>
								updateCondition( 'time_range', { startTime: value } )
							}
						/>
						<TextControl
							label={ __( 'To', 'wp-popup-manager' ) }
							type="time"
							value={ timeCondition?.endTime || '19:00' }
							onChange={ ( value ) =>
								updateCondition( 'time_range', { endTime: value } )
							}
							help={ __( 'Supports overnight ranges (e.g. 22:00 to 06:00).', 'wp-popup-manager' ) }
						/>
					</>
				) }

			{ /* User role */ }
				<ToggleControl
					label={ __( 'User role', 'wp-popup-manager' ) }
					checked={ hasCondition( 'user_role' ) }
					onChange={ ( checked ) => {
						if ( checked ) {
							updateCondition( 'user_role', { values: [], operator: 'include' } );
						} else {
							removeCondition( 'user_role' );
						}
					} }
				/>
				{ hasCondition( 'user_role' ) && (
					<>
						<SelectControl
							label={ __( 'Operator', 'wp-popup-manager' ) }
							value={ userRoleCondition?.operator || 'include' }
							options={ [
								{ value: 'include', label: __( 'Include', 'wp-popup-manager' ) },
								{ value: 'exclude', label: __( 'Exclude', 'wp-popup-manager' ) },
							] }
							onChange={ ( operator ) => updateCondition( 'user_role', { operator } ) }
						/>
						<FormTokenField
							label={ __( 'User roles', 'wp-popup-manager' ) }
							value={ userRoleCondition?.values || [] }
							suggestions={ [ 'administrator', 'editor', 'author', 'contributor', 'subscriber', 'customer', 'logged_out' ] }
							onChange={ ( values ) => updateCondition( 'user_role', { values: values.map( ( v ) => v.toLowerCase() ) } ) }
						/>
					</>
				) }

				{ /* Device */ }
				<ToggleControl
					label={ __( 'Device type', 'wp-popup-manager' ) }
					checked={ hasCondition( 'device' ) }
					onChange={ ( checked ) => {
						if ( checked ) {
							updateCondition( 'device', { values: [ 'desktop' ] } );
						} else {
							removeCondition( 'device' );
						}
					} }
				/>
				{ hasCondition( 'device' ) && (
					<FormTokenField
						label={ __( 'Devices', 'wp-popup-manager' ) }
						value={ deviceCondition?.values || [] }
						suggestions={ [ 'desktop', 'mobile', 'tablet' ] }
						onChange={ ( values ) => updateCondition( 'device', { values: values.map( ( v ) => v.toLowerCase() ) } ) }
						__experimentalExpandOnFocus
					/>
				) }

				{ /* Referrer */ }
				<ToggleControl
					label={ __( 'Referrer URL', 'wp-popup-manager' ) }
					checked={ hasCondition( 'referrer' ) }
					onChange={ ( checked ) => {
						if ( checked ) {
							updateCondition( 'referrer', { pattern: '' } );
						} else {
							removeCondition( 'referrer' );
						}
					} }
				/>
				{ hasCondition( 'referrer' ) && (
					<TextControl
						label={ __( 'URL pattern', 'wp-popup-manager' ) }
						value={ referrerCondition?.pattern || '' }
						onChange={ ( value ) => {
							updateCondition( 'referrer', { pattern: value } );
						} }
						help={ __( 'Example: google.com, facebook.com', 'wp-popup-manager' ) }
					/>
				) }
			</VStack>
		</PluginDocumentSettingPanel>
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
			<p style={ { margin: 0, fontSize: '12px', color: '#757575' } }>
				{ __(
					'Background, padding, radius and shadow of the frame are set on the Popup block itself, in the block sidebar.',
					'wp-popup-manager'
				) }
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
			<p>
				{ __(
					'This popup has no Popup block at the root, so its frame cannot be customised.',
					'wp-popup-manager'
				) }
			</p>
			<Button variant="secondary" onClick={ wrapInFrame }>
				{ __( 'Customize the frame', 'wp-popup-manager' ) }
			</Button>
		</Notice>
	);
}

/**
 * Appearance panel.
 */
function DisplayPanel() {
	const [ display, setDisplay ] = usePopupMeta( '_popup_display', {
		animation: 'fade',
		position: 'center',
		size: 'medium',
		overlay: true,
		overlayColor: 'rgba(0,0,0,0.5)',
		closeOnOverlayClick: true,
		closeOnEsc: true,
	} );

	const update = ( key, value ) => {
		setDisplay( { ...display, [ key ]: value } );
	};

	return (
		<PluginDocumentSettingPanel
			name="popup-manager-display"
			title={ __( 'Appearance', 'wp-popup-manager' ) }
			icon="admin-appearance"
		>
			<VStack spacing={ 3 }>
				<FrameNotice />

				<SelectControl
					label={ __( 'Animation', 'wp-popup-manager' ) }
					value={ display.animation }
					options={ [
						{ value: 'fade', label: __( 'Fade', 'wp-popup-manager' ) },
						{ value: 'slide-up', label: __( 'Slide up', 'wp-popup-manager' ) },
						{ value: 'scale', label: __( 'Scale', 'wp-popup-manager' ) },
						{ value: 'none', label: __( 'None', 'wp-popup-manager' ) },
					] }
					onChange={ ( v ) => update( 'animation', v ) }
				/>

				<fieldset>
					<legend style={ { fontWeight: 600, marginBottom: '0.5em' } }>
						{ __( 'Position', 'wp-popup-manager' ) }
					</legend>
					<div
						style={ {
							display: 'grid',
							gridTemplateColumns: 'repeat(3, 1fr)',
							gap: '4px',
						} }
						role="radiogroup"
						aria-label={ __( 'Position', 'wp-popup-manager' ) }
					>
						{ [
							{ value: 'top-left', label: '\u2196' },
							{ value: 'top', label: '\u2191' },
							{ value: 'top-right', label: '\u2197' },
							{ value: 'center-left', label: '\u2190' },
							{ value: 'center', label: '\u25CF' },
							{ value: 'center-right', label: '\u2192' },
							{ value: 'bottom-left', label: '\u2199' },
							{ value: 'bottom', label: '\u2193' },
							{ value: 'bottom-right', label: '\u2198' },
						].map( ( { value, label } ) => (
							<button
								key={ value }
								type="button"
								role="radio"
								aria-checked={ display.position === value }
								aria-label={ value.replace( '-', ' ' ) }
								onClick={ () => update( 'position', value ) }
								style={ {
									width: '100%',
									padding: '8px 0',
									fontSize: '16px',
									lineHeight: 1,
									border: '1px solid',
									borderColor: display.position === value ? '#3858e9' : '#ccc',
									borderRadius: '4px',
									background: display.position === value ? '#3858e9' : '#fff',
									color: display.position === value ? '#fff' : '#1e1e1e',
									cursor: 'pointer',
								} }
							>
								{ label }
							</button>
						) ) }
					</div>
					<ToggleControl
						label={ __( 'Fullscreen', 'wp-popup-manager' ) }
						checked={ display.position === 'fullscreen' }
						onChange={ ( checked ) =>
							update( 'position', checked ? 'fullscreen' : 'center' )
						}
						__nextHasNoMarginBottom
					/>
				</fieldset>

				<ToggleGroupControl
					label={ __( 'Size', 'wp-popup-manager' ) }
					value={ display.size }
					onChange={ ( v ) => update( 'size', v ) }
					isBlock
				>
					<ToggleGroupControlOption value="small" label="S" aria-label={ __( 'Small', 'wp-popup-manager' ) } />
					<ToggleGroupControlOption value="medium" label="M" aria-label={ __( 'Medium', 'wp-popup-manager' ) } />
					<ToggleGroupControlOption value="large" label="L" aria-label={ __( 'Large', 'wp-popup-manager' ) } />
				</ToggleGroupControl>

				<ToggleControl
					label={ __( 'Show overlay', 'wp-popup-manager' ) }
					checked={ display.overlay }
					onChange={ ( v ) => update( 'overlay', v ) }
				/>

				{ display.overlay && (
					<>
						<fieldset>
							<legend style={ { fontWeight: 600, marginBottom: '0.5em' } }>
								{ __( 'Overlay color', 'wp-popup-manager' ) }
							</legend>
							<ColorPicker
								color={ display.overlayColor }
								onChange={ ( v ) => update( 'overlayColor', v ) }
								enableAlpha
							/>
						</fieldset>
						<ToggleControl
							label={ __( 'Close on overlay click', 'wp-popup-manager' ) }
							checked={ display.closeOnOverlayClick }
							onChange={ ( v ) => update( 'closeOnOverlayClick', v ) }
						/>
					</>
				) }

				<ToggleControl
					label={ __( 'Close with Escape key', 'wp-popup-manager' ) }
					checked={ display.closeOnEsc }
					onChange={ ( v ) => update( 'closeOnEsc', v ) }
				/>
			</VStack>
		</PluginDocumentSettingPanel>
	);
}

/**
 * Frequency panel.
 */
function FrequencyPanel() {
	const [ frequency, setFrequency ] = usePopupMeta( '_popup_frequency', {
		type: 'always',
		cookieDuration: 30,
	} );

	const postType = useSelect( ( select ) => select( 'core/editor' ).getCurrentPostType(), [] );
	const [ meta, setMeta ] = useEntityProp( 'postType', postType, 'meta' );
	const analyticsEnabled = meta?._popup_analytics_enabled ?? false;

	return (
		<PluginDocumentSettingPanel
			name="popup-manager-frequency"
			title={ __( 'Frequency & Analytics', 'wp-popup-manager' ) }
			icon="update"
		>
			<VStack spacing={ 3 }>
				<RadioControl
					label={ __( 'Show popup', 'wp-popup-manager' ) }
					selected={ frequency.type }
					options={ [
						{ value: 'always', label: __( 'Every visit', 'wp-popup-manager' ) },
						{ value: 'once_per_session', label: __( 'Once per session', 'wp-popup-manager' ) },
						{ value: 'once_per_day', label: __( 'Once per day', 'wp-popup-manager' ) },
						{ value: 'once_ever', label: __( 'Once ever', 'wp-popup-manager' ) },
					] }
					onChange={ ( v ) => setFrequency( { ...frequency, type: v } ) }
				/>

				<ToggleControl
					label={ __( 'Enable analytics', 'wp-popup-manager' ) }
					checked={ analyticsEnabled }
					onChange={ ( v ) => setMeta( { ...meta, _popup_analytics_enabled: v } ) }
					help={ __(
						'Tracks impressions and closes. Adds 1 HTTP request per page view containing this popup.',
						'wp-popup-manager'
					) }
				/>
			</VStack>
		</PluginDocumentSettingPanel>
	);
}

/**
 * Register the editor plugin.
 */
registerPlugin( 'popup-manager-sidebar', {
	render: () => (
		<>
			<TriggerPanel />
			<ConditionsPanel />
			<DisplayPanel />
			<FrequencyPanel />
		</>
	),
} );
