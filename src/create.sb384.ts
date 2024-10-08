#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env

import '../env.js'
import '../config.js'

// @deno-types="../dist/384.esm.d.ts"
import { SB384 } from "../dist/384.esm.js"

import { SEP } from "./utils.lib.ts"

import { Command } from "https://deno.land/x/cliffy/command/mod.ts";

async function newUser(privateKey?: string) {
    let newUser:SB384
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
        console.log(SEP, "Reminder: all you need is the userPrivateKey, try:", '\n', `create.sb384.ts -k ${newUser.userPrivateKey}`, SEP)

}

await new Command()
    .name("create.sb384.ts")
    .version("1.0.0")
    .description(`
        Creates a fresh sb384 object. Optionally you can provide the private
        key string for an existing user, in which case you'll get it parsed
        into the various formats.
    `)
    .option("-k, --key <key:string>", "(Optional) Use this private key instead of creating a new one.", { required: false })
    .action(async ({ key }) => {
        await newUser(key);
    })
    .parse(Deno.args);
