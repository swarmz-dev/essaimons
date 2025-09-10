<script lang="ts">
    import { m } from '#lib/paraglide/messages';
    import { onMount } from 'svelte';
    import Pagination from '#components/Pagination.svelte';
    import Search from '#components/Search.svelte';
    import { Button } from '#lib/components/ui/button';
    import { waitForTransmit } from '#lib/stores/transmitStore';
    import { profile } from '#lib/stores/profileStore';
    import { setPendingFriendRequests } from '#lib/stores/notificationStore';
    import Loader from '#components/Loader.svelte';
    import { type PaginatedUsers, type SerializedUser, type SerializedPendingFriend } from 'backend/types';
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
    import type { Transmit } from '@adonisjs/transmit-client';
    import { XIcon, UserRoundPlus, UserRoundX, Check } from '@lucide/svelte';
    import { PUBLIC_DEFAULT_IMAGE } from '$env/static/public';

    type Props = {
        onUpdateFriends: () => void;
    };

    let { onUpdateFriends }: Props = $props();

    let isLoading: boolean = $state(false);
    let paginatedUsers: PaginatedUsers | undefined = $state();
    const users = $derived(paginatedUsers?.users || []);
    let query: string = $state('');
    let showModal: boolean = $state(false);
    let blockingUser: SerializedUser | undefined = $state();

    // To avoid a tailwindcss bug where it's trying to parse the result of the placeholder if put directly into search's placeholder attribute
    const searchPlaceholder: string = m['social.friends.add.search.placeholder']();

    onMount(async (): Promise<void> => {
        await setupEvents();
        await getUsers();
    });

    const setupEvents = async (): Promise<void> => {
        const transmit: Transmit = await waitForTransmit();

        // sender updated when receiver accepts friend request
        const acceptedFriendRequest = transmit.subscription(`notification/add-friend/accept/${$profile!.id}`);
        await acceptedFriendRequest.create();
        acceptedFriendRequest.onMessage((user: SerializedUser) => {
            if (paginatedUsers) {
                paginatedUsers.users = paginatedUsers.users.filter((currentUser) => currentUser.id !== user?.id);
            }
            onUpdateFriends();
        });

        // sender updated when friend request is refused by receiver
        const refuseFriendRequest = transmit.subscription(`notification/add-friend/refuse/${$profile!.id}`);
        await refuseFriendRequest.create();
        refuseFriendRequest.onMessage((user: SerializedUser) => {
            updateUser(user.id, { sentFriendRequest: false });
        });

        // receiver updated when request received
        const receivedFriendRequest = transmit.subscription(`notification/add-friend/${$profile!.id}`);
        await receivedFriendRequest.create();
        receivedFriendRequest.onMessage((pendingFriendRequest: SerializedPendingFriend) => {
            updateUser(pendingFriendRequest.notification.from.id, { receivedFriendRequest: true });
        });

        // receiver updated when his request is cancelled by sender
        const cancelFriendRequest = transmit.subscription(`notification/add-friend/cancel/${$profile!.id}`);
        await cancelFriendRequest.create();
        cancelFriendRequest.onMessage((pendingFriendRequest: SerializedPendingFriend) => {
            updateUser(pendingFriendRequest.notification.from.id, { receivedFriendRequest: false });
        });

        // receiver updated when becomes blocked
        const blockedUser = transmit.subscription(`notification/blocked/${$profile!.id}`);
        await blockedUser.create();
        blockedUser.onMessage((user: SerializedUser) => {
            if (paginatedUsers) {
                paginatedUsers.users = paginatedUsers.users.filter((currentUser: SerializedUser) => currentUser.id !== user?.id);
            }
        });

        // receiver updated when becomes unblocked
        const unblockedUser = transmit.subscription(`notification/unblocked/${$profile!.id}`);
        await unblockedUser.create();
        unblockedUser.onMessage(async () => {
            await getUsers();
        });

        // update when a user removes us from its friends
        const removeFriend = transmit.subscription(`notification/friend/remove/${$profile!.id}`);
        await removeFriend.create();
        removeFriend.onMessage(async () => {
            await getUsers();
        });
    };

    const getUsers = async (page: number = 1, limit: number = 10): Promise<void> => {
        await wrappedFetch(`/social/friends/add?page=${page}&limit=${limit}&query=${query}`, { method: 'GET' }, (data): void => {
            paginatedUsers = data.users;
        });
    };

    const handleAskFriend = async (user: SerializedUser): Promise<void> => {
        await wrappedFetch(`/social/friends/ask/${user.id}`, { method: 'POST' }, (): void => {
            updateUser(user.id, { sentFriendRequest: true });
        });
    };

    const handleCancelFriendRequest = async (user: SerializedUser): Promise<void> => {
        await wrappedFetch(`/social/friends/pending/cancel/${user.id}`, { method: 'DELETE' }, (): void => {
            updateUser(user.id, { sentFriendRequest: false });
        });
    };

    const handleBlockUser = async (): Promise<void> => {
        await wrappedFetch(`/social/block/${blockingUser!.id}`, { method: 'POST' }, (): void => {
            if (!paginatedUsers) {
                return;
            }

            paginatedUsers.users = paginatedUsers.users.filter((currentUser) => currentUser.id !== blockingUser?.id);
        });
        showModal = false;
    };

    const handleAcceptPendingRequest = async (user: SerializedUser): Promise<void> => {
        await wrappedFetch(`/social/friends/pending/accept/${user.id}`, { method: 'POST' }, async (): Promise<void> => {
            await setPendingFriendRequests();
            if (paginatedUsers) {
                paginatedUsers.users = paginatedUsers.users.filter((currentUser: SerializedUser) => currentUser.id !== user?.id);
            }
            onUpdateFriends();
        });
    };

    const handleRefusePendingRequest = async (user: SerializedUser): Promise<void> => {
        await wrappedFetch(`/social/friends/pending/refuse/${user.id}`, { method: 'POST' }, async (): Promise<void> => {
            await setPendingFriendRequests();
            updateUser(user.id, { receivedFriendRequest: false });
            onUpdateFriends();
        });
    };

    const updateUser = (userId: number, updates: Partial<SerializedUser>): void => {
        if (!paginatedUsers) {
            return;
        }
        paginatedUsers = {
            ...paginatedUsers,
            users: paginatedUsers.users.map((user: SerializedUser): SerializedUser => (user.id === userId ? { ...user, ...updates } : user)),
        };
    };

    const handleShowBlockingModal = (user: SerializedUser): void => {
        blockingUser = user;
        showModal = true;
    };
