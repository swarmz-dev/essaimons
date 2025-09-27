<script lang="ts">
    import { FieldLabel } from '#lib/components/forms';
    import { MultiSelect, type MultiSelectOption } from '#lib/components/ui/multi-select';
    import { Textarea } from '#lib/components/ui/textarea';
    import { m } from '#lib/paraglide/messages';

    export let impacts: string;
    export let expertise: string;
    export let associatedPropositionStrings: string[];
    export let propositionOptions: MultiSelectOption[] = [];
    export let rescueInitiatorStrings: string[];
    export let userOptions: MultiSelectOption[] = [];
</script>

<div class="space-y-6">
    <FieldLabel forId="impacts" label={m['proposition-create.fields.impacts.label']()} required info={m['proposition-create.fields.impacts.info']()}>
        <Textarea name="impacts" id="impacts" bind:value={impacts} max={1500} rows={8} required />
    </FieldLabel>

    <FieldLabel forId="expertise" label={m['proposition-create.fields.expertise.label']()} info={m['proposition-create.fields.expertise.info']()}>
        <Textarea name="expertise" id="expertise" bind:value={expertise} max={150} rows={4} />
    </FieldLabel>

    <FieldLabel forId="associatedPropositions" label={m['proposition-create.fields.associated-propositions.label']()} info={m['proposition-create.fields.associated-propositions.info']()}>
        <MultiSelect placeholder={m['proposition-create.fields.associated-propositions.placeholder']()} bind:selectedValues={associatedPropositionStrings} options={propositionOptions} />
    </FieldLabel>
</div>

<div class="space-y-6">
    <FieldLabel forId="rescueInitiators" label={m['proposition-create.fields.rescue-initiators.label']()} required info={m['proposition-create.fields.rescue-initiators.info']()}>
        <MultiSelect placeholder={m['proposition-create.fields.rescue-initiators.placeholder']()} bind:selectedValues={rescueInitiatorStrings} options={userOptions} />
    </FieldLabel>
</div>
