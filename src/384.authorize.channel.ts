#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env

// (c) 2024, 384 (tm) Inc

// authorizes/creates/funds a channel, either off budget channel (default) or storage token

import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";

const DBG0 = true

// Dynamic imports, to handle our environment and config possibly living in different places
const UTILS_PATH = new URL("./utils.lib.ts", import.meta.url).pathname
const { 
    OS384_CONFIG_PATH, OS384_ENV_PATH, OS384_ESM_PATH, SEP,
    handleErrorOnImportEnv, handleErrorOnImportConfig
} = await import(UTILS_PATH);
await import(OS384_ENV_PATH).catch(handleErrorOnImportEnv)
await import(OS384_CONFIG_PATH).catch(handleErrorOnImportConfig)
const { ChannelApi, Channel, ChannelAdminData, SBStorageToken } = await import(OS384_ESM_PATH);

const MiB = 1024 * 1024
const TOP_UP_INCREMENT = 256 * MiB // if there is no such channel, fund it by this amount

async function authorizeChannel(privateKey: string, budget: number, token?: SBStorageToken) {
    const SB = new ChannelApi(configuration.channelServer, false)
    const budgetChannel = SB.connect(configuration.budgetKey)

    let pageChannel = await new Channel(privateKey).ready
    pageChannel.channelServer = configuration.channelServer
    try {
        // make sure channel is served by this server
        const channelKeys = await pageChannel.getChannelKeys()
        console.log("Channel already exists, and authorized: ", channelKeys)
        // check current storage
        const storage: ChannelAdminData = await pageChannel.getAdminData()
        console.log("Channel storage before operation: ", storage)
        if (token) {
            console.log(SEP, "Adding full token budget to channel ...", SEP)
            await budgetChannel.budd({ targetChannel: pageChannel.handle, token: token })
        } else if (storage.storageLimit < budget) {
            console.log(SEP, "Topping up channel to budget ...", SEP)
            await budgetChannel.budd({ targetChannel: pageChannel.handle, size: budget - storage.storageLimit })
        } else {
            console.log(SEP, "Channel already funded to budget amount.", SEP)
        }
        console.log("Channel storage after operation: ", (await pageChannel.getAdminData()).storageLimit)
    } catch (e: any) {
        try {
            if (e.message && e.message.includes("No such channel")) {
                console.log(SEP, "Channel not found, registering and funding ...", SEP)
                const storageToken = token || await budgetChannel.getStorageToken(budget)
                pageChannel = await pageChannel.create(storageToken)
                console.log("Channel created (authorized/funded): ", pageChannel.handle)
            } else {
                console.log(SEP, "Error connecting to channel with private key: ", e, SEP)
                Deno.exit(1)
            }
        } catch (e) {
            console.log(SEP, "Error creating channel: ", e, SEP)
            Deno.exit(1)
        }
    }
}

await new Command()
    .name("authorize.channel.ts")
    .version("1.0.0")
    .description(`
        Authorizes a channel, funding it if necessary. Or if it exists, just checks it,
        and sees if it should be topped up to the provided minimum size. Note that if
        you provide a storage token, that full amount will be used, regardless of
        the budget amount.
    `)
    .option("-k, --key <key:string>", "Private key to use", { required: true })
    .option("-b, --budget <budget:number>", "(optional) Budget amount", { default: TOP_UP_INCREMENT })
    .option("-t, --token <token:string>", "(optional) Use this storage token instead of the budget channel.", { required: false })
    .action(async ({ key, budget, token }) => {
        await authorizeChannel(key, budget, token);
    })
    .parse(Deno.args);