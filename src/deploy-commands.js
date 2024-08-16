import { REST, Routes } from 'discord.js';
import fs from 'fs';

refresh();

// Deploy commands
async function refresh(){
    const commands = [];
    const commandFiles = fs.readdirSync(`./src/commands`).filter(file => file.endsWith(`.js`));

    for(const file of commandFiles){
        const command = await import(`./commands/${file}`);
        commands.push(command.command.data.toJSON());
    }

    const rest = new REST({ version: '10' }).setToken(process.env.STABLETOKEN);
    
    try{
        console.log(`Refreshing ${commands.length} applications (/) commands.`);

        const data = await rest.put(
            Routes.applicationCommands(process.env.STABLEAPPID),
            { body: commands }
        );

        console.log(`Successfully loaded ${data.length} applications (/) commands.`);
    } catch(err){
        console.error(err);
    }
}