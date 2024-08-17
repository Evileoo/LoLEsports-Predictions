import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs';

// Create client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// Create commands collection
client.commands = new Collection();
const commands = fs.readdirSync("./src/commands").filter(file => file.endsWith(".js"));
for(let command of commands){
    const commandFile = await import(`./commands/${command}`);
    client.commands.set(commandFile.command.data.name, commandFile.command);
}

// Create buttons collection
client.buttons = new Collection();
const buttons = fs.readdirSync("./src/buttons").filter(file => file.endsWith(".js"));
for(let button of buttons){
    const buttonFile = await import(`./buttons/${button}`);
    client.buttons.set(button.split(".")[0], buttonFile.button);
}

// Create user context menus collection
client.userContextMenu = new Collection();
const userContextMenus = fs.readdirSync("./src/userContextMenus").filter(file => file.endsWith(".js"));
for(let userContextMenu of userContextMenus){
    const userContextMenuFile = await import(`./userContextMenus/${userContextMenu}`);
    client.userContextMenu.set(userContextMenuFile.menu.data.name, userContextMenuFile.menu);
}

// Create modal collection
client.modal = new Collection();
const modals = fs.readdirSync("./src/modals").filter(file => file.endsWith(".js"));
for(let modal of modals){
    const modalFile = await import(`./modals/${modal}`);
    client.modal.set(modal.split(".")[0], modalFile.modal);
}

// Create autocomplete collection
client.autocomplete = new Collection();
const autocompletes = fs.readdirSync("./src/autocompletes").filter(file => file.endsWith(".js"));
for(let autocomplete of autocompletes){
    const autocompleteFile = await import(`./autocompletes/${autocomplete}`);
    client.autocomplete.set(autocomplete.split(".")[0], autocompleteFile.autocomplete);
}

// Read events
const events = fs.readdirSync("./src/events").filter(file => file.endsWith(".js"));
for(let event of events){
    const eventFile = await import(`./events/${event}`);
    if(eventFile.event.once){
        client.once(eventFile.event.name, (...args) => {
            eventFile.event.execute(...args);
        });
    } else {
        client.on(eventFile.event.name, (...args) => {
            eventFile.event.execute(...args);
        });
    }
}

// Login
await client.login(process.env.STABLETOKEN);