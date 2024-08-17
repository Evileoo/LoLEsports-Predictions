import { Events } from 'discord.js';
import { bot } from '../connections/fandom.js';
import { db } from '../connections/database.js';
//import cron from 'node-cron';

// Executed when bot is ready
export const event = {
    name: Events.ClientReady,
    once: true,
    async execute(client){
        // Bot is ready message
        console.log(`Ready! Logged in as ${client.user.tag}`);

        // Testing database connection
        try{
            const checkConnection = await db.query(`SELECT 1 FROM DUAL`);
            
            if(checkConnection.length > 0){
                console.log(`Database Connected`);
            }
        } catch(error){
            console.error(`Couldn't connected to database`);
            console.error(error);
        }

        //cron.schedule('0 0 0-23 * * *', async function(){
        //    
        //});

        const matches = await (await bot).request({
            action: `cargoquery`,
            tables: `MatchSchedule=m, Teams=t1, Teams=t2, Tournaments=t`,
            fields: `m.Team1, m.Team2, t1.Short=t1Short, t2.Short=t2Short, m.DateTime_UTC=datetime, m.BestOf, m.Team1Score, m.Team2Score, m.MatchId, t.Name, t.League, t.Split, t.Year`,
            join_on: `m.Team1=t1.Name, m.Team2=t2.Name, t.OverviewPage=m.OverviewPage`,
            where: `DATEDIFF(m.DateTime_UTC, NOW()) >= -1 AND DATEDIFF(m.DateTime_UTC, NOW()) < 2`,
            order_by: `m.DateTime_UTC`,
            limit: 200
        });

        console.log("Hourly data fetch setup");
    }
}