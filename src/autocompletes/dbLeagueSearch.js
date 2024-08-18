import {  } from 'discord.js';
import { db } from '../connections/database.js';
//import cron from 'node-cron';

// Executed when bot is ready
export const autocomplete = {
    async execute(interaction){
        
        // Get the content of input field
        const input = "%" + interaction.options._hoistedOptions[0].value + "%";

        // Get the leagues
        const query = `SELECT league from routine WHERE routine_guild_id = '${interaction.guild.id}' AND routine_channel_id = '${interaction.channel.id}' AND league LIKE '${input}' LIMIT 25`;
        const result = await db.query(query);

        // Display the leagues
        await interaction.respond(result.map(choice => ({ name: `${choice.league}`, value: choice.league })));
    }
}