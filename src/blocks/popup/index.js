import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';
import metadata from './block.json';
import Edit from './edit';

import './style.css';
import './editor.css';

registerBlockType( metadata.name, {
	edit: Edit,
	// The frame is rendered server-side by popup_manager_render_popup();
	// save only has to serialize the inner blocks.
	save: () => <InnerBlocks.Content />,
} );
