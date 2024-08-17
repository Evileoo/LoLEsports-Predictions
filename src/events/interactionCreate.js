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
			console.log(interaction);
		} else if (interaction.isUserContextMenuCommand()) {
			// Respond to the context menu (user)
			console.log(`User context menu command selected`);
			console.log(interaction);
		} else if (interaction.isModalSubmit()) {
			// Respond to the modal
			console.log(`Modal submitted`);
			console.log(interaction);
		} else if (interaction.isAutocomplete()) {
			// Respond to the modal
			console.log(`Autocomplete`);
			console.log(interaction);
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