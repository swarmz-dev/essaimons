import { Select as SelectPrimitive } from 'bits-ui';

const Root = SelectPrimitive.Root;

import Content from './select-content.svelte';
import Item from './select-item.svelte';
import Trigger from './select-trigger.svelte';

export {
    Root,
    Content,
    Item,
    Trigger,
    //
    Root as Select,
    Content as SelectContent,
    Item as SelectItem,
    Trigger as SelectTrigger,
};
