/**
 * Custom webpack configuration for @wordpress/scripts.
 *
 * With WP_EXPERIMENTAL_MODULES=true, the default config is an array:
 * [scriptConfig, moduleConfig]. We extend the scriptConfig with
 * additional editor entrypoints. The moduleConfig handles view.js
 * automatically via viewScriptModule in block.json.
 *
 * @package PopupManager
 */

const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

const editorEntries = {
	'editor/sidebar-panel': path.resolve(
		__dirname,
		'src/editor/sidebar-panel.js'
	),
	'editor/settings-page': path.resolve(
		__dirname,
		'src/editor/settings-page.js'
	),
};

if ( Array.isArray( defaultConfig ) ) {
	// WP_EXPERIMENTAL_MODULES=true → [scriptConfig, moduleConfig].
	const [ scriptConfig, ...rest ] = defaultConfig;

	const scriptEntry =
		typeof scriptConfig.entry === 'function'
			? scriptConfig.entry()
			: scriptConfig.entry;

	module.exports = [
		{
			...scriptConfig,
			entry: {
				...scriptEntry,
				...editorEntries,
			},
		},
		...rest,
	];
} else {
	// Fallback: single config.
	const defaultEntry =
		typeof defaultConfig.entry === 'function'
			? defaultConfig.entry()
			: defaultConfig.entry;

	module.exports = {
		...defaultConfig,
		entry: {
			...defaultEntry,
			...editorEntries,
		},
	};
}
