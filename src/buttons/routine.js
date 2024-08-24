import {  } from 'discord.js';
import { db } from '../connections/database.js';
//import cron from 'node-cron';

// Executed when bot is ready
export const button = {
    async execute(interaction, buttonData){

        // Check if the user already predicted the match
        const alreadyPredicted = await db.query(`SELECT match_id FROM user_prediction WHERE match_id = '${buttonData[2]}' AND discord_user_id = '${interaction.user.id}'`);

        // Update / Insert
        let message;
        if(alreadyPredicted.length > 0) {
            await db.query(`UPDATE user_prediction SET team1score = ${buttonData[1].substring(0,1)}, team2score = ${buttonData[1].substring(1,2)} WHERE match_id = '${buttonData[2]}' AND discord_user_id = '${interaction.user.id}'`);

            message = `Prediction edited`;
        } else {
            await db.query(`INSERT INTO user_prediction (match_id, discord_user_id, team1score, team2score) VALUES ('${buttonData[2]}', '${interaction.user.id}', ${buttonData[1].substring(0,1)}, ${buttonData[1].substring(1,2)})`);

            message = `Match predicted`;
        }

        // Confirm
        interaction.reply({
            content: message,
            ephemeral: true
        });

    }
}