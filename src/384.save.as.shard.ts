#!/usr/bin/env -S deno run --allow-all

import { Command } from 'jsr:@cliffy/command@1.0.0-rc.4';

// Dynamic imports, to handle our environment and config possibly living in different places
const UTILS_PATH = new URL("./utils.lib.ts", import.meta.url).pathname
const { 
    SEP, DEFAULT_CHANNEL_SERVER, URL_FOR_384_ESM_JS
} = await import(UTILS_PATH);

// @deno-types="./384.esm.d.ts"
// import { ChannelApi, version } from "../lib/384.esm.js"
const { ChannelApi, version } = await import(URL_FOR_384_ESM_JS);

async function uploadFile(
    server: string,
    filePath: string,
    budgetKey: string,
    minimal: boolean = false
) {
    // Read and upload file
    const data = await Deno.readFile(filePath);
    const bytes = new Uint8Array(data.buffer);

    let SB = new ChannelApi(server)

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
    .name("384.save.as.shard.ts")
    .version("1.0.0")
    .description("Uploads a file to the specified channel using the provided budget key.")
    .option("-s, --server <server:string>", "(optional) Channel server to use", { default: DEFAULT_CHANNEL_SERVER })
    .option("-k, --key <key:string>", "Budget channel private key", { required: true })
    .option("-f, --file <file:string>", "File path to upload", { required: true })
    .option("-m, --minimal", "Only output minimal handle data", { default: false })
    .action(async ({ server, file, key, minimal }) => {
        try {
            await uploadFile(server, file, key, minimal);
        } catch (error) {
            console.error("Error uploading file:", error.message);
            Deno.exit(1);
        }
    })
    .parse(Deno.args);

