/**
 * Shared helpers of the popup settings: meta access, labels and summaries.
 *
 * The summaries mirror the "Setup" column of the list table
 * (includes/admin-summary.php), so that the sidebar and the list say the same.
 *
 * @package PopupManager
 * @since   1.4.0
 */

import { __, _n, sprintf } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { useEntityProp } from '@wordpress/core-data';
import { date as formatDate, dateI18n, getSettings } from '@wordpress/date';

/**
 * Default values, same as the meta registration (includes/register-cpt.php).
 */
export const DEFAULTS = {
	_popup_triggers: [ { type: 'click' } ],
	_popup_conditions: [],
	_popup_display: {
		animation: 'fade',
		position: 'center',
		size: 'medium',
		overlay: true,
		overlayColor: 'rgba(0,0,0,0.5)',
		closeOnOverlayClick: true,
		closeOnEsc: true,
	},
	_popup_frequency: { type: 'always', cookieDuration: 30 },
	_popup_analytics_enabled: false,
};

/**
 * Read and write the popup meta. Every write keeps the other keys.
 *
 * @return {[Object, Function]} Meta with defaults, and a setter taking a key and a value.
 */
export function usePopupMeta() {
	const postType = useSelect( ( select ) => select( 'core/editor' ).getCurrentPostType(), [] );
	const [ meta, setMeta ] = useEntityProp( 'postType', postType, 'meta' );

	const values = {};
	Object.keys( DEFAULTS ).forEach( ( key ) => {
		values[ key ] = meta?.[ key ] ?? DEFAULTS[ key ];
	} );
	values._popup_enabled = meta?._popup_enabled ?? true;

	const setValue = ( key, value ) => setMeta( { ...meta, [ key ]: value } );

	return [ values, setValue ];
}

export const TRIGGER_TYPES = () => [
	{ value: 'click', label: __( 'Click (trigger button)', 'wp-popup-manager' ) },
	{ value: 'on_load', label: __( 'Page load', 'wp-popup-manager' ) },
	{ value: 'scroll', label: __( 'Scroll depth', 'wp-popup-manager' ) },
	{ value: 'section', label: __( 'Section reached', 'wp-popup-manager' ) },
	{ value: 'exit_intent', label: __( 'Exit intent (mouse)', 'wp-popup-manager' ) },
	{ value: 'inactivity', label: __( 'Inactivity', 'wp-popup-manager' ) },
];

export const FREQUENCIES = () => [
	{ value: 'always', label: __( 'Every visit', 'wp-popup-manager' ) },
	{ value: 'once_per_session', label: __( 'Once per session', 'wp-popup-manager' ) },
	{ value: 'once_per_day', label: __( 'Once per day', 'wp-popup-manager' ) },
	{ value: 'once_ever', label: __( 'Once ever', 'wp-popup-manager' ) },
];

export const ANIMATIONS = () => [
	{ value: 'fade', label: __( 'Fade', 'wp-popup-manager' ) },
	{ value: 'slide-up', label: __( 'Slide up', 'wp-popup-manager' ) },
	{ value: 'scale', label: __( 'Scale', 'wp-popup-manager' ) },
	{ value: 'none', label: __( 'None', 'wp-popup-manager' ) },
];

export const POSITIONS = () => [
	{ value: 'top-left', label: __( 'top left', 'wp-popup-manager' ) },
	{ value: 'top', label: __( 'top', 'wp-popup-manager' ) },
	{ value: 'top-right', label: __( 'top right', 'wp-popup-manager' ) },
	{ value: 'center-left', label: __( 'center left', 'wp-popup-manager' ) },
	{ value: 'center', label: __( 'center', 'wp-popup-manager' ) },
	{ value: 'center-right', label: __( 'center right', 'wp-popup-manager' ) },
	{ value: 'bottom-left', label: __( 'bottom left', 'wp-popup-manager' ) },
	{ value: 'bottom', label: __( 'bottom', 'wp-popup-manager' ) },
	{ value: 'bottom-right', label: __( 'bottom right', 'wp-popup-manager' ) },
];

