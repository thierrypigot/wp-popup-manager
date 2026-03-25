import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';
import metadata from './block.json';
import Edit from './edit';

registerBlockType( metadata.name, {
	edit: Edit,
	// Save the InnerBlocks content (core/button).
	// The server-side render.php wraps it with Interactivity API directives.
	save: () => <InnerBlocks.Content />,
} );
