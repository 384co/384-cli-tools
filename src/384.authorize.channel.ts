#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env

// deno-lint-ignore-file no-explicit-any

// (c) 2024, 384 (tm) Inc

// authorizes/creates/funds a channel, either off budget channel (default) or storage token

import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";

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

async function authorizeChannel(channelServer: string, channelKey: string, amount: number, budgetKey: string, token?: SBStorageToken | string) {
    const SB = new ChannelApi(channelServer, false)
    const budgetChannel = await SB.connect(budgetKey).ready
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
            await budgetChannel.budd({ targetChannel: pageChannel.handle, token: token as SBStorageToken })
            console.log("done")
        } else if (storage.storageLimit < amount) {
            console.log(SEP, "Topping up channel to budget ...", SEP)
            await budgetChannel.budd({ targetChannel: pageChannel.handle, size: amount - storage.storageLimit })
            console.log("done")
        } else {
            console.log(SEP, "Channel already funded to budget amount.", SEP)
        }
        console.log("Channel storage after operation: ", (await pageChannel.getAdminData()).storageLimit)
    } catch (e: any) {
        try {
            if (e.message && e.message.includes("No such channel")) {
                console.log(SEP, "Channel not found, registering and funding ...", SEP)
                const storageToken = token || await budgetChannel.getStorageToken(amount)
                pageChannel = await pageChannel.create(storageToken as SBStorageToken)
                console.log("Channel created (authorized/funded): ", pageChannel.handle)
            } else {
                console.log(SEP, "Error connecting to channel with private key: ", e, SEP)
                Deno.exit(1)
            }
        } catch (e) {
            console.log(SEP, "Error creating channel: ", e, SEP)
            Deno.exit(1)
        }
        console.error(e)
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
    .option("-b, --budget <budget:string>", "Budget key", { required: true })
    .option("-t, --token <token:string>", "(optional) Use this storage token instead of the budget channel.", { required: false })
    .action(async ({ server, channel, amount, budget, token }) => {
        await authorizeChannel(server, channel, amount, budget, token);
    })
    .parse(Deno.args);
