import {  } from 'discord.js';
import { bot } from '../connections/fandom.js';
//import cron from 'node-cron';

// Executed when bot is ready
export const autocomplete = {
    async execute(interaction){

        // Get the content of input field
        const input = "%" + interaction.options._hoistedOptions[0].value + "%";

        // Get the leagues
        const leagues = await (await bot).query({
            action: `cargoquery`,
            tables: `Leagues=l`,
            fields: `l.League, l.League_Short=Short`,
            where : `l.League LIKE '${input}' OR l.League_Short LIKE '${input}'`,
            order_by: `l.League_Short`,
            limit: 25
        });

        // Display the leagues
        await interaction.respond(leagues.cargoquery.map(choice => ({ name: `[${choice.title.Short}] ${choice.title.League}`, value: choice.title.Short })));

    }
}