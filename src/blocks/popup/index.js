import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';

import './style.css';

registerBlockType( metadata.name, {
	edit: Edit,
	// No save: 100% server-side render via render.php.
	save: () => null,
} );
