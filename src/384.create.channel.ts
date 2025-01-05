#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env --allow-import

// takes a storage token, creates a channel (eg a wallet)

import { Command } from 'jsr:@cliffy/command@1.0.0-rc.4';

// Dynamic imports, to handle our environment and config possibly living in different places
const UTILS_PATH = new URL("./utils.lib.ts", import.meta.url).pathname
const { 
    VERSION, URL_FOR_384_ESM_JS, SEP, DEFAULT_CHANNEL_SERVER
} = await import(UTILS_PATH);
// @deno-types="../lib/384.esm.d.ts"
import { SBStorageToken, ChannelApi } from "../lib/384.esm.js"
// const { SBStorageToken, ChannelApi } = await import(URL_FOR_384_ESM_JS);


async function simpleCreateChannel(server: string, tokenHash: string) {
    const SB = new ChannelApi(server)    
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
            "Channel details\n",
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
    .name("384.create.channel.ts")
    .version(VERSION)
    .description(`
        Creates a channel using the provided storage token. Will fail if the token has been consumed.
        You can create (bootstrap) tokens using 'refresh.token.ts'.
    `)
    .option("-s, --server <server:string>", "(optional) Channel server to use", { default: DEFAULT_CHANNEL_SERVER })
    .option("-t, --token <token:string>", "Storage token (hash).", { required: true })
    .action(async ({ server, token }) => {
        await simpleCreateChannel(server, token);
        Deno.exit(0);
    })
    .parse(Deno.args);
