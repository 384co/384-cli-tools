#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env

// takes a storage token, creates a channel (eg a wallet)

import { Command } from "https://deno.land/x/cliffy/command/mod.ts";

// Dynamic imports, to handle our environment and config possibly living in different places
const UTILS_PATH = new URL("./utils.lib.ts", import.meta.url).pathname
const { OS384_CONFIG_PATH, OS384_ENV_PATH, OS384_ESM_PATH, SEP } = await import(UTILS_PATH);
await import(OS384_ENV_PATH)
await import(OS384_CONFIG_PATH)
const { SBStorageToken, ChannelApi } = await import(OS384_ESM_PATH);

const SB = new ChannelApi(configuration.channelServer)    


async function simpleCreateChannel(tokenHash: string) {
    try {
        console.log("This bootstraps from a token; if token has been consumed it'll fail")
        
        const _storageToken: SBStorageToken = {
            // note: starts with SBStorageTokenPrefix 'LM2r'
            hash: tokenHash
        }

        const newChannel = await SB.create(_storageToken)

        console.log("Created New Channel, handle:\n", newChannel)
        console.log(
            "\n",
            "==========================================================================\n",
            "Channel details. Suitable for copy-paste into 'env.js' for example:\n",
            "==========================================================================\n",
            JSON.stringify(newChannel, null, 2), "\n",
            "==========================================================================\n",
            "\n")
    } catch (error: any) {
        // if we get error 'No such channel or shard, or you are not authorized.' then we are fine
        if (error.message && error.message.includes("not authorized.")) {
            console.warn("Got error 'not authorized', probably means you need to refresh token")
        } else {
            console.error(error)
            throw (error)
        }
    }
}

await new Command()
    .name("create.channel.ts")
    .version("1.0.0")
    .description(`
        Creates a channel using the provided storage token. Will fail if the token has been consumed.
        You can create (bootstrap) tokens using 'refresh.token.ts'.
    `)
    .option("-t, --token <token:string>", "Storage token (hash).", { required: true })
    .action(async ({ token }) => {
        await simpleCreateChannel(token);
    })
    .parse(Deno.args);
