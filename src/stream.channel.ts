#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env

// takes a private key for a channel, reads the contents (messages) using streams

import '../env.js'
import '../config.js'

// @deno-types="../dist/384.esm.d.ts"
import { ChannelApi, SBUserPrivateKey, channel } from "../dist/384.esm.js"

import { Command } from "https://deno.land/x/cliffy/command/mod.ts";

async function streamChannel(privateKey: SBUserPrivateKey, live = false) {
    try {
        const c = await (new channel.stream(privateKey, /* , protocol if needed */)).ready
        for await (const message of c.start({ prefix: '0', live: live }))
            console.log(message.body)
    } catch (e: any) {
        console.trace("Error in stream.channel.ts:", e)
    }
}

await new Command()
    .name("stream.channel.ts")
    .version("1.0.0")
    .description(`
        Reads contents of a channel using stream. You must provide private key (with which to connect).
  `)
    .option("-k, --key <key:string>", "Private key to use.", { required: true })
    .option("-l, --live", "Enable live streaming.", { default: false })
    .action(async ({ key, live }) => {
        /* side effects */ new ChannelApi(configuration.channelServer)
        await streamChannel(key, live);
    })
    .parse(Deno.args);
