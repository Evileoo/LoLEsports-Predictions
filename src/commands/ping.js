import { SlashCommandBuilder } from 'discord.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with pong !")
    , async execute(interaction){
        interaction.reply({
            content: `Pong!`,
            ephemeral: true,
        });
    }
}