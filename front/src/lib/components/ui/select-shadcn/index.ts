import { Select as SelectPrimitive } from 'bits-ui';

const Root = SelectPrimitive.Root;
const Value = SelectPrimitive.Value;

import Content from './select-content.svelte';
import Item from './select-item.svelte';
import Trigger from './select-trigger.svelte';

export {
    Root,
    Value,
    Content,
    Item,
    Trigger,
    //
    Root as Select,
    Value as SelectValue,
    Content as SelectContent,
    Item as SelectItem,
    Trigger as SelectTrigger,
};