</script>

<div class="w-full mt-3">
    <Search
        selected
        placeholder={searchPlaceholder}
        label={m['social.friends.add.search.label']()}
        name="search-friend"
        minChars={3}
        onSearch={() => getUsers()}
        bind:search={query}
        bind:resultsArray={users}
    />
</div>

{#if paginatedUsers}
    <div class="flex flex-wrap gap-5 justify-center my-5">
        {#if paginatedUsers.users.length}
            <div class="flex flex-col gap-1 w-full">
                {#each paginatedUsers.users as user}
                    <div
                        class="flex justify-between items-center h-12 border border-gray-300 dark:border-gray-800 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-800 transition-colors duration-300 px-3"
                    >
                        <div class="flex gap-5 flex-wrap items-center">
                            {#if user.profilePicture}
                                <img alt={user.username} src={`/assets/profile-picture/${user.id}`} class="w-8 rounded-full" />
                            {:else}
                                <img alt={user.username} src={PUBLIC_DEFAULT_IMAGE} class="w-8 rounded-full" />
                            {/if}
                            <p>{user.username}</p>
                        </div>
                        <div class="flex gap-5">
                            {#if user.sentFriendRequest}
                                <Button aria-label="Cancel friend request" variant="outline" onclick={() => handleCancelFriendRequest(user)}>
                                    <XIcon class="size-6" />
                                </Button>
                            {:else if user.receivedFriendRequest}
                                <div class="flex gap-5">
                                    <Button aria-label="Accept as friend" variant="outline" onclick={() => handleAcceptPendingRequest(user)}>
                                        <Check class="size-6 text-green-500" />
                                    </Button>
                                    <Button aria-label="Refuse friend request" variant="outline" onclick={() => handleRefusePendingRequest(user)}>
                                        <XIcon class="size-6 text-red-500" />
                                    </Button>
                                </div>
                            {:else}
                                <Button aria-label="Send friend request" variant="outline" onclick={() => handleAskFriend(user)}>
                                    <UserRoundPlus class="size-6" />
                                </Button>
                            {/if}
                            <Button aria-label="Block user" variant="outline" onclick={() => handleShowBlockingModal(user)}>
                                <UserRoundX class="size-6 text-red-500" />
                            </Button>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <p class="my-5">{m['social.friends.add.none']()}</p>
        {/if}
    </div>
    <Pagination paginatedObject={paginatedUsers} onChange={async (page: number, limit: number) => await getUsers(page, limit)} />
{:else}
    <Loader {isLoading} />
{/if}

<AlertDialog open={showModal} onOpenChange={() => (showModal = false)}>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>{m['social.blocked.modal.title']()}</AlertDialogTitle>
            <AlertDialogDescription>{m['social.blocked.modal.text']({ username: blockingUser?.username || '' })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>{m['common.cancel']()}</AlertDialogCancel>
            <AlertDialogAction onclick={handleBlockUser}>{m['common.continue']()}</AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>
