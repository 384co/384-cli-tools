#!/usr/bin/env -S deno run --allow-all

import '../env.js'
import '../config.js'

// @deno-types="../dist/384.esm.d.ts"
import { ChannelApi, version } from "../dist/384.esm.js"
import { Command } from "https://deno.land/x/cliffy/command/mod.ts";

const SEP = '\n' + '='.repeat(60) + '\n';

let SB = new ChannelApi(configuration.channelServer, configuration.DBG)

async function uploadFile(
    filePath: string,
    budgetKey: string,
    minimal: boolean = false
) {
    // Read and upload file
    const data = await Deno.readFile(filePath);
    const bytes = new Uint8Array(data.buffer);

    // do the store, wait for it to complete (which is when verification resolves)
    const budgetChannel = SB.connect(budgetKey)
    const fullHandle = await SB.storage.storeData(bytes, budgetChannel)
    await fullHandle.verification

    console.log(SEP, "Complete (full) handle:", SEP, fullHandle, SEP);

    if (minimal) {
        let reducedHandle = {
            version: fullHandle.version, // ... this one is debatable
            id: fullHandle.id,
            key: fullHandle.key,
            verification: fullHandle.verification,
            storageServer: fullHandle.storageServer,
        };
        console.log(SEP, "Trimmed from 'full' handle to minimal:", SEP, reducedHandle, SEP);
        let minimalHandle = {
            id: fullHandle.id,
            key: fullHandle.key,
        };
        console.log(SEP, "... though in principle, you only need:", SEP, minimalHandle, SEP);
        return minimalHandle
    } else {
        return fullHandle;
    }
}

await new Command()
    .name("save.as.shard.ts")
    .version("1.0.0")
    .description("Uploads a file to the specified channel using the provided budget key.")
    .option("-k, --key <key:string>", "Budget channel private key", { required: true })
    .option("-f, --file <file:string>", "File path to upload", { required: true })
    .option("-m, --minimal", "Only output minimal handle data", { default: false })
    .action(async ({ file, key, minimal }) => {
        try {
            await uploadFile(file, key, minimal);
        } catch (error) {
            console.error("Error uploading file:", error.message);
            Deno.exit(1);
        }
    })
    .parse(Deno.args);


// #!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env

// import '../env.js'
// import '../config.js'

// // @deno-types="../dist/384.esm.d.ts"
// import * as __ from "../dist/384.esm.js"

// const SB = new __.ChannelApi(configuration.channelServer, false)
// const budgetChannel =  SB.connect(configuration.budgetKey)

// const filePath = Deno.args[0]
// if (!filePath)
//     throw new Error("Usage: <command> <file> [<channel>] ... you missed file")

// let channelId;
// if (Deno.args.length >= 2) {
//     channelId = Deno.args[1]
// } else {   
//     channelId = Deno.env.get("SB384_DEFAULT_CHANNEL")
//     if (!channelId)
//         throw new Error("No channel provided, and 'SB384_DEFAULT_CHANNEL' is not set")
// }

// const data = await Deno.readFile(filePath);
// const bytes = new Uint8Array(data.buffer);

// const handle = await SB.storage.storeData(bytes, budgetChannel)
// await handle.verification

// handle.fileName = filePath
// handle.dateAndTime = new Date().toISOString()
// handle.storageServer = configuration.channelServer

// // we want the file system last modified date
// const fileStatLastModified = (await Deno.stat(filePath)).mtime?.getTime()
// if (fileStatLastModified) handle.lastModified = fileStatLastModified

// const SEP = '='.repeat(60)
// console.log(SEP)
// console.log("Here is the whole handle:")
// console.log(SEP)
// console.log(handle)
// console.log(SEP)

// const minimalHandle = {
//     id: handle.id,
//     key: handle.key,
//     verification: handle.verification,
//     storageServer: handle.storageServer,
// }

// console.log("Note that strictly speaking you'll only need:")
// console.log(SEP)
// console.log(minimalHandle)
// console.log(SEP)