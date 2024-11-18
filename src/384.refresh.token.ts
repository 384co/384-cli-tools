#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-run --allow-env --allow-import

// (c) 2024, 384 (tm) Inc

// refreshes a token; allows you to bootstrap environment

import { existsSync } from "https://deno.land/std@0.114.0/fs/mod.ts";

import { Command } from 'jsr:@cliffy/command@1.0.0-rc.4';

// Dynamic imports, to handle our environment and config possibly living in different places
const UTILS_PATH = new URL("./utils.lib.ts", import.meta.url).pathname
const {
    VERSION,
    OS384_PATH, URL_FOR_384_ESM_JS, DEFAULT_CHANNEL_SERVER, CHANNEL_SERVER_HOME_DIRECTORY,
    SEP,
    LocalStorage,
} = await import(UTILS_PATH);
// @deno-types="../lib/384.esm.d.ts"
//import { ChannelApi, SBStorageToken, utils } from "../lib/384.esm.js"
const { ChannelApi, SBStorageToken, utils } = await import(URL_FOR_384_ESM_JS);

// default size of token created
const defaultSize = 60 * 1024 * 1024 * 1024 // 60 GB


const localStorage = new LocalStorage(`${OS384_PATH}/.local.data.json`);


// will execute something like this:
//
//   wrangler kv:key put --preview false --binding=LEDGER_NAMESPACE "LM2r...." '{"hash": "LM2r...", "used":false,"size":60000000000, "motherChannel": "<WRANGLER Command Line>"}'
//
// (optionally with '--local' flag)

// if you have channel server running off a parallel directory, then this should
// work. upon success returns the token hash (which will be new if you didn't
// provide one)

export async function refreshToken(server: string, amount: number, tokenHash?: string): Promise<string | null> {
    // IF a channel server directory is not provided in the environment, then we default to the current directory
    // This will only work if you are running from the directory where you have the channel server
    const channelServerDirectory = CHANNEL_SERVER_HOME_DIRECTORY || "."

    // Verify that the .wrangler subdirectory exists in what we think is channel server home
    // Otherwise throw an error
    const wranglerDirectory = channelServerDirectory + "/.wrangler"
    if (!existsSync(wranglerDirectory)) {
        console.error("It looks like you are not running this script from the channel server directory. To run from a different directory, set the environment variable OS384_CHANNEL_SERVER_HOME to the channel server directory.");
        throw new Error("Channel server directory not found");
    }

    const local = new URL(server).hostname === "localhost"
    const SB = new ChannelApi(server, true)
    try {
        if (!tokenHash) {
            const SBStorageTokenPrefix = 'LM2r' // random prefix
            tokenHash = SBStorageTokenPrefix + utils.arrayBufferToBase62(crypto.getRandomValues(new Uint8Array(32)).buffer);
        }
        const token: SBStorageToken = {
            hash: tokenHash!,
            used: false,
            size: amount,
            motherChannel: "<WRANGLER>",
        }
        console.log(SEP, "Will set token to:\n", JSON.stringify(token, null, 2), '\n', SEP)
        const tokenString = JSON.stringify(token)
        let process
        if (local) {
            console.log("Refreshing storage token - local")
            process = Deno.run({
                cmd: ["wrangler", "kv:key", "put", "--preview", "--binding=LEDGER_NAMESPACE", "--local", tokenHash, tokenString],
                stdout: "piped",
                stderr: "piped",
                cwd: channelServerDirectory,
            });
        } else {
            console.log("Refreshing storage token - NOT local")
            // this will hit the ledger name space in [env.development] and preview
            process = Deno.run({
                cmd: ["wrangler", "kv:key", "put", "--preview", "false", "--binding=LEDGER_NAMESPACE", tokenHash, tokenString],
                stdout: "piped",
                stderr: "piped",
                cwd: channelServerDirectory,
            });
        }

        const { code } = await process.status();
        console.log("Refreshed storage token - process status:", code)
        if (code !== 0) {
            const rawErrorOutput = await process.stderrOutput();
            const errorOutput = new TextDecoder().decode(rawErrorOutput);
            console.error(`Refreshing storage token failed: ${errorOutput}`);
            // process.stdout.close();
            // process.stderr.close();
            process.close();
            throw new Error("Refreshing storage token failed");
        } else {
            // If the process completes successfully, also ensure to close all streams
            console.log("Refreshed storage token - successful")
            // and i want to output the stdout results
            const rawOutput = await process.output();
            const output = new TextDecoder().decode(rawOutput);
            console.log(output);
            // process.stdout.close();
            process.stderr.close();
            process.close();
            return tokenHash!
        }

    } catch (error: any) {
        // if it's "No such file or directory" then we need to tell the user what directory to run the test script from
        if (error.message && error.message.includes("No such file or directory")) {
            console.info(
                "\n",
                "================================================================================\n",
                "This needs to run from channel server directory (or token generation won't work)\n",
                "================================================================================\n")
        } else {
            console.error("Got an error trying to run wrangler command line, and it wasn't 'no such file':", error)
            throw (error)
        }
        return null
    }
}


// we then consume the token to create a new channel
async function generateToken(server: string, token: string | undefined, amount = defaultSize) {
    try {
        let savedTokenHash: string | undefined = localStorage.getItem(server + '_refresh_token') || undefined

        const tokenHash = await refreshToken(
            server,
            amount,
            token || savedTokenHash);

        if (savedTokenHash !== tokenHash) {
            localStorage.setItem(server + '_refresh_token', tokenHash)
            console.log("++++++++ Generated new token for channel creation ++++++++")
            console.log(tokenHash)
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
        }

        console.log(SEP, "Token refresh (creation) succeeded:", tokenHash, SEP)


    } catch (error: any) {
        console.warn("Looks like we could not run token refresh.")
    }
}
    
await new Command()
    .name("384.refresh.token.ts")
    .version(VERSION)
    .description(`
        Refreshes (and if needed creates) a storage token. Defaults to ${defaultSize} bytes.
        Maintains a 'global' hash that can be refreshed, unless you override with a specific token.
        This needs to be run from the channel server directory (requires wrangler authentication).
    `)
    .option("-s, --server <server:string>", "(optional) Channel server to use", { default: DEFAULT_CHANNEL_SERVER })
    .option("-a, --amount <amount:number>", "Amount of storage to allocate (optional).", { required: false })
    .option("-t, --token <token:string>", "Force using this token hash (optional).", { required: false })
    .action(async ({ server, token, amount }) => {
        await generateToken(server, token, amount);
        Deno.exit(0);
    })
    .parse(Deno.args);
    