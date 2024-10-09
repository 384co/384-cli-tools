#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env

// takes a private key for a channel, reads the contents (messages) using streams

import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";

// Dynamic imports, to handle our environment and config possibly living in different places
const UTILS_PATH = new URL("./utils.lib.ts", import.meta.url).pathname
const { 
    OS384_CONFIG_PATH, OS384_ENV_PATH, OS384_ESM_PATH, SEP,
    handleErrorOnImportEnv, handleErrorOnImportConfig
} = await import(UTILS_PATH);
await import(OS384_ENV_PATH).catch(handleErrorOnImportEnv)
await import(OS384_CONFIG_PATH).catch(handleErrorOnImportConfig)
const { ChannelApi, SBUserPrivateKey, channel } = await import(OS384_ESM_PATH);


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
