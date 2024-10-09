#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-run

// (c) 2024, 384 (tm) Inc

// refreshes a token; allows you to bootstrap environment

import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";

// Dynamic imports, to handle our environment and config possibly living in different places
const UTILS_PATH = new URL("./utils.lib.ts", import.meta.url).pathname
const { OS384_CONFIG_PATH, OS384_ENV_PATH, OS384_ESM_PATH, LocalStorage, SEP } = await import(UTILS_PATH);
await import(OS384_ENV_PATH)
await import(OS384_CONFIG_PATH)
const {
    ChannelApi, SBStorageToken, utils
} = await import(OS384_ESM_PATH);

// default size of token created
const defaultSize = 60 * 1024 * 1024 * 1024 // 60 GB

const configuration = (window as any).configuration

const SB = new ChannelApi(configuration.channelServer, /* configuration.DBG */ true)

const localStorage = new LocalStorage('./.local.data.json');


// will execute something like this:
//
//   wrangler kv:key put --preview false --binding=LEDGER_NAMESPACE "LM2r...." '{"hash": "LM2r...", "used":false,"size":60000000000, "motherChannel": "<WRANGLER Command Line>"}'
//
// (optionally with '--local' flag)

// if you have channel server running off a parallel directory, then this should
// work. upon success returns the token hash (which will be new if you didn't
// provide one)

const CHANNEL_SERVER_WORKING_DIRECTORY = "../channels-cloudflare"

export async function refreshToken(local: boolean, size: number, tokenHash?: string): Promise<string | null> {
    try {
        if (!tokenHash) {
            const SBStorageTokenPrefix = 'LM2r' // random prefix
            tokenHash = SBStorageTokenPrefix + utils.arrayBufferToBase62(crypto.getRandomValues(new Uint8Array(32)).buffer);
        }
        const token: SBStorageToken = {
            hash: tokenHash!,
            used: false,
            size: size,
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
                cwd: CHANNEL_SERVER_WORKING_DIRECTORY,
            });
        } else {
            console.log("Refreshing storage token - NOT local")
            // this will hit the ledger name space in [env.development] and preview
            process = Deno.run({
                cmd: ["wrangler", "kv:key", "put", "--preview", "false", "--binding=LEDGER_NAMESPACE", tokenHash, tokenString],
                stdout: "piped",
                stderr: "piped",
                cwd: CHANNEL_SERVER_WORKING_DIRECTORY,
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
async function generateToken(token: string | undefined, size = defaultSize) {
    try {
        let savedTokenHash: string | undefined = localStorage.getItem(configuration.channelServer + '_refresh_token') || undefined

        const tokenHash = await refreshToken(
            configuration.configServerType === 'local',
            size,
            token || savedTokenHash);

        if (savedTokenHash !== tokenHash) {
            localStorage.setItem(configuration.channelServer + '_refresh_token', tokenHash)
            console.log("++++++++ Generated new token for channel creation ++++++++")
            console.log(tokenHash)
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
        }

        // console.log("Token refresh succeeded, will now create a channel. Token hash:", tokenHash, "(will pause 1 second)")
        // // wait/sleep just a little bit
        // await new Promise((resolve) => setTimeout(resolve, 1000))
        // if (tokenHash) {
        //     await simpleCreateChannel(tokenHash)
        // } else {
        //     console.log("Skipping rest of token creation because token refresh failed")
        // }
        // console.log("It all worked; we were using token hash:", tokenHash)

        console.log(SEP, "Token refresh (creation) succeeded:", tokenHash, SEP)


    } catch (error: any) {
        console.warn("Looks like we could not run token refresh.")
    }
}
    
await new Command()
    .name("refresh.token.ts")
    .version("1.0.0")
    .description(`
        Refreshes (and if needed creates) a storage token. Defaults to ${defaultSize} bytes.
        Maintains a 'global' hash that can be refreshed, unless you override with a specific token.
        This needs to be run from the channel server directory (requires wrangler authentication).
    `)
    .option("-s, --size <size:number>", "Specifies desired token size (optional).", { required: false })
    .option("-t, --token <token:string>", "Force using this token hash (optional).", { required: false })
    .action(async ({ token, size }) => {
        await generateToken(token, size);
    })
    .parse(Deno.args);
    