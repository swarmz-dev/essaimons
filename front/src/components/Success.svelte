<div class="circle success">
    <div class="sign"></div>
</div>

<style>
    .circle {
        display: flex;
        width: 10.555rem;
        height: 10.555rem;
        justify-content: center;
        align-items: flex-start;
        border-radius: 50%;
        animation:
            circle-appearance 0.8s ease-in-out 1 forwards,
            set-overflow 0.1s 1.1s forwards;
    }

    .sign {
        position: relative;
        opacity: 0;
        background: #fff;
        animation-duration: 0.8s;
        animation-delay: 0.2s;
        animation-timing-function: ease-in-out;
        animation-iteration-count: 1;
        animation-fill-mode: forwards;
        width: 1rem;
        height: 6rem;
        border-radius: 50% 50% 50% 0 / 10%;
        transform: translateX(130%) translateY(35%) rotate(45deg) scale(0.11);
        animation-name: success-sign-appearance;
    }

    .sign::before,
    .sign::after {
        content: '';
        position: absolute;
        background: inherit;
    }

    .sign::before {
        bottom: -17%;
        width: 100%;
        height: 50%;
        transform: translateX(-130%) rotate(90deg);
        border-radius: 50% 50% 50% 50% / 20%;
    }

    .sign::after {
        left: 100%;
        top: 0;
        width: 500%;
        height: 95%;
        transform: translateY(4%) rotate(0deg);
        border-radius: 0;
        opacity: 0;
        animation: set-shaddow 0s 1.13s ease-in-out forwards;
        z-index: -1;
        background: rgb(40, 128, 96);
    }

    .success {
        background: rgb(56, 176, 131);
    }

    @keyframes circle-appearance {
        0% {
            transform: scale(0);
        }

        50% {
            transform: scale(1.5);
        }

        60% {
            transform: scale(1);
        }

        100% {
            transform: scale(1);
        }
    }

    @keyframes success-sign-appearance {
        50% {
            opacity: 1;
            transform: translateX(130%) translateY(35%) rotate(45deg) scale(1.7);
        }

        100% {
            opacity: 1;
            transform: translateX(130%) translateY(35%) rotate(45deg) scale(1);
        }
    }

    @keyframes set-shaddow {
        to {
            opacity: 1;
        }
    }

    @keyframes set-overflow {
        to {
            overflow: hidden;
        }
    }
</style>
