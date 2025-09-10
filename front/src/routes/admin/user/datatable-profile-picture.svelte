<script lang="ts">
    import type { SerializedUser } from 'backend/types';
    import { PUBLIC_DEFAULT_IMAGE } from '$env/static/public';

    type Props = {
        user: SerializedUser;
    };

    let { user }: Props = $props();
</script>

<img src={user.profilePicture ? `/assets/profile-picture/${user.id}` : PUBLIC_DEFAULT_IMAGE} alt={user.username} class="max-h-10 rounded-lg" />
