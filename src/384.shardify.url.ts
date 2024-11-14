#!/usr/bin/env -S deno run --allow-read --allow-net --allow-env --allow-import

// deno-lint-ignore-file no-explicit-any

// (c) 2024, 384 (tm) Inc

// Fetches the contents of a URL and uploads to a 384 storage server

import { Command } from 'jsr:@cliffy/command@1.0.0-rc.4';

const DBG0 = true

// Dynamic imports, to handle our environment and config possibly living in different places
const UTILS_PATH = new URL("./utils.lib.ts", import.meta.url).pathname
const { 
    VERSION, SEP, URL_FOR_384_ESM_JS, DEFAULT_CHANNEL_SERVER
} = await import(UTILS_PATH);

// @deno-types="../lib/384.esm.d.ts"
//import { ChannelApi } from "../lib/384.esm.js"
const { ChannelApi } = await import(URL_FOR_384_ESM_JS)


async function shardify(channelServer: string, budgetKey: string, url: string, output: string) {
    const SB = new ChannelApi(channelServer)
    const budgetChannel = SB.connect(budgetKey)
    const storageServer = await SB.getStorageServer()

    // read the data from the URL
    const response = await fetch(url)
    const data = await response.arrayBuffer()
    const bytes = new Uint8Array(data)

    // get some meta data
    const contentType = response.headers.get("content-type")
    const contentLength = response.headers.get("content-length")

    // store it as a shard
    const handle = await SB.storage.storeData(bytes, budgetChannel)
    await handle.verification

    if (output === "nostr") {
        // create an 'os384' magnet link
        const magnet = `magnet:?xt=urn:os384:${handle.id}&key=${handle.key}&verification=${handle.verification}&xs=${storageServer}`

        // build the NIP-94 handle:
        const nip94 = {
            "kind": 1063,
            "tags": [
                // ["url", <we might want to add a URL form>],
                ["m", contentType],
                ["size", contentLength],
                ["magnet", magnet],
            ],
        }

        const SEP = '='.repeat(60)
        console.log(SEP)
        console.log(JSON.stringify(nip94, null, 2))
        console.log(SEP)
    } else {
        console.error("Unrecognized output type: ", output)
    }

}

await new Command()
    .name("384.shardify.url.ts")
    .version(VERSION)
    .description(`
        Fetches whatever is at the URL and shardifies it.
    `)
    .option("-s, --server <server:string>", "(optional) Channel server to use", { default: DEFAULT_CHANNEL_SERVER })
    .option("-b, --budget <budget:string>", "Private key to use as budget channel", { required: true })
    .option("-u, --url <key:string>", "URL to read from", { required: true })
    .option("-o, --output <output:string>", "Output type", { default: "nostr" })
    .action(async ({ server, budget, url, output }) => {
        await shardify(server, budget, url, output);
    })
    .parse(Deno.args);