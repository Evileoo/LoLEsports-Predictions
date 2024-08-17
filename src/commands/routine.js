import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';

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
        .setDescription("Delete the prediction routine of the channel")
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

        console.log(interaction.options);
        
        switch(interaction.options.getSubcommand()){
            case "create":

                break;
            case "delete":

                break;
            case "add":

                break;
            case "remove":

                break;
            default:
                return interaction.reply({
                    content: `Unkown interaction : ${interaction.options.getSubcommand()}`,
                    ephemeral: true
                });
        }

        return interaction.reply({
            content: "coucou",
            ephemeral: true
        });
    }
}