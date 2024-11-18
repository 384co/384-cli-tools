#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env --allow-import

// deno-lint-ignore-file no-explicit-any

// (c) 2024, 384 (tm) Inc

// authorizes/creates/funds a channel, either off budget channel (default) or storage token

import { Command } from 'jsr:@cliffy/command@1.0.0-rc.4';

const DBG0 = true

// Dynamic imports, to handle our environment and config possibly living in different places
const UTILS_PATH = new URL("./utils.lib.ts", import.meta.url).pathname
const { 
    VERSION, SEP, URL_FOR_384_ESM_JS, DEFAULT_CHANNEL_SERVER
} = await import(UTILS_PATH);

// @deno-types="../lib/384.esm.d.ts"
//import { ChannelApi, Channel, ChannelAdminData, SBStorageToken } from "../lib/384.esm.js"
const { ChannelApi, Channel, ChannelAdminData, SBStorageToken } = await import(URL_FOR_384_ESM_JS)

const MiB = 1024 * 1024
const TOP_UP_INCREMENT = 256 * MiB // if there is no such channel, fund it by this amount

async function authorizeChannel(channelServer: string, channelKey: string, amount: number, budgetKey?: string, token?: SBStorageToken | string) {
    const SB = new ChannelApi(channelServer, false)

    let pageChannel = await new Channel(channelKey).ready
    pageChannel.channelServer = channelServer
    try {
        // make sure channel is served by this server
        const channelKeys = await pageChannel.getChannelKeys()
        console.log("Channel already exists, and authorized: ", channelKeys)
        // check current storage
        const storage: ChannelAdminData = await pageChannel.getAdminData()
        console.log("Channel storage before operation: ", storage)
        if (token) {
            console.log(SEP, "Adding full token budget to channel ...", SEP)
            if (budgetKey) {
                const budgetChannel = SB.connect(budgetKey)
                await budgetChannel.budd({ targetChannel: pageChannel.handle, token: token as SBStorageToken })
            } else {
                await pageChannel.create(token as SBStorageToken, channelServer);
            }
            console.log("done")
        } else if (storage.storageLimit < amount) {
            console.log(SEP, "Topping up channel to budget ...", SEP)
            if (budgetKey) {
                const budgetChannel = SB.connect(budgetKey)
                await budgetChannel.budd({ targetChannel: pageChannel.handle, size: amount - storage.storageLimit })
                console.log("done")
            } else {
                console.error("No budget key provided, cannot top up channel.")
                Deno.exit(1);
            }
        } else {
            console.log(SEP, "Channel already funded to budget amount.", SEP)
        }
        console.log("Channel storage after operation: ", (await pageChannel.getAdminData()).storageLimit)
    } catch (e: any) {
        try {
            if (e.message && e.message.includes("No such channel")) {
                console.log(SEP, "Channel not found, registering and funding ...", SEP)
                if (token) {
                    pageChannel = await pageChannel.create(token as SBStorageToken)
                    console.log("Channel created (authorized/funded): ", pageChannel.handle)
                } else if (budgetKey) {
                    const budgetChannel = SB.connect(budgetKey)
                    const storageToken = await budgetChannel.getStorageToken(amount)
                    pageChannel = await pageChannel.create(storageToken as SBStorageToken)
                    console.log("Channel created (authorized/funded): ", pageChannel.handle)
                } else {
                    console.error("Channel does not exist, and no budget or storage token was provided to create it.");
                    Deno.exit(1);
                }
            } else {
                console.log(SEP, "Error connecting to channel with private key: ", e, SEP)
                Deno.exit(1)
            }
        } catch (e) {
            console.log(SEP, "Error creating channel: ", e, SEP)
            Deno.exit(1)
        }
    }
    console.log(SEP, "Channel authorized/funded.", SEP)
}

await new Command()
    .name("384.authorize.channel.ts")
    .version(VERSION)
    .description(`
        Authorizes a channel, funding it if necessary. Or if it exists, just checks it,
        and sees if it should be topped up to the provided minimum size. Note that if
        you provide a storage token, that full amount will be used, regardless of
        the budget amount.
    `)
    .option("-s, --server <server:string>", "(optional) Channel server to use", { default: DEFAULT_CHANNEL_SERVER })
    .option("-c, --channel <channel:string>", "Channel to authorize", { required: true })
    .option("-a, --amount <amount:number>", "(optional) Budget amount", { default: TOP_UP_INCREMENT })
    .option("-b, --budget <budget:string>", "Budget channel key", { required: false })
    .option("-t, --token <token:string>", "(optional) Use this storage token instead of the budget channel.", { required: false })
    .action(async ({ server, channel, amount, budget, token }) => {
        if (!budget && !token) {
            console.error("Error: You must provide at least one of --budget (-b) or --token (-t)");
            Deno.exit(1);
        }
        await authorizeChannel(server, channel, amount, budget, token);
        Deno.exit(0);
    })
    .parse(Deno.args);