export const DEVICES = () => [
	{ value: 'desktop', label: __( 'Desktop', 'wp-popup-manager' ) },
	{ value: 'tablet', label: __( 'Tablet', 'wp-popup-manager' ) },
	{ value: 'mobile', label: __( 'Mobile', 'wp-popup-manager' ) },
];

const labelOf = ( list, value ) => list.find( ( item ) => item.value === value )?.label ?? value;

/**
 * Summary of the trigger, with a warning flag.
 *
 * @param {Object} trigger First trigger.
 * @return {{label: string, warning: boolean}} Summary.
 */
export function describeTrigger( trigger ) {
	const type = trigger?.type || 'click';

	switch ( type ) {
		case 'on_load':
			return {
				label: trigger.delay
					? sprintf( /* translators: %s: delay in seconds. */ __( 'Page load, after %s s', 'wp-popup-manager' ), trigger.delay )
					: __( 'Page load', 'wp-popup-manager' ),
			};
		case 'scroll':
			return { label: sprintf( /* translators: %s: scroll percentage. */ __( 'Scroll to %s %%', 'wp-popup-manager' ), trigger.threshold ?? 50 ) };
		case 'section':
			return trigger.anchor
				? { label: sprintf( /* translators: %s: HTML anchor. */ __( 'Section #%s reached', 'wp-popup-manager' ), trigger.anchor ) }
				: { label: __( 'Section reached, no anchor: never shown', 'wp-popup-manager' ), warning: true };
		case 'exit_intent':
			return { label: __( 'Exit intent', 'wp-popup-manager' ) };
		case 'inactivity':
			return { label: sprintf( /* translators: %s: delay in seconds. */ __( 'Inactivity of %s s', 'wp-popup-manager' ), trigger.delay ?? 30 ) };
		default:
			return { label: __( 'Click on a trigger button', 'wp-popup-manager' ) };
	}
}

/**
 * Frequency label.
 *
 * @param {Object} frequency Frequency meta.
 * @return {string} Label.
 */
export function describeFrequency( frequency ) {
	return labelOf( FREQUENCIES(), frequency?.type || 'always' );
}

/**
 * State of a date range compared to now and to the publication date.
 * Same comparison as the server: site local time, Y-m-d H:i strings.
 *
 * @param {Object} condition Date range condition.
 * @param {string} postDate  Publication date of the popup.
 * @return {''|'ended'|'before_publication'|'upcoming'} State.
 */
export function dateRangeState( condition, postDate ) {
	const now = formatDate( 'Y-m-d H:i' );
	const start = condition?.start ? `${ condition.start } ${ condition.startTime || '00:00' }` : '';
	const end = condition?.end ? `${ condition.end } ${ condition.endTime || '23:59' }` : '';
	const publication = postDate ? formatDate( 'Y-m-d H:i', postDate ) : '';

	if ( end && now > end ) {
		return 'ended';
	}
	if ( end && publication > now && publication > end ) {
		return 'before_publication';
	}
	if ( start && now < start ) {
		return 'upcoming';
	}
	return '';
}

/**
 * Whether the popup is restricted to chosen contents ("Only on these contents").
 * Content types and taxonomy conditions are then redundant: they can only
 * remove some of the chosen contents.
 *
 * @param {Object[]} conditions Conditions meta.
 * @return {boolean} True when restricted.
 */
export function isLimitedToContents( conditions ) {
	return ( conditions || [] ).some( ( c ) => 'page' === c.type && 'include' === ( c.operator || 'include' ) && ( c.ids || [] ).length );
}

/**
 * Condition types made redundant by "Only on these contents".
 */
export const REDUNDANT_WITH_CONTENTS = [ 'post_type', 'taxonomy' ];

