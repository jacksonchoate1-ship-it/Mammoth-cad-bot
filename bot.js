const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const commands = [
    new SlashCommandBuilder()
        .setName('register')
        .setDescription('Create a new civilian identity in Mammoth CAD')
        .addStringOption(opt => opt.setName('name').setDescription('First and Last Name (e.g., John Doe)').setRequired(true))
        .addStringOption(opt => opt.setName('dob').setDescription('Date of Birth (MM/DD/YYYY)').setRequired(true))
        .addStringOption(opt => opt.setName('license').setDescription('Driver License Status').setRequired(true)
            .addChoices(
                { name: 'Valid', value: 'Valid' },
                { name: 'Suspended', value: 'Suspended' },
                { name: 'None', value: 'None' }
            )),
    new SlashCommandBuilder()
        .setName('911')
        .setDescription('File an emergency 911 call report')
        .addStringOption(opt => opt.setName('location').setDescription('Incident Location / Postal Code').setRequired(true))
        .addStringOption(opt => opt.setName('details').setDescription('Emergency dispatch description').setRequired(true))
].map(cmd => cmd.toJSON());

// CHANGE THIS LINK to your public website tunnel URL so the bot knows where to send data!
const CAD_WEBSITE_URL = "http://localhost:3000"; 

client.once('ready', async () => {
    console.log(`🤖 Mammoth CAD Bot is online as ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log('Refreshing slash commands...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Slash commands loaded successfully!');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'register') {
        await interaction.deferReply();
        const name = interaction.options.getString('name');
        const dob = interaction.options.getString('dob');
        const license = interaction.options.getString('license');

        try {
            const res = await fetch(`${CAD_WEBSITE_URL}/api/civ/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, DOB: dob, license, warrants: 'None' })
            });
            if (res.ok) {
                await interaction.editReply(`✅ **Dossier Filed!** Character **${name}** (DOB: ${dob}) has been saved to Mammoth CAD.`);
            } else {
                await interaction.editReply('❌ CAD synchronization fault. Verify network connection.');
            }
        } catch (e) {
            await interaction.editReply('❌ Could not reach the CAD server database.');
        }
    }

    if (commandName === '911') {
        await interaction.deferReply();
        const location = interaction.options.getString('location');
        const details = interaction.options.getString('details');

        try {
            const res = await fetch(`${CAD_WEBSITE_URL}/api/calls`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location, details })
            });
            if (res.ok) {
                await interaction.editReply(`🚨 **911 BROADCAST TRANSMITTED!** Location: **${location}**. Units have been alerted on the CAD terminal.`);
            } else {
                await interaction.editReply('❌ Dispatch transmission fault.');
            }
        } catch (e) {
            await interaction.editReply('❌ Could not broadcast to the central dispatch mainframe.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
