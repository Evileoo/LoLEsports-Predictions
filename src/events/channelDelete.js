import { Events } from 'discord.js';
import { db } from '../connections/database.js';
//import cron from 'node-cron';

// Executed when bot is ready
export const event = {
    name: Events.ChannelDelete,
    async execute(channel){
        // Delete all routine data
        const sql = `DELETE FROM routine WHERE routine_channel_id = ${channel.id} AND routine_guild_id = ${channel.guild.id}`;
        await db.query(sql);
    }
}