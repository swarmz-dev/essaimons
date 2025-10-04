<script lang="ts">
    import { FieldLabel } from '#lib/components/forms';
    import { Input } from '#lib/components/ui/input';
    import { RichTextEditor } from '#lib/components/ui/rich-text';
    import { Textarea } from '#lib/components/ui/textarea';
    import { m } from '#lib/paraglide/messages';

    export let summary: string;
    export let mandatesDescription: string;
    export let clarificationDeadline: string;
    export let amendmentDeadline: string;
    export let voteDeadline: string;
    export let mandateDeadline: string;
    export let evaluationDeadline: string;
</script>

<div class="space-y-6">
    <FieldLabel forId="summary" label={m['proposition-create.fields.summary.label']()} required info={m['proposition-create.fields.summary.info']()}>
        <Textarea name="summary" id="summary" bind:value={summary} max={300} rows={6} required />
    </FieldLabel>

    <RichTextEditor
        name="mandatesDescription"
        label={m['proposition-create.fields.mandates-description.label']()}
        info={m['proposition-create.fields.mandates-description.info']()}
        bind:value={mandatesDescription}
        required
        max={1500}
    />
</div>

<div class="space-y-6">
    <div class="grid gap-4">
        <FieldLabel forId="clarificationDeadline" label={m['proposition-create.fields.clarification-deadline.label']()} required info={m['proposition-create.fields.clarification-deadline.info']()}>
            <Input type="date" name="clarificationDeadline" id="clarificationDeadline" bind:value={clarificationDeadline} required />
        </FieldLabel>
        <FieldLabel forId="amendmentDeadline" label={m['proposition-create.fields.amendment-deadline.label']()} required info={m['proposition-create.fields.amendment-deadline.info']()}>
            <Input type="date" name="amendmentDeadline" id="amendmentDeadline" bind:value={amendmentDeadline} required />
        </FieldLabel>
        <FieldLabel forId="voteDeadline" label={m['proposition-create.fields.vote-deadline.label']()} required info={m['proposition-create.fields.vote-deadline.info']()}>
            <Input type="date" name="voteDeadline" id="voteDeadline" bind:value={voteDeadline} required />
        </FieldLabel>
        <FieldLabel forId="mandateDeadline" label={m['proposition-create.fields.mandate-deadline.label']()} required info={m['proposition-create.fields.mandate-deadline.info']()}>
            <Input type="date" name="mandateDeadline" id="mandateDeadline" bind:value={mandateDeadline} required />
        </FieldLabel>
        <FieldLabel forId="evaluationDeadline" label={m['proposition-create.fields.evaluation-deadline.label']()} required info={m['proposition-create.fields.evaluation-deadline.info']()}>
            <Input type="date" name="evaluationDeadline" id="evaluationDeadline" bind:value={evaluationDeadline} required />
        </FieldLabel>
    </div>
</div>
