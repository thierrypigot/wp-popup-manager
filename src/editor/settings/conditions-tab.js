/**
 * "Conditions" tab of the settings modal.
 *
 * Only the active conditions are shown, as cards with their summary. One
 * card is open at a time for editing. "Add a condition" lists the others.
 *
 * @package PopupManager
 * @since   1.4.0
 */

import { __, sprintf } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import {
	Button,
	CheckboxControl,
	DropdownMenu,
	FormTokenField,
	MenuGroup,
	MenuItem,
	Notice,
	SelectControl,
	TextControl,
	ToggleControl,
	__experimentalVStack as VStack,
} from '@wordpress/components';

import ContentPicker from '../content-picker';
import { DEVICES, conditionTypes, dateRangeState, usePopupMeta, useSummaryContext } from './shared';

/**
 * Post types that are never displayed as a page of their own.
 */
const INTERNAL_POST_TYPES = [ 'attachment', 'nav_menu_item', 'wp_block', 'wp_template', 'wp_template_part', 'wp_navigation', 'wp_global_styles', 'wp_font_family', 'wp_font_face', 'popup' ];

/**
 * Public content types.
 */
function usePublicPostTypes() {
	return useSelect(
		( select ) => ( select( 'core' ).getPostTypes( { per_page: -1 } ) || [] ).filter( ( type ) => ! INTERNAL_POST_TYPES.includes( type.slug ) ),
		[]
	);
}

/**
 * Content types editor.
 */
function PostTypeEditor( { condition, onChange } ) {
	const types = usePublicPostTypes();
	const values = condition.values || [];

	return (
		<fieldset className="popup-manager-settings__checkboxes">
			<legend>{ __( 'Show the popup on these content types', 'wp-popup-manager' ) }</legend>
			{ types.map( ( type ) => (
				<CheckboxControl
					__nextHasNoMarginBottom
					key={ type.slug }
					label={ type.name }
					checked={ values.includes( type.slug ) }
					onChange={ ( checked ) =>
						onChange( { values: checked ? [ ...values, type.slug ] : values.filter( ( value ) => value !== type.slug ) } )
					}
				/>
			) ) }
		</fieldset>
	);
}

/**
 * Taxonomy and terms editor. One taxonomy, several terms, stored by ID.
 */
