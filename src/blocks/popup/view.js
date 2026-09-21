/**
 * Interactivity API Store — WP Popup Manager.
 *
 * Handles popup open/close, focus trap,
 * focus restoration, inert management and automatic triggers.
 *
 * @package PopupManager
 */

import { store, getContext, getElement, withSyncEvent } from '@wordpress/interactivity';

/**
 * Focusable element selectors (same as core/navigation pattern).
 */
const FOCUSABLE = [
	'a[href]',
	'input:not([disabled]):not([type="hidden"]):not([aria-hidden])',
	'select:not([disabled]):not([aria-hidden])',
	'textarea:not([disabled]):not([aria-hidden])',
	'button:not([disabled]):not([aria-hidden])',
	'[contenteditable]',
	'[tabindex]:not([tabindex^="-"])',
].join( ',' );

/**
 * IDs of currently open popups.
 */
const openIds = new Set();

/**
 * Analytics event buffer. Sent once via Beacon API on pagehide.
 */
const analyticsBuffer = [];
let beaconRegistered = false;

function trackEvent( popupId, type ) {
	analyticsBuffer.push( { popupId, type } );

	if ( ! beaconRegistered ) {
		beaconRegistered = true;
		window.addEventListener( 'pagehide', () => {
			if ( analyticsBuffer.length === 0 ) {
				return;
			}
			const url = '/wp-json/popup-manager/v1/analytics';
			const data = JSON.stringify( { events: analyticsBuffer } );
			navigator.sendBeacon( url, new Blob( [ data ], { type: 'application/json' } ) );
		} );
	}
}

/**
 * Get the dialog element within the current wrapper.
 */
function getDialog( ref ) {
	return ref.querySelector( '[role="dialog"], [role="alertdialog"]' );
}

/**
 * Get focusable elements within the dialog.
 */
function getFocusables( dialog ) {
	if ( ! dialog ) {
		return [];
	}
	return [ ...dialog.querySelectorAll( FOCUSABLE ) ];
}

/**
 * Scroll hint and keyboard reachability of the scrolling region.
 *
 * The content is what scrolls inside the dialog, so it gets:
 * - .has-overflow while there is more to read, .is-at-end once the bottom is
 *   reached, which drive the fade at the bottom edge;
 * - tabindex="0" when it holds no focusable element of its own, so the region
 *   stays operable with the keyboard (WCAG 2.1.1 / RGAA).
 */
const scrollHints = new WeakMap();

function setupScrollHint( dialog ) {
	const content = dialog?.querySelector( '.popup-manager-content' );

	if ( ! content || scrollHints.has( content ) ) {
		return;
	}

	const update = () => {
		const hasOverflow = content.scrollHeight > content.clientHeight + 1;
		const atEnd =
			content.scrollTop + content.clientHeight >= content.scrollHeight - 2;

		content.classList.toggle( 'has-overflow', hasOverflow );
		content.classList.toggle( 'is-at-end', atEnd );

		if ( hasOverflow && getFocusables( content ).length === 0 ) {
			content.setAttribute( 'tabindex', '0' );
		} else {
			content.removeAttribute( 'tabindex' );
		}
	};

	// Images and third party embeds change the height after the popup opens.
	const observer = new ResizeObserver( update );
	observer.observe( content );
	for ( const child of content.children ) {
		observer.observe( child );
	}

	content.addEventListener( 'scroll', update, { passive: true } );
	scrollHints.set( content, { observer, update } );
	update();
}

function teardownScrollHint( dialog ) {
	const content = dialog?.querySelector( '.popup-manager-content' );
	const hint = content && scrollHints.get( content );

	if ( ! hint ) {
		return;
	}

	hint.observer.disconnect();
	content.removeEventListener( 'scroll', hint.update );
	scrollHints.delete( content );
}

/**
 * Apply/remove inert on the main page content.
 */
function togglePageInert( add ) {
	if ( add ) {
		document.documentElement.classList.add( 'has-popup-open' );
		// Apply inert on direct body children (except popups).
		for ( const child of document.body.children ) {
			if ( ! child.classList.contains( 'popup-manager-wrapper' ) ) {
				child.inert = true;
			}
		}
	} else {
		document.documentElement.classList.remove( 'has-popup-open' );
		for ( const child of document.body.children ) {
			child.inert = false;
		}
	}
}

