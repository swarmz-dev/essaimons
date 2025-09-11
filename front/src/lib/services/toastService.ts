import 'toastify-js/src/toastify.css';
import Toastify from 'toastify-js';
import { navigate } from '#lib/stores/locationStore';

interface ToastStyle {
    [key: string]: string;
}

interface ShowToast {
    (text: string, status?: 'success' | 'error' | 'warning', redirect?: null | string | (() => void)): void;
}

const successToastStyle: ToastStyle = {
    background: 'linear-gradient(to right, #00b09b, #96c93d)',
    borderRadius: '10px',
};

const errorToastStyle: ToastStyle = {
    background: 'linear-gradient(to right, #ff5f6d, #ffc371)',
    borderRadius: '10px',
};

const warningToastStyle: ToastStyle = {
    background: 'linear-gradient(to right, #a66300, #a2951a)',
    borderRadius: '10px',
};

const showToast: ShowToast = (text: string, status: 'success' | 'error' | 'warning' = 'success', redirect: null | string | (() => void) = null): void => {
    let style: ToastStyle = successToastStyle;
    if (status === 'error') {
        style = errorToastStyle;
    } else if (status === 'warning') {
        style = warningToastStyle;
    }

    Toastify({
        text,
        duration: 5000,
        style,
        onClick: async (): Promise<void> => {
            if (typeof redirect === 'string') {
                await navigate(redirect);
            } else if (redirect) {
                redirect();
            }
        },
    }).showToast();
};

export { showToast };
