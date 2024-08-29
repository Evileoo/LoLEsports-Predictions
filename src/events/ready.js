import { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { bot } from '../connections/fandom.js';
import { db } from '../connections/database.js';
import cron from 'node-cron';

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

        let request = [{
            Team1: ``,
            Team2: ``,
            t1Short: ``,
            t2Short: ``,
            datetime: ``,
            BestOf: ``,
            MatchId: ``,
            LeagueShort: ``,
            League: ``
        }];

        cron.schedule('0 0 0-23 * * *', async function(){

            // Stockage de la dernière requête
            const lastRequest = request;

            // Get upcoming fandom matches
            let attempts = 0, maxAttempts = 3, success = false;
            while(!success && attempts < maxAttempts){

                // Wait 0/10/100 sec
                await new Promise(r => setTimeout(r, 1000 * Math.pow(10, attempts)));

                try {
                    request = (await (await bot).request({
                        action: `cargoquery`,
                        tables: `MatchSchedule=m, Teams=t1, Teams=t2, Tournaments=t, Leagues=l`,
                        fields: `m.Team1, m.Team2, t1.Short=t1Short, t2.Short=t2Short, m.DateTime_UTC=datetime, m.BestOf, m.MatchId, l.League_Short=LeagueShort, l.League`,
                        join_on: `m.Team1=t1.Name, m.Team2=t2.Name, t.OverviewPage=m.OverviewPage, t.League=l.League`,
                        where: `m.DateTime_UTC > NOW() AND m.DateTime_UTC < DATE_ADD(NOW(), INTERVAL 24 HOUR) AND (m.Team1 <> 'TBD' OR m.Team2 <> 'TBD')`,
                        order_by: `m.DateTime_UTC`,
                        limit: 200
                    })).cargoquery.map(m => m.title);
    
                    success = true;
                } catch(e) {
                    attempts++;

                    console.error(`Attempt ${attempts} failed`);
                    console.error(e.message);

                    if(attempts >= maxAttempts) console.error(`max attempts reached. Retrying in 1 hour`);
                }
            }

            /** 
            *@DataStructure
            *   [{
            *       guildId
            *       channelId
            *       leagues: [{
            *           name
            *           short
            *           matches: [{
            *               matchId
            *               team1: { name, short }
            *               team2: { name, short }
            *               datetime
            *               bestof
            *           },]
            *       },]
            *   },]
            */
            const data = [];

            if(success && lastRequest != request){
                // Get routines
                const routines = await db.query(`SELECT * from routine`);

                // Get predictions before and after delete
                const predictionsBD = await db.query(`SELECT * from pending_prediction`);

                await db.query(`DELETE FROM pending_prediction WHERE limit_datetime < NOW()`);

                const predictionsAD = await db.query(`SELECT * from pending_prediction`);

                // Get date
                const now = new Date();
                const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCMilliseconds());


                for(let routine of routines) {
                    // Get routine matches and sort them into old and new matches
                    const matches = request.filter(m => m.LeagueShort == routine.league);
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

                    if(newMatches.length > 0 && hourDiff < 18) {

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
                                    short: match.t1Short
                                },
                                team2: {
                                    name: match.Team2,
                                    short: match.t2Short
                                },
                                datetime: match.datetime,
                                bestOf: match.BestOf,
                                matchId: match.MatchId
                            }

                            data[index].leagues[leagueIndex].matches.push(matchData);

                            // Update database if the match isn't in
                            if(newMatches.filter(m => m.MatchId == match.MatchId).length > 0) {
                                await db.query(`INSERT INTO pending_prediction (routine_id, limit_datetime, match_id) VALUES (${routine.routine_id}, '${matches[0].datetime}', '${match}')`);
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

                const nextHour = utcNow + 3600000;

                for(let routine of data) {
                    // Get guild and channel
                    const guild = await client.guilds.fetch(routine.guildId);
                    const channel = await guild.channels.cache.get(routine.channelId);

                    // Delete all messages in the channel
                    let fetched;
                    do {
                        fetched = await channel.messages.fetch({ limit: 100 });
                        await channel.bulkDelete(fetched, true);
                    } while(fetched.size > 0);

                    // Rebuild and send the first message
                    const trackedLeaguesEmbed = new EmbedBuilder()
                    .setTitle(`Tracked LoL Esports leagues`)
                    .setDescription(routine.leagues.toString())
                    .addFields(
                        { name: `Next update in`, value: `<t:${nextHour}:R>` }
                    )
                    .setTimestamp();

                    await channel.send({
                        embeds: [trackedLeaguesEmbed]
                    });

                    for(let league of routine.leagues) {

                        // Get the full league data
                        const leagueName = request.find(m => m.LeagueShort == league.name);

                        // Send the league message and pin it
                        const leagueMessage = await channel.send({
                            content: `# [${leagueName.LeagueShort}] ${leagueName.League}`
                        });

                        await leagueMessage.pin();

                        const pinMessage = await channel.messages.fetch({ limit: 1 });

                        await channel.bulkDelete(pinMessage, true);

                        for(let match of league.matches) {
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

            } else {
                data.push({
                    content: `Update failed. Trying again in an hour`
                });
            }

        });

        console.log(`hourly data fetch setup`);

    }
}