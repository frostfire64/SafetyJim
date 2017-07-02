import { Command, SafetyJim } from '../../safetyjim/safetyjim';
import { GuildConfig } from '../../database/database';
import * as Discord from 'discord.js';

class Kick implements Command {
    public usage = 'kick @user [reason] - kicks the user with the specified reason';

    // tslint:disable-next-line:no-empty
    constructor(bot: SafetyJim) {}

    public async run(bot: SafetyJim, msg: Discord.Message, args: string): Promise<boolean> {
        let splitArgs = args.split(' ');
        args = splitArgs.slice(1).join(' ');

        if (msg.mentions.users.size === 0 ||
            !splitArgs[0].match(Discord.MessageMentions.USERS_PATTERN)) {
            return true;
        }

        if (!msg.guild.me.hasPermission('KICK_MEMBERS')) {
            await bot.failReact(msg);
            await msg.channel.send('I don\'t have enough permissions to do that!');
            return;
        }

        let member = msg.guild.member(msg.mentions.users.first());

        if (member.id === msg.author.id) {
            await bot.failReact(msg);
            await msg.channel.send('You can\'t kick yourself, dummy!');
            return;
        }

        if (!member || !member.kickable || msg.member.highestRole.comparePositionTo(member.highestRole) <= 0) {
            await bot.failReact(msg);
            await msg.channel.send('The specified member is not kickable.');
            return;
        }

        let reason = args || 'No reason specified';

        let config = await bot.database.getGuildConfiguration(msg.guild);

        let embed = {
            title: `Kicked from ${msg.guild.name}`,
            color: parseInt(config.EmbedColor, 16),
            fields: [{ name: 'Reason:', value: reason, inline: false }],
            description: `You were kicked from ${msg.guild.name}.`,
            footer: { text: `Kicked by: ${msg.author.tag} (${msg.author.id})`},
            timestamp: new Date(),
        };

        try {
            await member.send({ embed });
        } finally {
            try {
                await member.kick(reason);
                await bot.successReact(msg);
                await this.createModLogEntry(bot, msg, member, reason, config);
                await bot.database.createUserKick(member.user, msg.author, msg.guild, reason);
            } catch (e) {
                await bot.failReact(msg);
                await msg.channel.send('Could not kick specified user. Do I have enough permissions?');
            }
        }
    }

    private async createModLogEntry(bot: SafetyJim, msg: Discord.Message,
                                    member: Discord.GuildMember, reason: string, config: GuildConfig): Promise<void> {
        let prefix = await bot.database.getGuildPrefix(msg.guild);

        if (!config  || !config.ModLogActive) {
            return;
        }

        if (!bot.client.channels.has(config.ModLogChannelID) ||
            bot.client.channels.get(config.ModLogChannelID).type !== 'text') {
            // tslint:disable-next-line:max-line-length
            msg.channel.send(`Invalid mod log channel in guild configuration, set a proper one via \`${prefix} settings\` command.`);
            return;
        }

        let logChannel = bot.client.channels.get(config.ModLogChannelID) as Discord.TextChannel;

        let embed = {
            color: 0xFF9900, // orange
            fields: [
                { name: 'Action:', value: 'Kick', inline: false },
                { name: 'User:', value: `${member.user.tag} (${member.id})`, inline: false },
                { name: 'Reason:', value: reason, inline: false },
                { name: 'Responsible Moderator:', value: `${msg.author.tag} (${msg.author.id})`, inline: false },
            ],
            timestamp: new Date(),
        };

        await logChannel.send({ embed });

        return;
    }

}
module.exports = Kick;
