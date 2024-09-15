import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder } from 'discord.js';
import { db } from '../connections/database.js';
import { request } from './fandomRequest.js'
import { matchCanvas } from './matchCanvas.js';
import schedule from 'node-schedule';

export const routine = {
    // Start a predictions routine
    async start(client, guildId, channelId){

        let fandom = [{
            Team1: ``,
            Team2: ``,
            t1Short: ``,
            t2Short: ``,
            t1Image: ``,
            t2Image: ``,
            datetime: ``,
            BestOf: ``,
            MatchId: ``,
            LeagueShort: ``,
            League: ``
        }];

        // Create the job instance
        //schedule.scheduleJob(guildId + channelId, '0 0 0-23 * * *', async function(){
            
            // Keep the last request results
            const lastRequest = fandom;

            // Get upcoming matches
            fandom = request.getResult().result;

            if(request.getResult().success && lastRequest != fandom){

                // Initialize data object
                const data = [];

                // Get routines
                const routines = await db.query(`SELECT * from routine WHERE routine_guild_id = '${guildId}' AND routine_channel_id = '${channelId}'`);

                const routineIds = routines.map(row => row.routine_id).join(', ');

                // Get predictions before and after delete
                const predictionsBD = await db.query(`SELECT * from pending_prediction WHERE routine_id IN (${routineIds})`);

                await db.query(`DELETE FROM pending_prediction WHERE limit_datetime < NOW() AND routine_id IN (${routineIds})`);

                const predictionsAD = await db.query(`SELECT * from pending_prediction WHERE routine_id IN (${routineIds})`);

                // Get date
                const now = new Date();
                const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCMilliseconds());

                for(let routine of routines) {
                    // Get routine matches and sort them into old and new matches
                    const matches = request.getResult().result.filter(m => m.LeagueShort == routine.league);
                    const newMatches = matches.filter(m => !predictionsAD.some(p => p.match_id == m.MatchId));
                    const oldMatches = predictionsBD.filter(p => !matches.some(m => m.MatchId == p.match_id));

                    // Get how many hours before 1st match starts
                    let hourDiff;
                    if(matches.length > 0) {
                        const firstMatchTime = new Date(matches[0].datetime);
                        hourDiff = (firstMatchTime - utcNow) / (1000 * 60 * 60);
                    }

                    // Get the index of guild and channel in data
                    let index = data.findIndex(d => d.guildId == routine.routine_guild_id && d.channelId == routine.routine_channel_id);

                    if(hourDiff < 18) {

                        // Update the data object
                        if(index == -1) {
                            const object = {
                                guildId: routine.routine_guild_id,
                                channelId: routine.routine_channel_id,
                                type: `update`,
                                leagues: []
                            }

                            data.push(object);

                            index = data.length - 1;
                        } else {
                            data[index].type = `update`;
                        }

                        const leagueData = {
                            name: routine.league,
                            matches: []
                        }

                        data[index].leagues.push(leagueData);

                        const leagueIndex = data[index].leagues.length - 1;

                        for(let match of matches) {
                            const matchData = {
                                team1: {
                                    name: match.Team1,
                                    short: match.t1Short,
                                    image: match.t1Image
                                },
                                team2: {
                                    name: match.Team2,
                                    short: match.t2Short,
                                    image: match.t2Image
                                },
                                datetime: match.datetime,
                                bestOf: match.BestOf,
                                matchId: match.MatchId
                            }

                            data[index].leagues[leagueIndex].matches.push(matchData);

                            // Update database if the match isn't in
                            if(newMatches.filter(m => m.MatchId == match.MatchId).length > 0) {
                                await db.query(`INSERT INTO pending_prediction (routine_id, limit_datetime, match_id) VALUES (${routine.routine_id}, '${matches[0].datetime}', '${match.MatchId}')`);
                            }
                        }
                    } else if(oldMatches.length > 0 && index == -1) {
                        const object = {
                            guildId: routine.routine_guild_id,
                            channelId: routine.routine_channel_id,
                            type: `clear`,
                            leagues: []
                        };
                        data.push(object);
                    }
                }
                

                for(let routine of data) {
                    // Get guild and channel
                    const guild = await client.guilds.fetch(routine.guildId);
                    const channel = await guild.channels.cache.get(routine.channelId);

                    // Delete all messages in the channel
                    let fetched;
                    do {
                        fetched = await channel.messages.fetch({ limit: 100 });
                        await channel.bulkDelete(fetched, true).catch(() => null);
                    } while(fetched.size > 0);

                    // Get all leagues of the routine
                    const leagues = await db.query(`SELECT league FROM routine WHERE routine_guild_id = ${guildId} AND routine_channel_id = ${channelId}`);

                    // Rebuild and send the first message
                    const trackedLeaguesEmbed = new EmbedBuilder()
                    .setTitle(`Tracked LoL Esports leagues`)
                    .setDescription(leagues.map(l => l.league).join(`, `))
                    .setTimestamp();

                    await channel.send({
                        embeds: [trackedLeaguesEmbed]
                    });

                    for(let league of routine.leagues) {

                        // Get the full league data
                        const leagueName = request.getResult().result.find(m => m.LeagueShort == league.name);

                        // Send the league message and pin it
                        const leagueMessage = await channel.send({
                            content: `# [${leagueName.LeagueShort}] ${leagueName.League}`
                        });

                        await leagueMessage.pin();

                        const pinMessage = await channel.messages.fetch({ limit: 1 });

                        await channel.bulkDelete(pinMessage, true).catch(() => null);

                        for(let match of league.matches) {

                            // Generate the match canvas
                            const canvas = await matchCanvas.generate(match.team1.name, match.team1.image, match.team2.name, match.team2.image);

                            // Build the attachment
                            const image = new AttachmentBuilder(await canvas.encode('png'), { name: 'image.png' });

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

                                // Send message
                                channel.send({
                                    files: [image],
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

                                // Send message
                                channel.send({
                                    files: [image],
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

                                // Send message
                                channel.send({
                                    files: [image],
                                    components: [bo5t1row, bo5t2row]
                                });
                            }
                        }
                    }
                }
            }
        //});
    },
    // Delete a predictions routine
    async delete(guildId, channelId){
        schedule.cancelJob(guildId + channelId);
    }
};