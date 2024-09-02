import {  } from 'discord.js';
import { bot } from '../connections/fandom.js';
//import cron from 'node-cron';

// Executed when bot is ready
export const autocomplete = {
    async execute(interaction){

        // Get the content of input field
        const input = "%" + interaction.options._hoistedOptions[0].value + "%";

        let result;

        if(interaction.options._subcommand == 'create' || interaction.options._subcommand == 'add') {
            result = await (await bot).query({
                action: `cargoquery`,
                tables: `Leagues=l`,
                fields: `l.League, l.League_Short=Short`,
                where : `(l.League LIKE '${input}' OR l.League_Short LIKE '${input}')`,
                order_by: `l.League_Short`,
                limit: 25
            });

            await interaction.respond(result.cargoquery.map(choice => ({ name: `[${choice.title.Short}] ${choice.title.League}`, value: choice.title.Short })));
        } else if(interaction.commandName == 'stats' || interaction.commandName == 'rankings') {
            switch(interaction.options._hoistedOptions[0].name){
                case "league":
                    result = await (await bot).query({
                        action: `cargoquery`,
                        tables: `Leagues=l`,
                        fields: `l.League, l.League_Short=Short`,
                        where : `(l.League LIKE '${input}' OR l.League_Short LIKE '${input}')`,
                        order_by: `l.League_Short`,
                        limit: 25
                    });

                    await interaction.respond(result.cargoquery.map(choice => ({ name: `[${choice.title.Short}] ${choice.title.League}`, value: choice.title.Short })));
                    break;
                case "split":
                    result = await (await bot).query({
                        action: `cargoquery`,
                        tables: `Leagues=l, Tournaments=t`,
                        fields: `l.League, l.League_Short=Short, t.OverviewPage`,
                        join_on: `t.League=l.League`,
                        where : `(l.League LIKE '${input}' OR l.League_Short LIKE '${input}' OR t.OverviewPage LIKE '${input}')`,
                        order_by: `l.League_Short, t.Year DESC`,
                        limit: 25
                    });

                    await interaction.respond(result.cargoquery.map(choice => ({ name: `[${choice.title.Short}] ${choice.title.OverviewPage}`, value: choice.title.OverviewPage })));
                    break;
                case "team":
                    result = await (await bot).query({
                        action: `cargoquery`,
                        tables: `Teams=t`,
                        fields: `t.Short, t.Name`,
                        where : `(t.Short LIKE '${input}' OR t.Name LIKE '${input}')`,
                        order_by: `t.Short`,
                        limit: 25
                    });

                    await interaction.respond(result.cargoquery.map(choice => ({ name: `[${choice.title.Short}] ${choice.title.Name}`, value: choice.title.Name })));
                    break;
            }
        }
    }
}