#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env --allow-import

import { Command } from 'jsr:@cliffy/command@1.0.0-rc.4';

// Dynamic imports, to handle our environment and config possibly living in different places
const UTILS_PATH = new URL("./utils.lib.ts", import.meta.url).pathname
const { 
    VERSION, SEP, URL_FOR_384_ESM_JS, DEFAULT_CHANNEL_SERVER
} = await import(UTILS_PATH);

// @deno-types="./384.esm.d.ts"
// import { SB384 } from "../lib/384.esm.js"
const { SB384 } = await import(URL_FOR_384_ESM_JS);

async function newUser(server: string, privateKey?: string) {
    let newUser: typeof SB384
    if (privateKey)
        newUser = await new SB384(privateKey).ready
    else
        newUser = await new SB384().ready

    console.log(SEP, "User info, first in full jwk format (private):", SEP, newUser.jwkPrivate, SEP)
    console.log(SEP, "Next, a few 'perspectives' on the object:", SEP)
    console.log("userId/channelId: ", newUser.userId)
    console.log("userPublicKey:    ", newUser.userPublicKey)
    console.log("userPrivateKey:   ", newUser.userPrivateKey)
    console.log("dehydrated:       ", newUser.userPrivateKeyDehydrated)
    console.log()
    console.log("Notes:")
    console.log("- 'user' in this context just means a root SB384 object")
    console.log("- 'channelId', 'user hash', and 'user ID' are more or less synonyms.")
    console.log("- if you need to store userPublic key anyway, you only")
    console.log("  need the dehydrated version of the private key alongside.")
    if (privateKey)
        console.log(SEP)
    else
        console.log(SEP, "Reminder: all you need is the userPrivateKey, try:", '\n', `384.create.sb384.ts -k ${newUser.userPrivateKey}`, SEP)

}

await new Command()
    .name("384.create.sb384.ts")
    .version(VERSION)
    .description(`
        Creates a fresh sb384 object. Optionally you can provide the private
        key string for an existing user, in which case you'll get it parsed
        into the various formats.
    `)
    .option("-s, --server <server:string>", "(optional) Channel server to use", { default: DEFAULT_CHANNEL_SERVER })
    .option("-k, --key <key:string>", "(Optional) Use this private key instead of creating a new one.", { required: false })
    .action(async ({ server, key }) => {
        await newUser(server, key);
        Deno.exit(0);
    })
    .parse(Deno.args);
