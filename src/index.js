import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs';


const client = new Client({
    intents: GatewayIntentBits.Guilds
});

client.commands = new Collection();
const commands = fs.readdirSync("./src/commands").filter(file => file.endsWith(".js"));
for(let command of commands){
    const commandfile = await import(`./commands/${command}`);
    //console.log(commandfile.command);
    client.commands.set(commandfile.command.data.name, commandfile.command);
}

const events = fs.readdirSync("./src/events").filter(file => file.endsWith(".js"));
for(let event of events){
    const eventfile = await import(`./events/${event}`);
    if(eventfile.event.once){
        client.once(eventfile.event.name, (...args) => {
            eventfile.event.execute(...args);
        });
    } else {
        client.on(eventfile.event.name, (...args) => {
            eventfile.event.execute(...args);
        });
    }
}

await client.login(process.env.BETATOKEN);