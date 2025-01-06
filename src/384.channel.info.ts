#!/usr/bin/env -S deno run --allow-net --allow-env

// Dynamic imports, to handle our environment and config possibly living in different places
const UTILS_PATH = new URL("./utils.lib.ts", import.meta.url).pathname
const { 
    DEFAULT_CHANNEL_SERVER, URL_FOR_384_ESM_JS
} = await import(UTILS_PATH);

// @deno-types="./384.esm.d.ts"
// import { Channel, ChannelApi, SBUserPrivateKey } from "../lib/384.esm.js"
const { Channel, ChannelApi, SBUserPrivateKey } = await import(URL_FOR_384_ESM_JS);

/* const SB = */ new ChannelApi(DEFAULT_CHANNEL_SERVER) // side effects

// import { Command } from "https://deno.land/x/cliffy/command/mod.ts";
import { Command } from 'jsr:@cliffy/command@1.0.0-rc.4';

async function channelInfo(privateKey: typeof SBUserPrivateKey) {
    const c = await new Channel(privateKey).ready
    const i = await c.getAdminData()

        console.log(
            "\n",
            "==========================================================================\n",
            "Channel server information:\n",
            "==========================================================================\n",
            JSON.stringify(i, null, 2), "\n",
            "==========================================================================\n",
            "\n")

}

await new Command()
    .name("channel.info.ts")
    .version("1.0.0")
    .description(`
        Gets server and channel information.
    `)
    .option("-k, --key <key:string>", "Private key to use.", { required: true })
    .action(async ({ key }) => {
        await channelInfo(key);
    })
    .parse(Deno.args);
