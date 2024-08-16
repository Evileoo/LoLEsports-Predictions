import { Mwn } from 'mwn';

const bot = Mwn.init({
    apiUrl: process.env.FANDOMAPI,
    username: process.env.FANDOMUSERNAME,
    password: process.env.FANDOMPASSWORD,
    defaultParams: {
        assert: 'user'
    }
});

export { bot };