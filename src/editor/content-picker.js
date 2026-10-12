/**
 * "Specific contents" condition: summary in the sidebar, picker in a modal.
 *
 * The condition keeps its historical type "page" and stores post IDs of any
 * content type. The modal filters by content type, searches on the server
 * (no preloaded list, so it scales to large sites) and shows what tells
 * homonyms apart: type, date, status, parent page, language.
 *
 * @package PopupManager
 * @since   1.3.1
 */

import { __, _n, sprintf } from '@wordpress/i18n';
import { useState, useEffect, useMemo } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { useDebounce } from '@wordpress/compose';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';
import { decodeEntities } from '@wordpress/html-entities';
import { dateI18n, getSettings } from '@wordpress/date';
import {
	Button,
	CheckboxControl,
	Modal,
	RadioControl,
	SearchControl,
	Spinner,
} from '@wordpress/components';

import './content-picker.css';

/**
 * Content types that are never displayed as a page of their own.
 */
const EXCLUDED_TYPES = [ 'attachment', 'popup', 'nav_menu_item', 'wp_block', 'wp_template', 'wp_template_part', 'wp_navigation', 'wp_global_styles', 'wp_font_family', 'wp_font_face' ];

const STATUSES = 'publish,future,draft,pending,private';
const PER_PAGE = 30;
const FIELDS = 'id,title,date,status,parent,link,type,popup_manager_lang';

/**
 * Content types offered by the picker.
 */
function useContentTypes() {
	return useSelect(
		( select ) =>
			( select( 'core' ).getPostTypes( { per_page: -1 } ) || [] ).filter(
				( type ) => type.rest_base && ! EXCLUDED_TYPES.includes( type.slug )
			),
		[]
	);
}

/**
 * Load the details of the given IDs, whatever their content type.
 * The search endpoint gives the type of each ID, then each type endpoint
 * gives the date, status and parent.
 *
 * @param {number[]} ids   Post IDs.
 * @param {Object[]} types Content types.
 * @return {{items: Object, loading: boolean}} Items by ID.
 */
function useItemsById( ids, types ) {
	const [ items, setItems ] = useState( {} );
	const [ loading, setLoading ] = useState( false );
	const key = ids.join( ',' );

	useEffect( () => {
		const missing = ids.filter( ( id ) => ! items[ id ] );

		if ( ! missing.length || ! types.length ) {
			return;
		}

		let cancelled = false;
		setLoading( true );

		// One request per content type: the type endpoints accept any status.
		Promise.all(
			types.map( ( type ) =>
				apiFetch( {
					path: addQueryArgs( `/${ type.rest_namespace || 'wp/v2' }/${ type.rest_base }`, {
						include: missing.join( ',' ),
						per_page: 100,
						status: STATUSES,
						context: 'edit',
						_fields: FIELDS,
					} ),
				} ).catch( () => [] )
			)
		).then( ( results ) => {
			if ( cancelled ) {
				return;
			}

			const found = {};
			results.flat().forEach( ( item ) => {
				found[ item.id ] = item;
			} );
			// Unknown IDs (deleted contents) are remembered as missing.
			missing.forEach( ( id ) => {
				if ( ! found[ id ] ) {
					found[ id ] = { id, missing: true };
				}
			} );

			setItems( ( previous ) => ( { ...previous, ...found } ) );
			setLoading( false );
		} );

		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ key, types.length ] );

	return { items, loading, addItems: ( list ) => setItems( ( previous ) => {
		const next = { ...previous };
		list.forEach( ( item ) => {
			next[ item.id ] = item;
		} );
		return next;
	} ) };
}

/**
 * Title of a content, decoded, with a fallback.
 *
 * @param {Object} item Content.
 * @return {string} Title.
 */
function titleOf( item ) {
	const title = decodeEntities( item?.title?.raw ?? item?.title?.rendered ?? '' );
	return title || sprintf( /* translators: %d: content ID. */ __( '(no title) #%d', 'wp-popup-manager' ), item.id );
}

/**
 * One line of details: type, date or status, parent, language.
 *
 * @param {Object} item      Content.
 * @param {Object} typeNames Type slug → singular name.
 * @param {Object} parents   Parent ID → title.
 * @return {string} Details.
 */