function TaxonomyEditor( { condition, onChange } ) {
	const taxonomySlug = condition.taxonomy || '';

	const taxonomies = useSelect(
		( select ) =>
			// The view context also lists the taxonomies whose terms the user cannot assign.
			( select( 'core' ).getTaxonomies( { per_page: -1, context: 'view' } ) || [] ).filter( ( taxonomy ) =>
				( taxonomy.types || [] ).some( ( type ) => ! INTERNAL_POST_TYPES.includes( type ) )
			),
		[]
	);

	const current = taxonomies.find( ( taxonomy ) => taxonomy.slug === taxonomySlug );

	const terms = useSelect(
		( select ) =>
			current
				? select( 'core' ).getEntityRecords( 'taxonomy', current.slug, {
						per_page: 100,
						_fields: 'id,name,parent',
						orderby: 'name',
						order: 'asc',
				  } ) || []
				: [],
		[ current?.slug ]
	);

	// Token label: the term name, with its parent for hierarchical taxonomies.
	const byId = {};
	terms.forEach( ( term ) => {
		byId[ term.id ] = term;
	} );
	const labelOf = ( term ) => {
		const parent = term.parent ? byId[ term.parent ] : null;
		return parent ? `${ parent.name } › ${ term.name }` : term.name;
	};
	const labelToId = {};
	terms.forEach( ( term ) => {
		labelToId[ labelOf( term ) ] = term.id;
	} );

	const ids = condition.ids || [];
	const tokens = ids.map( ( id ) => ( byId[ id ] ? labelOf( byId[ id ] ) : `#${ id }` ) );

	return (
		<VStack spacing={ 4 }>
			<div className="popup-manager-settings__row">
				<SelectControl
					__nextHasNoMarginBottom
					label={ __( 'Taxonomy', 'wp-popup-manager' ) }
					value={ taxonomySlug }
					options={ [
						{ value: '', label: __( 'Choose a taxonomy', 'wp-popup-manager' ) },
						...taxonomies.map( ( taxonomy ) => ( { value: taxonomy.slug, label: taxonomy.name } ) ),
					] }
					onChange={ ( taxonomy ) => onChange( { taxonomy, ids: [] } ) }
				/>
				{ current && (
					<SelectControl
						__nextHasNoMarginBottom
						label={ __( 'Operator', 'wp-popup-manager' ) }
						value={ condition.operator || 'include' }
						options={ [
							{ value: 'include', label: __( 'Only these terms', 'wp-popup-manager' ) },
							{ value: 'exclude', label: __( 'All terms except these', 'wp-popup-manager' ) },
						] }
						onChange={ ( operator ) => onChange( { operator } ) }
					/>
				) }
			</div>
			{ current && (
				<>
					<FormTokenField
						__nextHasNoMarginBottom
						label={ __( 'Terms', 'wp-popup-manager' ) }
						value={ tokens }
						suggestions={ terms.map( labelOf ) }
						onChange={ ( newTokens ) =>
							onChange( {
								ids: newTokens
									.map( ( token ) => labelToId[ token ] ?? ( /^#\d+$/.test( token ) ? Number( token.slice( 1 ) ) : 0 ) )
									.filter( Boolean ),
							} )
						}
						__experimentalExpandOnFocus
					/>
					{ current.hierarchical && (
						<ToggleControl
							__nextHasNoMarginBottom
							label={ __( 'Include child terms', 'wp-popup-manager' ) }
							checked={ condition.children ?? true }
							onChange={ ( children ) => onChange( { children } ) }
						/>
					) }
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Also on the archives of these terms', 'wp-popup-manager' ) }
						checked={ condition.archives ?? true }
						onChange={ ( archives ) => onChange( { archives } ) }
					/>
					<p className="popup-manager-settings__hint">
						{ __(
							'Only applies to contents that have terms of this taxonomy, and to the archives of its terms. The home page, other archives and contents without terms never match.',
							'wp-popup-manager'
						) }
					</p>
				</>
			) }
		</VStack>
	);
}

/**
 * Date range editor.
 */
function DateRangeEditor( { condition, onChange } ) {
	const postDate = useSelect( ( select ) => select( 'core/editor' ).getEditedPostAttribute( 'date' ), [] );
	const state = dateRangeState( condition, postDate );

	return (
		<VStack spacing={ 4 }>
			<div className="popup-manager-settings__row">
				<TextControl __nextHasNoMarginBottom label={ __( 'Start date', 'wp-popup-manager' ) } type="date" value={ condition.start || '' } onChange={ ( start ) => onChange( { start } ) } />
				<TextControl __nextHasNoMarginBottom label={ __( 'Start time', 'wp-popup-manager' ) } type="time" value={ condition.startTime || '' } onChange={ ( startTime ) => onChange( { startTime } ) } />
			</div>
			<div className="popup-manager-settings__row">
				<TextControl __nextHasNoMarginBottom label={ __( 'End date', 'wp-popup-manager' ) } type="date" value={ condition.end || '' } onChange={ ( end ) => onChange( { end } ) } />
				<TextControl __nextHasNoMarginBottom label={ __( 'End time', 'wp-popup-manager' ) } type="time" value={ condition.endTime || '' } onChange={ ( endTime ) => onChange( { endTime } ) } />
			</div>
			{ 'ended' === state && (
				<Notice status="warning" isDismissible={ false }>
					{ __( 'This date range is over: the popup is no longer shown.', 'wp-popup-manager' ) }
				</Notice>
			) }
			{ 'before_publication' === state && (
				<Notice status="warning" isDismissible={ false }>
					{ __( 'This date range ends before the scheduled publication: the popup will never be shown.', 'wp-popup-manager' ) }
				</Notice>
			) }
		</VStack>
	);
}

/**
 * Editor of one condition, by type.
 */
function ConditionEditor( { condition, onChange } ) {
	switch ( condition.type ) {
		case 'page':
			return <ContentPicker ids={ condition.ids || [] } operator={ condition.operator || 'include' } onChange={ onChange } />;

		case 'post_type':
			return <PostTypeEditor condition={ condition } onChange={ onChange } />;

		case 'taxonomy':
			return <TaxonomyEditor condition={ condition } onChange={ onChange } />;

		case 'date_range':
			return <DateRangeEditor condition={ condition } onChange={ onChange } />;

		case 'time_range':
			return (
				<div className="popup-manager-settings__row">
					<TextControl __nextHasNoMarginBottom label={ __( 'From', 'wp-popup-manager' ) } type="time" value={ condition.startTime || '' } onChange={ ( startTime ) => onChange( { startTime } ) } />
					<TextControl
						__nextHasNoMarginBottom
						label={ __( 'To', 'wp-popup-manager' ) }
						type="time"
						value={ condition.endTime || '' }
						onChange={ ( endTime ) => onChange( { endTime } ) }
						help={ __( 'Supports overnight ranges (e.g. 22:00 to 06:00).', 'wp-popup-manager' ) }
					/>
				</div>
			);

		case 'user_role':
			return (
				<VStack spacing={ 4 }>
					<SelectControl
						__nextHasNoMarginBottom
						label={ __( 'Operator', 'wp-popup-manager' ) }
						value={ condition.operator || 'include' }
						options={ [
							{ value: 'include', label: __( 'Include', 'wp-popup-manager' ) },
							{ value: 'exclude', label: __( 'Exclude', 'wp-popup-manager' ) },
						] }
						onChange={ ( operator ) => onChange( { operator } ) }
					/>
					<FormTokenField
						__nextHasNoMarginBottom
						label={ __( 'User roles', 'wp-popup-manager' ) }
						value={ condition.values || [] }
						suggestions={ [ 'administrator', 'editor', 'author', 'contributor', 'subscriber', 'customer', 'logged_out' ] }
						onChange={ ( values ) => onChange( { values: values.map( ( value ) => value.toLowerCase() ) } ) }
						__experimentalExpandOnFocus
					/>
				</VStack>
			);

		case 'device':
			return (
				<fieldset className="popup-manager-settings__checkboxes">
					<legend>{ __( 'Show the popup on these devices', 'wp-popup-manager' ) }</legend>
					{ DEVICES().map( ( device ) => (
						<CheckboxControl
							__nextHasNoMarginBottom
							key={ device.value }
							label={ device.label }
							checked={ ( condition.values || [] ).includes( device.value ) }
							onChange={ ( checked ) => {
								const values = condition.values || [];
								onChange( { values: checked ? [ ...values, device.value ] : values.filter( ( value ) => value !== device.value ) } );
							} }
						/>
					) ) }
				</fieldset>
			);

		case 'referrer':
			return (
				<TextControl
					__nextHasNoMarginBottom
					label={ __( 'URL pattern', 'wp-popup-manager' ) }
					value={ condition.pattern || '' }
					onChange={ ( pattern ) => onChange( { pattern } ) }
					help={ __( 'Example: google.com, facebook.com', 'wp-popup-manager' ) }
				/>
			);

		default:
			return null;
	}
}

export default function ConditionsTab() {
	const [ meta, setMeta ] = usePopupMeta();
	const conditions = meta._popup_conditions;
	const context = useSummaryContext();
	const types = conditionTypes();
	const [ openType, setOpenType ] = useState( conditions.length === 1 ? conditions[ 0 ].type : null );

	const update = ( type, data ) => setMeta( '_popup_conditions', conditions.map( ( c ) => ( c.type === type ? { ...c, ...data } : c ) ) );
	const remove = ( type ) => setMeta( '_popup_conditions', conditions.filter( ( c ) => c.type !== type ) );
	const add = ( type ) => {
		const definition = types.find( ( item ) => item.type === type );
		setMeta( '_popup_conditions', [ ...conditions, { type, ...definition.defaults } ] );
		setOpenType( type );
	};

	// Cards follow the display order of the types, not the order of addition.
	const active = types.filter( ( definition ) => conditions.some( ( c ) => c.type === definition.type ) );
	const available = types.filter( ( definition ) => ! conditions.some( ( c ) => c.type === definition.type ) );

	return (
		<VStack spacing={ 4 }>
			<p className="popup-manager-settings__hint">
				{ conditions.length
					? __( 'The popup is shown when all these conditions are met.', 'wp-popup-manager' )
					: __( 'No condition: the popup is shown everywhere.', 'wp-popup-manager' ) }
			</p>

			{ active.map( ( definition ) => {
				const condition = conditions.find( ( c ) => c.type === definition.type );
				const summary = definition.describe( condition, context );
				const isOpen = openType === definition.type;
				const bodyId = `popup-manager-condition-${ definition.type }`;

				return (
					<section key={ definition.type } className={ `popup-manager-card${ isOpen ? ' is-open' : '' }` } aria-label={ definition.label }>
						<div className="popup-manager-card__header">
							<div className="popup-manager-card__title">
								<h3>{ definition.label }</h3>
								<p className={ summary.warning ? 'is-warning' : '' }>
									{ summary.warning && <span className="screen-reader-text">{ __( 'Warning:', 'wp-popup-manager' ) } </span> }
									{ summary.label }
								</p>
							</div>
							<Button
								variant={ isOpen ? 'primary' : 'secondary' }
								size="compact"
								aria-expanded={ isOpen }
								aria-controls={ bodyId }
								onClick={ () => setOpenType( isOpen ? null : definition.type ) }
							>
								{ isOpen ? __( 'Close', 'wp-popup-manager' ) : __( 'Edit', 'wp-popup-manager' ) }
							</Button>
							<Button
								icon="no-alt"
								size="compact"
								label={ sprintf( /* translators: %s: condition name. */ __( 'Remove the condition “%s”', 'wp-popup-manager' ), definition.label ) }
								onClick={ () => remove( definition.type ) }
							/>
						</div>
						{ isOpen && (
							<div id={ bodyId } className="popup-manager-card__body">
								<ConditionEditor condition={ condition } onChange={ ( data ) => update( definition.type, data ) } />
							</div>
						) }
					</section>
				);
			} ) }

			{ available.length > 0 && (
				<DropdownMenu
					icon="plus"
					label={ __( 'Add a condition', 'wp-popup-manager' ) }
					toggleProps={ { variant: 'secondary', children: __( 'Add a condition', 'wp-popup-manager' ), className: 'popup-manager-settings__add' } }
					popoverProps={ { placement: 'bottom-start' } }
				>
					{ ( { onClose } ) => (
						<MenuGroup>
							{ available.map( ( definition ) => (
								<MenuItem
									key={ definition.type }
									onClick={ () => {
										add( definition.type );
										onClose();
									} }
								>
									{ definition.label }
								</MenuItem>
							) ) }
						</MenuGroup>
					) }
				</DropdownMenu>
			) }
		</VStack>
	);
}
