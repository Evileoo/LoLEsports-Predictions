import { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { bot } from '../connections/fandom.js';
import { db } from '../connections/database.js';
import cron from 'node-cron';
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

        cron.schedule('0 0 0-23 * * *', async function(){
            // Get upcoming fandom matches
            const fandomMatches = await (await bot).request({
                action: `cargoquery`,
                tables: `MatchSchedule=m, Teams=t1, Teams=t2, Tournaments=t, Leagues=l`,
                fields: `m.Team1, m.Team2, t1.Short=t1Short, t2.Short=t2Short, m.DateTime_UTC=datetime, m.BestOf, m.MatchId, l.League_Short=LeagueShort, l.League`,
                join_on: `m.Team1=t1.Name, m.Team2=t2.Name, t.OverviewPage=m.OverviewPage, t.League=l.League`,
                where: `m.DateTime_UTC > NOW() AND m.DateTime_UTC < DATE_ADD(NOW(), INTERVAL 24 HOUR) AND (m.Team1 <> 'TBD' OR m.Team2 <> 'TBD')`,
                order_by: `m.DateTime_UTC`,
                limit: 200
            });

            // Get routines and pending predictions
            const predictions = await db.query(`SELECT * from pending_prediction`);
            const routines = await db.query(`SELECT * from routine`);

            // Delete outdated predictions
            await db.query(`DELETE FROM pending_prediction WHERE limit_datetime < NOW()`);

            // Register data to send messages
            // Data structure : [{guildId, channelId, type, leagues:[{name, matches[{team1{name, short}, team2{name, short}, datetime, bestOf, matchId}]}]}]
            const data = [];

            for(let routine of routines) {
                // Get all matches of the routine league
                const routineMatches = fandomMatches.cargoquery.filter(match => match.title.LeagueShort == routine.league);

                // Check if the 1st match of the league is in less than 18 hours
                let hourDiff;
                if(routineMatches.length > 0){
                    const now = new Date();
                    const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCMilliseconds());
                    const firstMatchTime = new Date(routineMatches[0].title.datetime);
                    hourDiff = (firstMatchTime - utcNow) / (1000 * 60 * 60);
                }

                // Get IDs of matches in routine and matches in predictions
                const routineMatchIds = routineMatches.map(match => match.title.MatchId);
                const predictionMatchdIds = predictions.filter(pred => pred.routine_id === routine.routine_id).map(pred => pred.match_id);

                // Matches in predictions but not in fandomMatches
                const missingInFandom = predictionMatchdIds.filter(matchId => !routineMatchIds.includes(matchId));

                // Matches in fandomMatches but not in predictions
                const missingInPredictions = routineMatchIds.filter(matchId => !predictionMatchdIds.includes(matchId));

                // Get the index of guild and channel in data
                let index = data.findIndex(item => item.guildId == routine.routine_guild_id && item.channelId == routine.routine_channel_id);

                if(missingInFandom.length > 0 && index == -1) {
                    const object = {
                        guildId: routine.routine_guild_id,
                        channelId: routine.routine_channel_id,
                        type: `clear`,
                        league: []
                    };

                    data.push(object);
                } else if(hourDiff < 18) {
                    // Update the data object
                    if(index == -1) {
                        const object = {
                            guildId: routine.routine_guild_id,
                            channelId: routine.routine_channel_id,
                            type: `send`,
                            leagues: []
                        }

                        data.push(object);

                        index = data.length - 1;
                    } else if(data[index].type != `send`) {
                        data[index].type = `send`
                    }

                    const leagueData = {
                        name: routine.league,
                        matches: []
                    }

                    data[index].leagues.push(leagueData);

                    const leagueIndex = data[index].leagues.length - 1;

                    for(let match of routineMatches) {

                        const matchData = {
                            team1: {
                                name: match.title.Team1,
                                short: match.title.t1Short
                            },
                            team2: {
                                name: match.title.Team2,
                                short: match.title.t2Short
                            },
                            datetime: routineMatches[0].title.datetime,
                            bestOf: match.title.BestOf,
                            matchId: match.title.MatchId
                        }

                        data[index].leagues[leagueIndex].matches.push(matchData);

                        if(missingInPredictions.filter(m => m == match.title.MatchId).length > 0){
                            await db.query(`INSERT INTO pending_prediction (routine_id, limit_datetime, match_id) VALUES (${routine.routine_id}, '${routineMatches[0].title.datetime}', '${match}')`);
                        }

                    }

                }

            }

            for(let routine of data){

                // Get guild and channel
                const guild = await client.guilds.fetch(routine.guildId);
                const channel = await guild.channels.cache.get(routine.channelId);

                // Get all messages of the channel
                const fetchedMessages = await channel.messages.fetch({ limit: 100 });
                
                // Find the first one
                const firstMessage = fetchedMessages.reduce((oldest, current) => {
                    return current.createdTimestamp < oldest.createdTimestamp ? current : oldest;
                });
            
                // Filter messages to remove everything except the first one
                const messagesToDelete = fetchedMessages.filter(m => m.id != firstMessage.id);
            
                if(messagesToDelete.size > 0){
                    await channel.bulkDelete(messagesToDelete, true);
                }

                for(let league of routine.leagues){

                    const leagueName = fandomMatches.cargoquery.find(match => match.title.LeagueShort == league.name);

                    const leagueMessage = await channel.send({
                        content: `# [${leagueName.title.LeagueShort}] ${leagueName.title.League}`
                    });
                
                    await leagueMessage.pin();
                
                    const pinMessage = await channel.messages.fetch({ limit: 1 });
                
                    await channel.bulkDelete(pinMessage, true);


                    for(let match of league.matches){

                        const buttonFileName = `routine`;

                        if(match.bestOf == 1){
                            // Build buttons
                            const bo1t1 = new ButtonBuilder()
                            .setCustomId(`${buttonFileName}|||10|||${match.matchId}`)
                            .setLabel(`${match.team1.name}`)
                            .setStyle(ButtonStyle.Primary);
                            const bo1t2 = new ButtonBuilder()
                            .setCustomId(`${buttonFileName}|||01|||${match.matchId}`)
                            .setLabel(`${match.team2.name}`)
                            .setStyle(ButtonStyle.Danger);
                        
                            // Build row
                            const bo1row = new ActionRowBuilder()
                            .addComponents(bo1t1, bo1t2);
                        
                            // Build Embed
                            const bo1embed = new EmbedBuilder()
                            .setTitle(`[${match.team1.short}] ${match.team1.name} VS [${match.team2.short}] ${match.team2.name}`);

                            // Send message
                            channel.send({
                                embeds: [bo1embed],
                                components: [bo1row]
                            });
                        
                        } else if(match.bestOf == 3){
                            // Build buttons
                            const bo3t1s20 = new ButtonBuilder()
                            .setCustomId(`${buttonFileName}|||20|||${match.matchId}`)
                            .setLabel(`${match.team1.short} 2 - 0`)
                            .setStyle(ButtonStyle.Primary);
                            const bo3t1s21 = new ButtonBuilder()
                            .setCustomId(`${buttonFileName}|||21|||${match.matchId}`)
                            .setLabel(`${match.team1.short} 2 - 1`)
                            .setStyle(ButtonStyle.Primary);
                            const bo3t2s20 = new ButtonBuilder()
                            .setCustomId(`${buttonFileName}|||02|||${match.matchId}`)
                            .setLabel(`${match.team2.short} 2 - 0`)
                            .setStyle(ButtonStyle.Danger);
                            const bo3t2s21 = new ButtonBuilder()
                            .setCustomId(`${buttonFileName}|||12|||${match.matchId}`)
                            .setLabel(`${match.team2.short} 2 - 1`)
                            .setStyle(ButtonStyle.Danger);
                        
                            // Build row
                            const bo3t1row = new ActionRowBuilder()
                            .addComponents(bo3t1s20, bo3t1s21);
                            const bo3t2row = new ActionRowBuilder()
                            .addComponents(bo3t2s20, bo3t2s21);
                        
                            // Build Embed
                            const bo3embed = new EmbedBuilder()
                            .setTitle(`[${match.team1.short}] ${match.team1.name} VS [${match.team2.short}] ${match.team2.name}`);

                            // Send message
                            channel.send({
                                embeds: [bo3embed],
                                components: [bo3t1row, bo3t2row]
                            });
                        
                        } else if(match.bestOf == 5){
                            // Build buttons
                            const bo5t1s30 = new ButtonBuilder()
                            .setCustomId(`${buttonFileName}|||30|||${match.matchId}`)
                            .setLabel(`${match.team1.short} 3 - 0`)
                            .setStyle(ButtonStyle.Primary);
                            const bo5t1s31 = new ButtonBuilder()
                            .setCustomId(`${buttonFileName}|||31|||${match.matchId}`)
                            .setLabel(`${match.team1.short} 3 - 1`)
                            .setStyle(ButtonStyle.Primary);
                            const bo5t1s32 = new ButtonBuilder()
                            .setCustomId(`${buttonFileName}|||32|||${match.matchId}`)
                            .setLabel(`${match.team1.short} 3 - 2`)
                            .setStyle(ButtonStyle.Primary);
                            const bo5t2s30 = new ButtonBuilder()
                            .setCustomId(`${buttonFileName}|||03|||${match.matchId}`)
                            .setLabel(`${match.team2.short} 3 - 0`)
                            .setStyle(ButtonStyle.Danger);
                            const bo5t2s31 = new ButtonBuilder()
                            .setCustomId(`${buttonFileName}|||13|||${match.matchId}`)
                            .setLabel(`${match.team2.short} 3 - 1`)
                            .setStyle(ButtonStyle.Danger);
                            const bo5t2s32 = new ButtonBuilder()
                            .setCustomId(`${buttonFileName}|||23|||${match.matchId}`)
                            .setLabel(`${match.team2.short} 3 - 2`)
                            .setStyle(ButtonStyle.Danger);
                        
                            // Build row
                            const bo5t1row = new ActionRowBuilder()
                            .addComponents(bo5t1s30, bo5t1s31, bo5t1s32);
                            const bo5t2row = new ActionRowBuilder()
                            .addComponents(bo5t2s30, bo5t2s31, bo5t2s32);
                        
                            // Build Embed
                            const bo3embed = new EmbedBuilder()
                            .setTitle(`[${match.team1.short}] ${match.team1.name} VS [${match.team2.short}] ${match.team2.name}`);

                            // Send message
                            channel.send({
                                embeds: [bo3embed],
                                components: [bo5t1row, bo5t2row]
                            });
                        }
                    }
                }
            }
        });

        console.log(`hourly data fetch setup`);

    }
}