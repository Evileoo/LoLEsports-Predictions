import { REST, Routes } from 'discord.js';
import fs from 'fs';

refresh();

async function refresh(){
    const commands = [];
    const commandFiles = fs.readdirSync(`./src/commands`).filter(file => file.endsWith(`.js`));

    for(const file of commandFiles){
        const command = await import(`./commands/${file}`);
        commands.push(command.command.data.toJSON());
    }

    const rest = new REST({ version: '10' }).setToken(process.env.BETATOKEN);
    
    try{
        console.log(`Refreshing ${commands.length} applications (/) commands.`);

        const data = await rest.put(
            Routes.applicationCommands(process.env.BETAAPPID),
            { body: commands }
        );

        console.log(`Successfully loaded ${data.length} applications (/) commands.`);
    } catch(err){
        console.error(err);
    }
    
}