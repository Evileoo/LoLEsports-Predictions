import { SlashCommandBuilder } from 'discord.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("rankings")
    .setDescription("Get rankings")
    .addStringOption(option =>
        option
        .setName("league")
        .setDescription("rankings on a league")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
        option
        .setName("split")
        .setDescription("rankings on a split")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
        option
        .setName("year")
        .setDescription("rankings on a year")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addIntegerOption(option =>
        option
        .setName("bestof")
        .setDescription("type of best of")
        .setRequired(false)
        .addChoices(
            { name: `BO1`, value: 1 },
            { name: `BO3`, value: 3 },
            { name: `BO5`, value: 5 },
        )
    )
    , async execute(interaction){
        console.log(interaction);
    }
}