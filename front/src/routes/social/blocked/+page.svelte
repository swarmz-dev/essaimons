<script lang="ts">
    import { m } from '#lib/paraglide/messages';
    import { Title } from '#lib/components/ui/title';
    import { onMount } from 'svelte';
    import Search from '#components/Search.svelte';
    import Pagination from '#components/Pagination.svelte';
    import { Button } from '$lib/components/ui/button';
    import Loader from '#components/Loader.svelte';
    import { PUBLIC_DEFAULT_IMAGE } from '$env/static/public';
    import { type PaginatedBlockedUsers, type SerializedUser, type SerializedBlockedUser } from 'backend/types';
    import Meta from '#components/Meta.svelte';
    import {
        AlertDialog,
        AlertDialogAction,
        AlertDialogCancel,
        AlertDialogContent,
        AlertDialogDescription,
        AlertDialogFooter,
        AlertDialogHeader,
        AlertDialogTitle,
    } from '#lib/components/ui/alert-dialog';
    import { wrappedFetch } from '#lib/services/requestService';
    import { Check } from '@lucide/svelte';
    import { page } from '$app/state';

    let isLoading: boolean = false;
    let paginatedBlockedUsers: PaginatedBlockedUsers | undefined = $state();
    const blockedUsers = $derived(paginatedBlockedUsers?.blockedUsers || []);
    let query: string = $state('');
    let selectedBlockedUser: SerializedUser | undefined = $state();
    let showModal: boolean = $state(false);

    // To avoid a tailwindcss bug where it's trying to parse the result of the placeholder if put directly into search's placeholder attribute
    const searchPlaceholder: string = m['social.blocked.search.placeholder']();

    onMount(async (): Promise<void> => {
        if (page.data.isSuccess) {
            paginatedBlockedUsers = page.data.blockedUsers;
        } else {
            await getBlockedUsers();
        }
    });

    const getBlockedUsers = async (page: number = 1, limit: number = 10): Promise<void> => {
        await wrappedFetch(`/social/blocked?page=${page}&limit=${limit}&query=${query}`, { method: 'GET' }, (data): void => {
            paginatedBlockedUsers = data.blockedUsers;
        });
    };

    const handleUnblockUser = async (): Promise<void> => {
        if (!paginatedBlockedUsers || !selectedBlockedUser) {
            return;
        }

        await wrappedFetch(`/social/blocked/cancel/${selectedBlockedUser.id}`, { method: 'DELETE' }, (): void => {
            paginatedBlockedUsers!.blockedUsers = paginatedBlockedUsers!.blockedUsers.filter((currentUser: SerializedBlockedUser): boolean => {
                return currentUser.user.id !== selectedBlockedUser!.id;
            });
        });
        showModal = false;
    };

    const handleShowUnblockModal = (user: SerializedUser): void => {
        selectedBlockedUser = user;
        showModal = true;
    };
</script>

<Meta title={m['social.blocked.meta.title']()} description={m['social.blocked.meta.description']()} keywords={m['social.blocked.meta.keywords']().split(', ')} pathname="/social/blocked" />

<Title title={m['social.blocked.title']()} />

<div class="w-full mt-8">
    <Search
        selected
        placeholder={searchPlaceholder}
        label={m['social.friends.add.search.label']()}
        name="search-friend"
        minChars={3}
        onSearch={() => getBlockedUsers()}
        bind:search={query}
        bind:resultsArray={blockedUsers}
    />
</div>

{#if paginatedBlockedUsers}
    <div class="flex flex-wrap gap-5 justify-center my-5">
        {#if paginatedBlockedUsers.blockedUsers.length}
            <div class="flex flex-col gap-1 w-full">
                {#each paginatedBlockedUsers.blockedUsers as blocked}
                    <div
                        class="flex justify-between items-center h-12 border border-gray-300 dark:border-gray-800 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-800 transition-colors duration-300 px-3"
                    >
                        <div class="flex gap-5 flex-wrap items-center">
                            {#if blocked.user.profilePicture}
                                <img alt={blocked.user.username} src={`/assets/profile-picture/${blocked.user.id}`} class="w-8 rounded-full" />
                            {:else}
                                <img alt={blocked.user.username} src={PUBLIC_DEFAULT_IMAGE} class="w-8 rounded-full" />
                            {/if}
                            <p>{blocked.user.username}</p>
                        </div>
                        <Button aria-label="Unblock user" variant="outline" onclick={() => handleShowUnblockModal(blocked.user)}>
                            <Check class="size-6" />
                        </Button>
                    </div>
                {/each}
            </div>
        {:else}
            <p class="my-5">{m['social.blocked.none']()}</p>
        {/if}
    </div>
    <Pagination paginatedObject={paginatedBlockedUsers} onChange={async (page: number, limit: number) => await getBlockedUsers(page, limit)} />
{:else}
    <Loader {isLoading} />
{/if}

<AlertDialog open={showModal} onOpenChange={() => (showModal = false)}>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>{m['social.unblock.modal.title']()}</AlertDialogTitle>
            <AlertDialogDescription>{m['social.unblock.modal.text']({ username: selectedBlockedUser?.username || '' })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>{m['common.cancel']()}</AlertDialogCancel>
            <AlertDialogAction onclick={handleUnblockUser}>{m['common.continue']()}</AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>
