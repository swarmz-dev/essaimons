import { writable, type Writable } from 'svelte/store';
import type { SerializedProposition } from 'backend/types';
import type { PropositionComment, PropositionDetailPayload, PropositionEvent, PropositionMandate, PropositionVote } from '#lib/types/proposition';

type PropositionDetailState = {
    proposition: SerializedProposition | null;
    events: PropositionEvent[];
    votes: PropositionVote[];
    mandates: PropositionMandate[];
    comments: PropositionComment[];
};

const initialState: PropositionDetailState = {
    proposition: null,
    events: [],
    votes: [],
    mandates: [],
    comments: [],
};

const upsertById = <T extends { id: string }>(items: T[], next: T): T[] => {
    const index = items.findIndex((item) => item.id === next.id);
    if (index === -1) {
        return [...items, next];
    }
    const clone = [...items];
    clone.splice(index, 1, next);
    return clone;
};

const removeById = <T extends { id: string }>(items: T[], id: string): T[] => items.filter((item) => item.id !== id);

export type PropositionDetailStore = ReturnType<typeof createPropositionDetailStore>;

export const createPropositionDetailStore = () => {
    const store: Writable<PropositionDetailState> = writable(initialState);

    return {
        subscribe: store.subscribe,
        reset(): void {
            store.set(initialState);
        },
        setPayload(payload: PropositionDetailPayload): void {
            store.set({
                proposition: payload.proposition,
                events: [...payload.events],
                votes: [...payload.votes],
                mandates: [...payload.mandates],
                comments: [...payload.comments],
            });
        },
        updateProposition(next: SerializedProposition): void {
            store.update((state) => ({ ...state, proposition: next }));
        },
        upsertEvent(event: PropositionEvent): void {
            store.update((state) => ({ ...state, events: upsertById(state.events, event) }));
        },
        removeEvent(eventId: string): void {
            store.update((state) => ({ ...state, events: removeById(state.events, eventId) }));
        },
        upsertVote(vote: PropositionVote): void {
            store.update((state) => ({ ...state, votes: upsertById(state.votes, vote) }));
        },
        removeVote(voteId: string): void {
            store.update((state) => ({ ...state, votes: removeById(state.votes, voteId) }));
        },
        upsertMandate(mandate: PropositionMandate): void {
            store.update((state) => ({ ...state, mandates: upsertById(state.mandates, mandate) }));
        },
        removeMandate(mandateId: string): void {
            store.update((state) => ({ ...state, mandates: removeById(state.mandates, mandateId) }));
        },
        setComments(comments: PropositionComment[]): void {
            store.update((state) => ({ ...state, comments: [...comments] }));
        },
        upsertComment(comment: PropositionComment): void {
            store.update((state) => {
                const replies = comment.parentId
                    ? state.comments.map((existing) => (existing.id === comment.parentId ? { ...existing, replies: upsertById(existing.replies ?? [], comment) } : existing))
                    : upsertById(state.comments, comment);
                return { ...state, comments: replies };
            });
        },
        removeComment(commentId: string, parentId?: string | null): void {
            store.update((state) => {
                if (parentId) {
                    const nextComments = state.comments.map((comment) => (comment.id === parentId ? { ...comment, replies: removeById(comment.replies ?? [], commentId) } : comment));
                    return { ...state, comments: nextComments };
                }
                return { ...state, comments: removeById(state.comments, commentId) };
            });
        },
    };
};

export const propositionDetailStore = createPropositionDetailStore();
