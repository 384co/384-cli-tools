#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env

// takes a private key for a channel, reads the contents (messages) using streams

import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";

// Dynamic imports, to handle our environment and config possibly living in different places
const UTILS_PATH = new URL("./utils.lib.ts", import.meta.url).pathname
const { 
    VERSION, SEP, URL_FOR_384_ESM_JS, DEFAULT_CHANNEL_SERVER
} = await import(UTILS_PATH);
// @deno-types="../lib/384.esm.d.ts"
import { ChannelApi, ChannelStream, SBUserPrivateKey, channel } from "../lib/384.esm.js"
//const { ChannelApi, ChannelStream, SBUserPrivateKey, channel } = await import(URL_FOR_384_ESM_JS);


async function streamChannel(server: string, channel: string, live = false) {
    const SB = new ChannelApi(server)
    try {
        const chan = await SB.connect(channel).ready
        const handle = chan.handle

        const c = await (new ChannelStream(handle, /* , protocol if needed */)).ready
        for await (const message of c.start({ prefix: '0', live: live }))
            console.log(message.body)
    } catch (e: any) {
        console.trace("Error in 384.stream.channel.ts:", e)
    }
}

await new Command()
    .name("384.stream.channel.ts")
    .version(VERSION)
    .description(`
        Reads contents of a channel using stream. You must provide private key (with which to connect).
    `)
    .option("-s, --server <server:string>", "(optional) Channel server to use", { default: DEFAULT_CHANNEL_SERVER })
    .option("-c, --channel <channel:string>", "Private key for the channel.", { required: true })
    .option("-l, --live", "Enable live streaming.", { default: false })
    .action(async ({ server, channel, live }) => {
        await streamChannel(server, channel, live);
    })
    .parse(Deno.args);
