// (c) 2024, 384 (tm) Inc

export const VERSION = "0.1.16"

export const SEP = '\n' + '='.repeat(86) + '\n'
export const SEP_ = '-'.repeat(86) + '\n'

const HOME_DIR_PATH = Deno.os === 'windows' ? Deno.env.get('USERPROFILE') : Deno.env.get('HOME');
export const OS384_PATH = Deno.env.get('OS384_HOME') || HOME_DIR_PATH + '/.os384';
export const OS384_ESM_PATH = Deno.env.get('OS384_ESM_PATH') || `${OS384_PATH}/lib384/384.esm.js`;

export const URL_FOR_LIB384_D_TS="https://c3.384.dev/api/v2/page/u2d23u7w/384.esm.d.ts"
export const URL_FOR_384_ESM_JS="https://c3.384.dev/api/v2/page/7938Nx0wM39T/384.esm.js"

export const DEFAULT_CHANNEL_SERVER = Deno.env.get('OS384_CHANNEL_SERVER') || "https://c3.384.dev"
export const DEFAULT_STORAGE_SERVER = Deno.env.get('OS384_STORAGE_SERVER') || "https://s3.384.dev"

export const CHANNEL_SERVER_HOME_DIRECTORY = Deno.env.get('OS384_CHANNEL_SERVER_HOME')

export function handleErrorOnImportEnv() {
    console.error(
        `Error importing OS384 environment!
        To use this script, you must first set up your OS384 environment in a file named env.js.

        By default, this script will look for the file in your home directory, at ~/.os384/env.js.
        To override this, you can set the environment variable OS384_HOME to the directory where your OS384 environment is stored, or set OS384_ENV_PATH to the path of the env.js file.
        `)
    Deno.exit(1);
}

export function handleErrorOnImportConfig() {
    console.error(
        `Error importing OS384 configuration!
        To use this script, you must first set up your OS384 configuration in a file named config.js.

        By default, this script will look for the file in your home directory, at ~/.os384/config.js.
        To override this, you can set the environment variable OS384_HOME to the directory where your OS384 configuration is stored, or set OS384_CONFIG_PATH to the path of the config.js file.
        `)
    Deno.exit(1);
}

// we have our own mock version of this for test management
export class LocalStorage {
    private filePath: string;
    private data: Record<string, any>;
    constructor(filePath: string) {
        this.filePath = filePath;
        this.data = this.loadData();
    }
    private loadData(): Record<string, any> {
        try {
            const text = Deno.readTextFileSync(this.filePath);
            return JSON.parse(text);
        } catch {
            return {};
        }
    }
    private saveData(): void {
        Deno.writeTextFileSync(this.filePath, JSON.stringify(this.data));
    }
    public getItem(key: string): any {
        return this.data[key];
    }
    public setItem(key: string, value: any): void {
        this.data[key] = value;
        this.saveData();
    }
    public removeItem(key: string): void {
        delete this.data[key];
        this.saveData();
    }
    public clear(): void {
        this.data = {};
        this.saveData();
    }
}
