/* eslint-disable no-case-declarations */
 
import { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder, time, TimestampStyles } from 'discord.js';
import { db } from '../connections/database.js';
import { bot } from '../connections/fandom.js';
import { routine } from '../functions/routineFunction.js';

export const command = {
    data: new SlashCommandBuilder()
    .setName("routine")
    .setDescription("Create and delete predictions routines, add or remove leagues")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("create")
        .setDescription("Create a prediction routine in this channel")
        .addStringOption( (option) =>
            option
            .setName("league")
            .setDescription("Choose the league")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("delete")
        .setDescription("Delete the prediction routine of this channel (it will delete the channel)")
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("add")
        .setDescription("Add a league to this channel's predictions routine")
        .addStringOption( (option) =>
            option
            .setName("league")
            .setDescription("Choose a league to add")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand( (subcommand) =>
        subcommand
        .setName("remove")
        .setDescription("Remove a league to this channel's predictions routine")
        .addStringOption( (option) =>
            option
            .setName("league")
            .setDescription("Choose a league to remove")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    , async execute(interaction){

        // Get the league
        const league = (interaction.options.getSubcommand() != "delete") ? interaction.options._hoistedOptions[0].value : null;
        
        switch(interaction.options.getSubcommand()){
            case "create":

                // Create the channel
                const newChannel = await interaction.guild.channels.create({
                    name: `predictions`,
                    type: ChannelType.GuildText,
                    parent: interaction.channel.parent.id,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            deny: [
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.AddReactions,
                                PermissionsBitField.Flags.CreatePublicThreads,
                                PermissionsBitField.Flags.CreatePrivateThreads,
                                PermissionsBitField.Flags.ManageMessages
                            ]
                        },
                        {
                            id: interaction.applicationId,
                            allow: [
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ManageMessages
                            ]
                        }
                    ]
                });

                await interaction.reply({
                    content: `New channel created : <#${newChannel.id}>\nThe routine will be executed in this one.\nDeleting this channel will break the routine.`,
                    ephemeral: true
                });

                // Add the routine in database
                const newRoutineInsert = `INSERT INTO routine (routine_guild_id, routine_channel_id, league) VALUES ('${interaction.guild.id}', '${newChannel.id}', '${league}')`;
                await db.query(newRoutineInsert);

                // Build and send the first message
                const trackedLeaguesEmbed = new EmbedBuilder()
                .setTitle(`Tracked LoL Esports leagues`)
                .setDescription(league)
                .setTimestamp();

                await newChannel.send({
                    embeds: [trackedLeaguesEmbed]
                });
                
                // Create the routine routine
                await routine.start(interaction.client, interaction.guild.id, newChannel.id);

                break;
            case "delete":

                // Check if we are in a predictions channel
                const deleteRoutineCheck = `SELECT league FROM routine WHERE routine_guild_id = ${interaction.guild.id} AND routine_channel_id = ${interaction.channel.id}`;
                const getDeleteRoutineCheck = await db.query(deleteRoutineCheck);

                if(getDeleteRoutineCheck.length == 0){
                    return interaction.reply({
                        content: `This channel doesn't run a prediction routine`,
                        ephemeral: true
                    });
                }

                // Delete the channel
                // Database delete is handled in the channelDelete.js file
                await interaction.channel.delete();
                
                break;
            case "add":
                
                // Check if we are in a predictions channel
                const existingRoutineInsertCheck = `SELECT league FROM routine WHERE routine_guild_id = ${interaction.guild.id} AND routine_channel_id = ${interaction.channel.id}`;
                const getExistingRoutineInsertCheck = await db.query(existingRoutineInsertCheck);

                if(getExistingRoutineInsertCheck.length == 0){
                    return interaction.reply({
                        content: `This channel doesn't run a prediction routine`,
                        ephemeral: true
                    });
                }

                // Check if the league is already tracked
                if(getExistingRoutineInsertCheck.some(prediction => prediction.league == league)){
                    return interaction.reply({
                        content: `This league is already tracked in this channel`,
                        ephemeral: true
                    });
                }

                // Check if the league exists
                const leagueExistsCheck = await (await bot).query({
                    action: `cargoquery`,
                    tables: `Leagues=l`,
                    fields: `l.League_Short=Short`,
                    where : `l.League_Short = '${league}'`,
                    limit: 1
                });

                if(leagueExistsCheck.cargoquery.length == 0){
                    return interaction.reply({
                        content: `This league doesn't exist.\nSelect one from the list`,
                        ephemeral: true
                    });
                }

                // Add the league to the database
                const existingRoutineInsert = `INSERT INTO routine (routine_guild_id, routine_channel_id, league) VALUES ('${interaction.guild.id}', '${interaction.channel.id}', '${league}')`;
                await db.query(existingRoutineInsert);

                // Edit the 1st message
                const addMessageEdit = await interaction.channel.messages.fetch({ limit: 100, cache: false });
                
                let addEmbedDescription = getExistingRoutineInsertCheck.map(prediction => prediction.league).join(", ");
                addEmbedDescription += ", " + league;

                const addEditedEmbed = new EmbedBuilder()
                .setTitle(`Tracked LoLEsports Leagues`)
                .setDescription(addEmbedDescription)
                .setTimestamp();

                await addMessageEdit.at(-1).edit({
                    embeds: [addEditedEmbed]
                });

                await interaction.reply({
                    content: `League added`,
                    ephemeral: true
                });

                break;
            case "remove":

                // Check if it is the last league
                const removeLastLeagueCheck = `SELECT league FROM routine WHERE routine_guild_id = ${interaction.guild.id} AND routine_channel_id = ${interaction.channel.id}`;
                const getRemoveLastLeagueCheck = await db.query(removeLastLeagueCheck);

                if(getRemoveLastLeagueCheck.length == 1){
                    return interaction.reply({
                        content: `This is the only tracked league.\nIf you want to delete predictions, do \`/routine delete\` instead`,
                        ephemeral: true
                    });
                }

                // Check if we are in a predictions channel
                if(getRemoveLastLeagueCheck.length == 0){
                    return interaction.reply({
                        content: `This channel doesn't run a prediction routine`,
                        ephemeral: true
                    });
                }

                // Check if we are in a predictions channel and if the selection exists
                const removeRoutineCheck = `SELECT league FROM routine WHERE routine_guild_id = ${interaction.guild.id} AND routine_channel_id = ${interaction.channel.id} AND league = '${league}'`;
                const getRemoveRoutineCheck = await db.query(removeRoutineCheck);

                if(getRemoveRoutineCheck.length == 0){
                    return interaction.reply({
                        content: `The league you chose doesn't exist in database.\nBe sure to select the league in the list`,
                        ephemeral: true
                    });
                }

                // Remove the league from the database
                const removeRoutine = `DELETE FROM routine WHERE routine_guild_id = ${interaction.guild.id} AND routine_channel_id = ${interaction.channel.id} AND league = '${league}'`;
                await db.query(removeRoutine);

                // Edit the 1st message
                const removeMessageEdit = await interaction.channel.messages.fetch({ limit: 100, cache: false });
                const getLeagues = await db.query(removeLastLeagueCheck);

                let removeEmbedDescription = getLeagues.map(prediction => prediction.league).join(", ");

                const removeEditedEmbed = new EmbedBuilder()
                .setTitle(`Tracked LoLEsports Leagues`)
                .setDescription(removeEmbedDescription)
                .setTimestamp();

                await removeMessageEdit.at(-1).edit({
                    embeds: [removeEditedEmbed]
                });

                await interaction.reply({
                    content: `League removed`,
                    ephemeral: true
                });

                break;
            default:
                return interaction.reply({
                    content: `Unkown interaction : ${interaction.options.getSubcommand()}`,
                    ephemeral: true
                });
        }
    }
}