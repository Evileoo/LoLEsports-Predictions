import { Events } from 'discord.js';

// Executed when bot is ready
export const event = {
    name: Events.ClientReady,
    once: true,
    execute(client){
        console.log(`Ready! Logged in as ${client.user.tag}`);
    }
}