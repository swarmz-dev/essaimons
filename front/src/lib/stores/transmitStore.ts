import { type Writable, writable } from 'svelte/store';
import { Transmit } from '@adonisjs/transmit-client';

export const transmit: Writable<Transmit | null> = writable(null);

export const waitForTransmit = async (): Promise<Transmit> => {
    return new Promise((resolve): void => {
        function handleValue(value: Transmit | null): void {
            if (value) {
                resolve(value);
            }
        }

        transmit.subscribe(handleValue);
    });
};
