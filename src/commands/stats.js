import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { bot } from '../connections/fandom.js';
import { db } from '../connections/database.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Get statistics for a member")
    .addUserOption(option =>
        option
        .setName("user")
        .setDescription("User you want to get the statistics")
        .setRequired(false)
    )
    .addUserOption(option =>
        option
        .setName("compareto")
        .setDescription("User you want to compare to")
        .setRequired(false)
    )
    .addStringOption(option =>
        option
        .setName("league")
        .setDescription("league the user bet on")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
        option
        .setName("split")
        .setDescription("split of a league the user bet on")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
        option
        .setName("year")
        .setDescription("year of matches the user bet on")
        .setRequired(false)
    )
    .addStringOption(option =>
        option
        .setName("team")
        .setDescription("team the user bet on")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
        option
        .setName("bestof")
        .setDescription("type of best of")
        .setRequired(false)
        .addChoices(
            { name: `BO1`, value: '1' },
            { name: `BO3`, value: '3' },
            { name: `BO5`, value: '5' },
        )
    )
    , async execute(interaction){

        // Get all command data
        const targetedUser = (interaction.options.getUser("user") == null) ? interaction.user : interaction.options.getUser("user");
        const comparedToUser = interaction.options.getUser("compareto");
        const league = interaction.options.getString("league");
        const split = interaction.options.getString("split");
        const year = interaction.options.getString("year");
        const team = interaction.options.getString("team");
        const bestOf = interaction.options.getString("bestof");

        // Initialize count vars
        let rights = 0;
        let wrongs = 0;

        // Check if data is correct
        if(league != null) {
            const result = await (await bot).query({
                action: `cargoquery`,
                tables: `Leagues=l`,
                fields: `l.League_Short`,
                where : `l.League_Short = '${league}'`,
                limit: 1
            });

            if(result.cargoquery.length == 0) {
                return await interaction.reply({
                    content: `Please select the league from ones who are given to you`,
                    ephemeral: true
                });
            }
        }
        if(split != null) {
            const result = await (await bot).query({
                action: `cargoquery`,
                tables: `Tournaments=t`,
                fields: `t.OverviewPage`,
                where : `t.OverviewPage = '${split}'`,
                limit: 1
            });

            if(result.cargoquery.length == 0) {
                return await interaction.reply({
                    content: `Please select the split from ones who are given to you`,
                    ephemeral: true
                });
            }
        }
        if(team != null) {
            const result = await (await bot).query({
                action: `cargoquery`,
                tables: `Teams=t`,
                fields: `t.Name`,
                where : `t.Name = '${team}'`,
                limit: 1
            });

            if(result.cargoquery.length == 0) {
                return await interaction.reply({
                    content: `Please select the team from ones who are given to you`,
                    ephemeral: true
                });
            }
        }

        // Build the query conditions
        let conditions = ``;
        conditions += (league != null) ? ` AND l.League_Short = '${league}'` : `` ;
        conditions += (split != null) ? ` AND t.OverviewPage = '${split}'` : `` ;
        conditions += (year != null) ? ` AND t.Year = '${year}'` : `` ;
        conditions += (team != null) ? ` AND (t1.Name = '${team}' OR t2.Name = '${team}')` : `` ;
        conditions += (bestOf != null) ? ` AND m.BestOf = '${bestOf}'` : `` ;

        // Get matches the targeted user predicted
        const targetUserPredictions = await db.query(`SELECT * FROM user_prediction WHERE discord_user_id = '${targetedUser.id}'`);

        if(targetUserPredictions.length == 0) {
            return await interaction.reply({
                content: `${targetedUser.globalName} didn't predict yet`,
                ephemeral: true
            });
        }
        
        // Build the cargoquery condition for the targeted user
        const targetedUserMatches = targetUserPredictions.map(m => {
            return `m.MatchId = '${m.match_id}'`;
        }).join(` OR `);

        // Get targeted user stats
        const targetedUserResults = await (await bot).query({
            action: `cargoquery`,
            tables: `MatchSchedule=m, Tournaments=t, Leagues=l, Teams=t1, Teams=t2`,
            fields: `m.MatchId, t1.Name=t1Name, t2.Name=t2Name, m.Team1Score, m.Team2Score`,
            join_on: `m.Team1=t1.Name, m.Team2=t2.Name, t.OverviewPage=m.OverviewPage, t.League=l.League`,
            where : `(${targetedUserMatches})${conditions}`,
            limit: 500
        });

        for(let result of targetedUserResults.cargoquery) {

            if(result.title.Team1Score == targetUserPredictions.find(m => m.match_id).team1score && result.title.Team2Score == targetUserPredictions.find(m => m.match_id).team2score) {
                rights++;
            } else {
                wrongs++;
            }
        }

        // stats vars
        const predictionsNumber = rights + wrongs;
        const guessRate = (rights / predictionsNumber * 100).toFixed(0);

        // build embed description
        let embedDescription = `Sort :`;
        embedDescription += (league != null) ? `\nleague: ${league}` : `` ;
        embedDescription += (split != null) ? `\nsplit:  ${split}` : `` ;
        embedDescription += (year != null) ? `\nyear: ${year}` : `` ;
        embedDescription += (team != null) ? `\nteam: ${team}` : `` ;
        embedDescription += (bestOf != null) ? `best of: ${bestOf}` : `` ;

        // Get matches the user to compare to predicted
        if(comparedToUser != null) {
            const comparedToUserPredictions = await db.query(`SELECT * FROM user_prediction WHERE discord_user_id = '${comparedToUser.id}'`);

            if(comparedToUserPredictions.length == 0 || comparedToUser != null) {
                return await interaction.reply({
                    content: `${comparedToUser.globalName} didn't predict yet`,
                    ephemeral: true
                });
            }

            // Build the cargoquery condition for the "compared to" user
            const comparedToUserMatches = comparedToUserPredictions.map(m => {
                return `m.MatchId = '${m.match_id}'`;
            }).join(` OR `);

            // Get targeted user stats
            const comparedToUserResults = await (await bot).query({
                action: `cargoquery`,
                tables: `MatchSchedule=m, Tournaments=t, Leagues=l, Teams=t1, Teams=t2`,
                fields: `m.MatchId, t1.Name=t1Name, t2.Name=t2Name, m.Team1Score, m.Team2Score`,
                join_on: `m.Team1=t1.Name, m.Team2=t2.Name, t.OverviewPage=m.OverviewPage, t.League=l.League`,
                where : `(${comparedToUserMatches})${conditions}`,
                limit: 500
            });

            let compareRights = 0;
            let compareWrongs = 0;

            for(let result of comparedToUserResults.cargoquery) {

                if(result.title.Team1Score == comparedToUserPredictions.find(m => m.match_id).team1score && result.title.Team2Score == comparedToUserPredictions.find(m => m.match_id).team2score) {
                    compareRights++;
                } else {
                    compareWrongs++;
                }
            }

            // stats vars
            const predictionsNumber2 = compareRights + compareWrongs;
            const guessRate2 = (compareRights / predictionsNumber2 * 100).toFixed(0);

            // build embed
            const statsEmbed = new EmbedBuilder()
            .setTitle(`Comparing ${targetedUser.globalName} and ${comparedToUser.globalName} statistics`)
            .addFields(
                { name: `${targetedUser.globalName}` },
                { name: `Predictions number`, value: `${predictionsNumber}`, inline: true },
                { name: `guess rate`, value: `${guessRate}%`, inline: true },
                { name: `${comparedToUser.globalName}` },
                { name: `Predictions number`, value: `${predictionsNumber2}`, inline: true },
                { name: `guess rate`, value: `${guessRate2}%`, inline: true },
            )
            .setTimestamp()
            .setAuthor({ name: `By ${interaction.user.globalName}` });

            if(embedDescription != "Sort :") statsEmbed.setDescription(`${embedDescription}`);

            await interaction.reply({
                embeds: [statsEmbed]
            });

        } else {
            // build embed
            const statsEmbed = new EmbedBuilder()
            .setTitle(`${targetedUser.globalName}'s statistics`)
            .addFields(
                { name: `Predictions number`, value: `${predictionsNumber}`, inline: true },
                { name: `guess rate`, value: `${guessRate}%`, inline: true },
            )
            .setTimestamp()
            .setAuthor({ name: `By ${interaction.user.globalName}` });

            if(embedDescription != "Sort :") statsEmbed.setDescription(`${embedDescription}`);

            await interaction.reply({
                embeds: [statsEmbed]
            });
        }
        
    }
}