const { state, actions } = store(
	'popup-manager',
	{
		state: {
			get hasOpenPopup() {
				return openIds.size > 0;
			},
			get isHidden() {
				const ctx = getContext();
				return ! ctx.isOpen;
			},
		},

		actions: {
			open() {
				const ctx = getContext();

				if ( ctx.isOpen ) {
					return;
				}

				// Check frequency.
				const freqKey = `popup-manager-seen-${ ctx.popupId }`;

				if ( ctx.frequencyType === 'once_per_session' ) {
					if ( sessionStorage.getItem( freqKey ) ) {
						return;
					}
					sessionStorage.setItem( freqKey, '1' );
				}

				if ( ctx.frequencyType === 'once_per_day' ) {
					const stored = localStorage.getItem( freqKey );
					if ( stored ) {
						const elapsed = Date.now() - parseInt( stored, 10 );
						if ( elapsed < 86400000 ) {
							return;
						}
					}
					localStorage.setItem( freqKey, String( Date.now() ) );
				}

				if ( ctx.frequencyType === 'once_ever' ) {
					if ( localStorage.getItem( freqKey ) ) {
						return;
					}
					localStorage.setItem( freqKey, '1' );
				}

				// Close any already open popup.
				if ( openIds.size > 0 ) {
					document
						.querySelectorAll( '.popup-manager-wrapper.is-open' )
						.forEach( ( el ) => {
							const closeBtn = el.querySelector( '.popup-manager-close' );
							if ( closeBtn ) {
								closeBtn.click();
							}
						} );
				}

				ctx.isOpen = true;
				openIds.add( ctx.popupId );

				// Save current focus for restoration.
				ctx.previousFocus = document.activeElement;

				togglePageInert( true );

				// Track impression if analytics enabled.
				if ( ctx.analyticsEnabled ) {
					trackEvent( ctx.popupId, 'impression' );
				}

				// Announce to screen readers via live region.
				const { ref } = getElement();
				const liveRegion = ref.querySelector( '.popup-manager-live' );
				const dialogTitle = ref.querySelector( '.popup-manager-title' );
				if ( liveRegion && dialogTitle ) {
					liveRegion.textContent = dialogTitle.textContent;
				}
			},

			close() {
				const ctx = getContext();

				if ( ! ctx.isOpen ) {
					return;
				}

				ctx.isOpen = false;
				openIds.delete( ctx.popupId );

				if ( openIds.size === 0 ) {
					togglePageInert( false );
				}

				// Track close if analytics enabled.
				if ( ctx.analyticsEnabled ) {
					trackEvent( ctx.popupId, 'close' );
				}

				// Restore focus to the trigger element.
				if ( ctx.previousFocus && typeof ctx.previousFocus.focus === 'function' ) {
					ctx.previousFocus.focus();
				}
				ctx.previousFocus = null;
			},

			closeFromOverlay() {
				const ctx = getContext();
				if ( ctx.closeOnOverlayClick ) {
					actions.close();
				}
			},

			handleKeydown: withSyncEvent( ( event ) => {
				const ctx = getContext();

				if ( ! ctx.isOpen ) {
					return;
				}

				// Escape key closes the popup.
				if ( event.key === 'Escape' && ctx.closeOnEsc ) {
					event.stopPropagation();
					actions.close();
					return;
				}

				// Focus trap: Tab / Shift+Tab.
				if ( event.key === 'Tab' ) {
					const { ref } = getElement();
					const dialog = getDialog( ref );
					const focusables = getFocusables( dialog );

					if ( focusables.length === 0 ) {
						event.preventDefault();
						return;
					}

					const first = focusables[ 0 ];
					const last = focusables[ focusables.length - 1 ];

					if ( event.shiftKey && document.activeElement === first ) {
						event.preventDefault();
						last.focus();
					} else if ( ! event.shiftKey && document.activeElement === last ) {
						event.preventDefault();
						first.focus();
					}
				}
			} ),

			/**
			 * Action for the popup-trigger block.
			 * Opens a popup by its ID by finding its wrapper in the DOM.
			 */
			openById() {
				const ctx = getContext();
				const popupId = ctx.popupId;

				if ( ! popupId ) {
					return;
				}

				// Find the target popup wrapper so getContext() works in the correct scope.
				const wrapper = document.querySelector(
					`.popup-manager-wrapper[data-popup-id="${ popupId }"]`
				);

				if ( ! wrapper ) {
					return;
				}

				// Trigger the open action in the target popup context.
				const openBtn = wrapper.querySelector( '[data-wp-on--click="actions.openFromTrigger"]' );
				if ( openBtn ) {
					openBtn.click();
				}
			},

			/**
			 * Internal action called by the hidden button inside the popup wrapper.
			 * Allows the external trigger to open the popup in the correct context.
			 */
			openFromTrigger() {
				actions.open();
			},
		},

		callbacks: {
			/**
			 * Watch: manage focus when isOpen changes.
			 */
			watchOpenState() {
				const ctx = getContext();
				const { ref } = getElement();

				if ( ctx.isOpen ) {
					const dialog = getDialog( ref );
					const isAutoTrigger = ctx.triggerType !== 'click';

					requestAnimationFrame( () => {
						setupScrollHint( dialog );

						if ( isAutoTrigger ) {
							// For auto-triggered popups (alertdialog), focus the close
							// button first so the user can dismiss immediately.
							const closeBtn = dialog?.querySelector( '.popup-manager-close' );
							if ( closeBtn ) {
								closeBtn.focus();
								return;
							}
						}

						// For click-triggered popups, focus the first interactive element.
						const focusables = getFocusables( dialog );
						if ( focusables.length > 0 ) {
							focusables[ 0 ].focus();
						} else if ( dialog ) {
							// Fallback: focus the dialog itself.
							dialog.setAttribute( 'tabindex', '-1' );
							dialog.focus();
						}
					} );
				} else {
					teardownScrollHint( getDialog( ref ) );
				}
			},

			/**
			 * Init: initialize automatic triggers.
			 *
			 * Async callbacks (setTimeout, event listeners) lose the
			 * Interactivity API reactive scope, so getContext() would fail.
			 * We click the hidden button instead to re-enter the directive scope.
			 */
			initTrigger() {
				const ctx = getContext();
				const { ref } = getElement();

				// Grab the hidden trigger button for async open.
				const triggerBtn = ref.querySelector(
					'[data-wp-on--click="actions.openFromTrigger"]'
				);

				// on_load trigger: open after a delay.
				if ( ctx.triggerType === 'on_load' && triggerBtn ) {
					const delay = ( ctx.delay || 0 ) * 1000;
					setTimeout( () => {
						triggerBtn.click();
					}, delay );
				}

				// scroll trigger: open when user scrolls past threshold %.
				if ( ctx.triggerType === 'scroll' && triggerBtn ) {
					const threshold = ctx.threshold || 50;
					const handler = () => {
						const scrollTop = window.scrollY || document.documentElement.scrollTop;
						const docHeight = document.documentElement.scrollHeight - window.innerHeight;
						if ( docHeight <= 0 ) {
							return;
						}
						const percent = ( scrollTop / docHeight ) * 100;
						if ( percent >= threshold ) {
							triggerBtn.click();
							window.removeEventListener( 'scroll', handler );
						}
					};
					window.addEventListener( 'scroll', handler, { passive: true } );
				}

				// exit_intent trigger: detect mouse leaving the window.
				if ( ctx.triggerType === 'exit_intent' && triggerBtn ) {
					const handler = ( e ) => {
						if ( e.clientY <= 0 ) {
							triggerBtn.click();
							document.removeEventListener( 'mouseout', handler );
						}
					};
					document.addEventListener( 'mouseout', handler );
				}

				// inactivity trigger: open after N seconds without interaction.
				if ( ctx.triggerType === 'inactivity' && triggerBtn ) {
					const delay = ( ctx.delay || 30 ) * 1000;
					let timer = setTimeout( () => triggerBtn.click(), delay );
					const events = [ 'mousemove', 'keydown', 'scroll', 'touchstart' ];
					const reset = () => {
						clearTimeout( timer );
						timer = setTimeout( () => {
							triggerBtn.click();
							events.forEach( ( e ) => document.removeEventListener( e, reset ) );
						}, delay );
					};
					events.forEach( ( e ) =>
						document.addEventListener( e, reset, { passive: true } )
					);
				}
			},
		},
	},
	{ lock: true }
);
