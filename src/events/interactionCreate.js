import { Events } from 'discord.js';

export const event = {
    name: Events.InteractionCreate,
    async execute(interaction){
		// Check interaction type
        if (interaction.isChatInputCommand()){
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(`Error executing ${interaction.commandName}`);
				console.error(error);
			}
		} else if (interaction.isButton()) {
			// respond to the button
			console.log(`Button clicked`);
		} else if (interaction.isStringSelectMenu()) {
			// respond to the select menu
			console.log(`Choice selected in string select menu`);
		} else if (interaction.isContextMenuCommand()) {
			// Respond to the context menu
			console.log(`Context menu command selected`);
		} else if (interaction.isModalSubmit()) {
			// Respond to the modal
			console.log(`Modal submitted`);
		} else {
			interaction.reply({
				content: `I don't know what you did, but this message isn't supposed to be shown`,
				ephemeral: true
			});

			console.error(interaction);

			return;
		}
    }
}