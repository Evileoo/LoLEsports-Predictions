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
    , async execute(interaction){
        console.log(interaction);
    }
}