const formatDay = ( day ) => ( day ? dateI18n( getSettings().formats.date, `${ day }T12:00:00` ) : '' );

/**
 * Condition types, in display order, with their label, default values and summary.
 *
 * @return {Object[]} Condition types.
 */
export function conditionTypes() {
	return [
		{
			type: 'page',
			label: __( 'Specific contents', 'wp-popup-manager' ),
			defaults: { ids: [], operator: 'exclude' },
			describe: ( c ) => {
				const count = ( c.ids || [] ).length;
				if ( ! count ) {
					return { label: __( 'No content selected: no restriction.', 'wp-popup-manager' ) };
				}
				return {
					label: sprintf(
						'exclude' === c.operator
							? /* translators: %d: number of contents. */ _n( 'Everywhere except %d content', 'Everywhere except %d contents', count, 'wp-popup-manager' )
							: /* translators: %d: number of contents. */ _n( 'Only on %d content', 'Only on %d contents', count, 'wp-popup-manager' ),
						count
					),
				};
			},
		},
		{
			type: 'post_type',
			label: __( 'Content types', 'wp-popup-manager' ),
			defaults: { values: [ 'post' ] },
			describe: ( c, context ) => ( {
				label: ( c.values || [] ).map( ( slug ) => context.postTypeNames[ slug ] || slug ).join( ', ' ) || __( 'None selected', 'wp-popup-manager' ),
			} ),
		},
		{
			type: 'taxonomy',
			label: __( 'Taxonomy', 'wp-popup-manager' ),
			defaults: { taxonomy: '', ids: [], operator: 'include', children: true, archives: true },
			describe: ( c, context ) => {
				const name = context.taxonomyNames[ c.taxonomy ];
				const count = ( c.ids || [] ).length;
				if ( ! name || ! count ) {
					return { label: __( 'No term selected: no restriction.', 'wp-popup-manager' ) };
				}
				const terms = sprintf( /* translators: %d: number of terms. */ _n( '%d term', '%d terms', count, 'wp-popup-manager' ), count );
				return {
					label: 'exclude' === c.operator
						? sprintf( /* translators: 1: taxonomy name, 2: list of terms. */ __( '%1$s: all except %2$s', 'wp-popup-manager' ), name, terms )
						: sprintf( /* translators: 1: taxonomy name, 2: list of terms. */ __( '%1$s: %2$s', 'wp-popup-manager' ), name, terms ),
				};
			},
		},
		{
			type: 'date_range',
			label: __( 'Date range', 'wp-popup-manager' ),
			defaults: { start: '', end: '' },
			describe: ( c, context ) => {
				let label = '';
				if ( c.start && c.end ) {
					label = sprintf( /* translators: 1: start date, 2: end date. */ __( '%1$s → %2$s', 'wp-popup-manager' ), formatDay( c.start ), formatDay( c.end ) );
				} else if ( c.start ) {
					label = sprintf( /* translators: %s: start date. */ __( 'From %s', 'wp-popup-manager' ), formatDay( c.start ) );
				} else if ( c.end ) {
					label = sprintf( /* translators: %s: end date. */ __( 'Until %s', 'wp-popup-manager' ), formatDay( c.end ) );
				} else {
					return { label: __( 'No date set: no restriction.', 'wp-popup-manager' ) };
				}

				const state = dateRangeState( c, context.postDate );
				if ( 'ended' === state ) {
					return { label: sprintf( /* translators: %s: date range. */ __( '%s (ended)', 'wp-popup-manager' ), label ), warning: true };
				}
				if ( 'before_publication' === state ) {
					return { label: sprintf( /* translators: %s: date range. */ __( '%s (ends before the publication)', 'wp-popup-manager' ), label ), warning: true };
				}
				if ( 'upcoming' === state ) {
					return { label: sprintf( /* translators: %s: date range. */ __( '%s (upcoming)', 'wp-popup-manager' ), label ) };
				}
				return { label };
			},
		},
		{
			type: 'time_range',
			label: __( 'Time of day', 'wp-popup-manager' ),
			defaults: { startTime: '17:00', endTime: '19:00' },
			describe: ( c ) => ( {
				label: sprintf( /* translators: 1: start time, 2: end time. */ __( '%1$s – %2$s', 'wp-popup-manager' ), c.startTime || '00:00', c.endTime || '23:59' ),
			} ),
		},
		{
			type: 'user_role',
			label: __( 'User role', 'wp-popup-manager' ),
			defaults: { values: [], operator: 'include' },
			describe: ( c ) => {
				const roles = ( c.values || [] ).map( ( role ) => ( 'logged_out' === role ? __( 'Logged-out visitors', 'wp-popup-manager' ) : role ) );
				if ( ! roles.length ) {
					return { label: __( 'No role selected: no restriction.', 'wp-popup-manager' ) };
				}
				return {
					label: 'exclude' === c.operator
						? sprintf( /* translators: %s: list of roles. */ __( 'Except %s', 'wp-popup-manager' ), roles.join( ', ' ) )
						: roles.join( ', ' ),
				};
			},
		},
		{
			type: 'device',
			label: __( 'Device type', 'wp-popup-manager' ),
			defaults: { values: [ 'mobile' ] },
			describe: ( c ) => ( {
				label: ( c.values || [] ).map( ( value ) => labelOf( DEVICES(), value ) ).join( ', ' ) || __( 'None selected', 'wp-popup-manager' ),
			} ),
		},
		{
			type: 'referrer',
			label: __( 'Referrer URL', 'wp-popup-manager' ),
			defaults: { pattern: '' },
			describe: ( c ) => ( {
				label: c.pattern
					? sprintf( /* translators: %s: referrer URL pattern. */ __( 'From “%s”', 'wp-popup-manager' ), c.pattern )
					: __( 'No pattern set: no restriction.', 'wp-popup-manager' ),
			} ),
		},
	];
}