function detailsOf( item, typeNames, parents ) {
	const statuses = {
		draft: __( 'Draft', 'wp-popup-manager' ),
		pending: __( 'Pending review', 'wp-popup-manager' ),
		future: __( 'Scheduled', 'wp-popup-manager' ),
		private: __( 'Private', 'wp-popup-manager' ),
	};

	return [
		typeNames[ item.type ] || item.type,
		statuses[ item.status ] || ( item.date ? dateI18n( getSettings().formats.date, item.date ) : '' ),
		item.parent && parents[ item.parent ] ? `${ parents[ item.parent ] } ›` : '',
		item.popup_manager_lang ? item.popup_manager_lang.toUpperCase() : '',
	]
		.filter( Boolean )
		.join( ' · ' );
}

/**
 * Picker modal.
 */
function ContentPickerModal( { ids, operator, onChange, onClose } ) {
	const types = useContentTypes();
	const [ typeSlug, setTypeSlug ] = useState( 'post' );
	const [ search, setSearch ] = useState( '' );
	const [ results, setResults ] = useState( null );
	const [ showSelection, setShowSelection ] = useState( false );
	const debouncedSearch = useDebounce( setSearch, 300 );
	const [ searchInput, setSearchInput ] = useState( '' );

	const { items, loading: loadingSelection, addItems } = useItemsById( ids, types );

	const typeNames = useMemo( () => {
		const names = {};
		types.forEach( ( type ) => {
			names[ type.slug ] = type.labels?.singular_name || type.name;
		} );
		return names;
	}, [ types ] );

	const currentType = types.find( ( type ) => type.slug === typeSlug ) || types[ 0 ];

	// Server side search in the current content type.
	useEffect( () => {
		if ( ! currentType ) {
			return;
		}

		let cancelled = false;
		setResults( null );

		apiFetch( {
			path: addQueryArgs( `/${ currentType.rest_namespace || 'wp/v2' }/${ currentType.rest_base }`, {
				search: search || undefined,
				orderby: search ? 'relevance' : 'date',
				per_page: PER_PAGE,
				status: STATUSES,
				context: 'edit',
				_fields: FIELDS,
			} ),
		} )
			.catch( () => [] )
			.then( ( list ) => {
				if ( ! cancelled ) {
					setResults( list );
					addItems( list );
				}
			} );

		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ currentType?.slug, search ] );

	// Titles of the parent pages, to tell apart subpages of the same name.
	const parentIds = useMemo( () => {
		const list = ( showSelection ? ids.map( ( id ) => items[ id ] ) : results || [] )
			.filter( ( item ) => item?.parent )
			.map( ( item ) => item.parent );
		return [ ...new Set( list ) ];
	}, [ showSelection, ids, items, results ] );
	const { items: parentItems } = useItemsById( parentIds, types );
	const parents = {};
	parentIds.forEach( ( id ) => {
		if ( parentItems[ id ] && ! parentItems[ id ].missing ) {
			parents[ id ] = titleOf( parentItems[ id ] );
		}
	} );

	const toggle = ( id, checked ) => {
		onChange( { ids: checked ? [ ...ids, id ] : ids.filter( ( current ) => current !== id ) } );
	};

	const rows = showSelection ? ids.map( ( id ) => items[ id ] || { id } ) : results;

	return (
		<Modal
			title={ __( 'Specific contents', 'wp-popup-manager' ) }
			onRequestClose={ onClose }
			size="large"
			className="popup-manager-picker"
		>
			<div className="popup-manager-picker__body">
				<RadioControl
					label={ __( 'Mode', 'wp-popup-manager' ) }
					selected={ operator }
					options={ [
						{ value: 'include', label: __( 'Only on these contents', 'wp-popup-manager' ) },
						{ value: 'exclude', label: __( 'Everywhere except these contents', 'wp-popup-manager' ) },
					] }
					onChange={ ( value ) => onChange( { operator: value } ) }
				/>

				<div className="popup-manager-picker__toolbar">
					<div
						className="popup-manager-picker__types"
						role="group"
						aria-label={ __( 'Content type', 'wp-popup-manager' ) }
					>
						{ types.map( ( type ) => (
							<Button
								key={ type.slug }
								variant={ ! showSelection && currentType?.slug === type.slug ? 'primary' : 'tertiary' }
								aria-pressed={ ! showSelection && currentType?.slug === type.slug }
								onClick={ () => {
									setShowSelection( false );
									setTypeSlug( type.slug );
								} }
							>
								{ type.name }
							</Button>
						) ) }
						<Button
							variant={ showSelection ? 'primary' : 'secondary' }
							aria-pressed={ showSelection }
							onClick={ () => setShowSelection( true ) }
							className="popup-manager-picker__selection-tab"
						>
							{ sprintf( /* translators: %d: number of selected contents. */ __( 'Selection (%d)', 'wp-popup-manager' ), ids.length ) }
						</Button>
					</div>

					{ ! showSelection && (
						<SearchControl
							__nextHasNoMarginBottom
							label={ sprintf( /* translators: %s: content type name. */ __( 'Search in %s', 'wp-popup-manager' ), currentType?.name || '' ) }
							value={ searchInput }
							onChange={ ( value ) => {
								setSearchInput( value );
								debouncedSearch( value );
							} }
						/>
					) }
				</div>

				<div className="popup-manager-picker__results" aria-live="polite" aria-busy={ null === rows || loadingSelection }>
					{ null === rows && <Spinner /> }

					{ rows && ! rows.length && (
						<p className="popup-manager-picker__empty">
							{ showSelection
								? __( 'No content selected yet.', 'wp-popup-manager' )
								: __( 'No content found.', 'wp-popup-manager' ) }
						</p>
					) }

					{ rows && rows.length > 0 && (
						<ul className="popup-manager-picker__list">
							{ rows.map( ( item ) => (
								<li key={ item.id } className="popup-manager-picker__item">
									<CheckboxControl
										__nextHasNoMarginBottom
										checked={ ids.includes( item.id ) }
										onChange={ ( checked ) => toggle( item.id, checked ) }
										label={
											item.missing
												? sprintf( /* translators: %d: content ID. */ __( 'Content #%d, deleted', 'wp-popup-manager' ), item.id )
												: titleOf( item )
										}
										help={ item.missing || ! item.type ? undefined : detailsOf( item, typeNames, parents ) }
									/>
									{ item.link && (
										<Button
											variant="link"
											href={ item.link }
											target="_blank"
											rel="noreferrer"
											className="popup-manager-picker__view"
										>
											{ __( 'View', 'wp-popup-manager' ) }
											<span className="screen-reader-text">
												{ sprintf( /* translators: %s: content title. */ __( '“%s” (opens in a new tab)', 'wp-popup-manager' ), titleOf( item ) ) }
											</span>
										</Button>
									) }
								</li>
							) ) }
						</ul>
					) }

					{ ! showSelection && rows && rows.length === PER_PAGE && (
						<p className="popup-manager-picker__empty">
							{ __( 'Only the first results are listed: refine the search.', 'wp-popup-manager' ) }
						</p>
					) }
				</div>

				<div className="popup-manager-picker__footer">
					<Button variant="primary" onClick={ onClose }>
						{ __( 'Done', 'wp-popup-manager' ) }
					</Button>
				</div>
			</div>
		</Modal>
	);
}

/**
 * Sidebar part: summary and button.
 */
export default function ContentPicker( { ids, operator, onChange } ) {
	const [ isOpen, setOpen ] = useState( false );

	let summary = __( 'No content selected: no restriction.', 'wp-popup-manager' );
	if ( ids.length ) {
		summary = sprintf(
			'exclude' === operator
				? /* translators: %d: number of contents. */ _n( 'Everywhere except %d content', 'Everywhere except %d contents', ids.length, 'wp-popup-manager' )
				: /* translators: %d: number of contents. */ _n( 'Only on %d content', 'Only on %d contents', ids.length, 'wp-popup-manager' ),
			ids.length
		);
	}

	return (
		<div className="popup-manager-picker-summary">
			<p>{ summary }</p>
			<Button variant="secondary" onClick={ () => setOpen( true ) } aria-haspopup="dialog">
				{ __( 'Choose contents…', 'wp-popup-manager' ) }
			</Button>
			{ isOpen && (
				<ContentPickerModal
					ids={ ids }
					operator={ operator }
					onChange={ onChange }
					onClose={ () => setOpen( false ) }
				/>
			) }
		</div>
	);
}
