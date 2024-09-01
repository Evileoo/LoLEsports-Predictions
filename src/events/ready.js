import { Events } from 'discord.js';
import { db } from '../connections/database.js';
import { routine } from '../functions/routineFunction.js';
import { request } from '../functions/fandomRequest.js';

// Executed when bot is ready
export const event = {
    name: Events.ClientReady,
    once: true,
    async execute(client){
        // Bot is ready message
        console.log(`Ready! Logged in as ${client.user.tag}`);

        // Testing database connection
        try{
            const checkConnection = await db.query(`SELECT 1 FROM DUAL`);
            
            if(checkConnection.length > 0){
                console.log(`Database Connected`);
            }
        } catch(error){
            console.error(`Couldn't connected to database`);
            console.error(error);
        }

        const routines = await db.query(`SELECT routine_guild_id, routine_channel_id from routine GROUP BY 1, 2`);

        await request.createJob();

        for(let r of routines){
            const guild = await client.guilds.fetch(r.routine_guild_id);
            const channel = await guild.channels.cache.get(r.routine_channel_id);

            // Check if the channel didn't get deleted while the bot was offline
            if(channel) {
                // recreate routine
                await routine.start(client, r.routine_guild_id, r.routine_channel_id);
            } else {
                // delete the associated routine from database
                await db.query(`DELETE FROM routine WHERE routine_guild_id = '${r.routine_guild_id}' AND routine_channel_id = '${r.routine_channel_id}'`);
            }
        }

        console.log(`hourly data fetch setup`);

    }
}