/**
 * Data the condition summaries need: content type and taxonomy names,
 * publication date.
 *
 * @return {Object} Context.
 */
export function useSummaryContext() {
	return useSelect( ( select ) => {
		const postTypeNames = {};
		( select( 'core' ).getPostTypes( { per_page: -1 } ) || [] ).forEach( ( type ) => {
			postTypeNames[ type.slug ] = type.name;
		} );

		const taxonomyNames = {};
		( select( 'core' ).getTaxonomies( { per_page: -1, context: 'view' } ) || [] ).forEach( ( taxonomy ) => {
			taxonomyNames[ taxonomy.slug ] = taxonomy.name;
		} );

		return {
			postTypeNames,
			taxonomyNames,
			postDate: select( 'core/editor' ).getEditedPostAttribute( 'date' ),
		};
	}, [] );
}

/**
 * Summaries of the active conditions, "Everywhere" when there is none.
 *
 * @param {Object[]} conditions Conditions meta.
 * @param {Object}   context    From useSummaryContext().
 * @return {Object[]} List of {type, title, label, warning}.
 */
export function describeConditions( conditions, context ) {
	const limited = isLimitedToContents( conditions );

	// Display order of the types, same as the cards of the Conditions tab.
	const list = conditionTypes()
		.map( ( type ) => {
			const condition = ( conditions || [] ).find( ( item ) => item.type === type.type );
			if ( ! condition ) {
				return null;
			}

			const summary = { type: type.type, title: type.label, ...type.describe( condition, context ) };

			if ( limited && REDUNDANT_WITH_CONTENTS.includes( type.type ) ) {
				summary.label = sprintf( /* translators: %s: condition summary. */ __( '%s (redundant with the chosen contents)', 'wp-popup-manager' ), summary.label );
				summary.warning = true;
			}

			return summary;
		} )
		.filter( Boolean );

	return list.length ? list : [ { type: '', title: '', label: __( 'Everywhere', 'wp-popup-manager' ), muted: true } ];
}
