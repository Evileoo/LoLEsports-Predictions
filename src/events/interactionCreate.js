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
			
			let autocomplete;
			if(interaction.options._subcommand == 'remove'){
				autocomplete = interaction.client.autocomplete.get(`dbLeagueSearch`);
			} else if(interaction.options._subcommand == 'create' || interaction.options._subcommand == 'add'){
				autocomplete = interaction.client.autocomplete.get(`apiLeagueSearch`);
			} else {
				console.error(`No autocomplete matching ${interaction.commandName} / ${interaction.options._subcommand} was found.`);
				return;
			}

			

			try {
				await autocomplete.execute(interaction);
			} catch(error) {
				console.error(`Error executing ${interaction.options._subcommand}`);
				console.error(error);
			}

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