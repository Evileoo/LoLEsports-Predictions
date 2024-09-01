import { SlashCommandBuilder } from 'discord.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Get statistics for a member")
    .addUserOption(option =>
        option
        .setName("user")
        .setDescription("User you want to get the statistics")
        .setRequired(false)
    )
    .addUserOption(option =>
        option
        .setName("compareto")
        .setDescription("User you want to compare to")
        .setRequired(false)
    )
    .addStringOption(option =>
        option
        .setName("league")
        .setDescription("league the user bet on")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
        option
        .setName("split")
        .setDescription("split of a league the user bet on")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
        option
        .setName("year")
        .setDescription("year of matches the user bet on")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
        option
        .setName("team")
        .setDescription("team the user bet on")
        .setRequired(false)
        .setAutocomplete(true)
    )
    , async execute(interaction){
        console.log(interaction);
    }
}