import { Command, SafetyJim } from '../../safetyjim/safetyjim';
import * as Discord from 'discord.js';

class Kick implements Command {
    public usage = 'kick @user [reason] - Kicks the user with the specified reason';

    // tslint:disable-next-line:no-empty
    constructor(bot: SafetyJim) {}

    public run(bot: SafetyJim, msg: Discord.Message, args: string): boolean {
        this.runAsync(bot, msg, args);
        return;
    }

    private async runAsync(bot: SafetyJim, msg: Discord.Message, args: string): Promise<void> {
        args = args.split(' ').slice(1).join(' ');

        if (msg.mentions.users.size === 0) {
            msg.channel.send('You need to mention the user to kick.');
            return;
        }

        let member = msg.guild.member(msg.mentions.users.first());

        if (!member || !member.kickable || msg.member.highestRole.comparePositionTo(member.highestRole) <= 0) {
            msg.channel.send('The specified member is not kickable.');
            return;
        }

        // tslint:disable-next-line:max-line-length
        bot.log.info(`Kicked user "${member.user.tag}" in "${msg.guild.name}".`);
        member.kick(args || 'No reason specified'); // Audit log compatibility :) (Known Caveat: sometimes reason won't appear, or add if reason has symbols.)
        bot.database.createUserKick(member.user, msg.author, msg.guild, args || 'No reason specified');

        let db = await bot.database.getGuildConfiguration(msg.guild);
        let prefix = await bot.database.getGuildPrefix(msg.guild);

        // tslint:disable-next-line:max-line-length
        if (!db  || !db.ModLogActive) {
            return;
        }

        if (!bot.client.channels.has(db.ModLogChannelID) ||
            bot.client.channels.get(db.ModLogChannelID).type !== 'text') {
            msg.channel.send('Invalid channel in guild configuration, set a proper one via `prefix settings` command.');
            return;
        }

        let logChannel = bot.client.channels.get(db.ModLogChannelID) as Discord.TextChannel;

        let embed = {
            color: 0xFF9900, // placeholder, dunno if you want different colours based on action type
            fields: [
                { name: 'Action:', value: 'Kick', inline: false },
                { name: 'User:', value: member.user.tag, inline: false },
                { name: 'Reason:', value: args || 'No reason specified', inline: false },
                { name: 'Responsible Moderator:', value: msg.author.tag, inline: false },
            ],
            timestamp: new Date(),
        };

        logChannel.send({ embed });

        return;
    }

}
module.exports = Kick;
