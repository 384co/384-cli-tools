// (c) 2024, 384 (tm) Inc

export const SEP = '\n' + '='.repeat(86) + '\n'
export const SEP_ = '-'.repeat(86) + '\n'

const HOME_DIR_PATH = Deno.os === 'windows' ? Deno.env.get('USERPROFILE') : Deno.env.get('HOME');
const OS384_PATH = Deno.env.get('OS384_HOME') || HOME_DIR_PATH + '/.os384';
export const OS384_ESM_PATH = Deno.env.get('OS384_ESM_PATH') || `${OS384_PATH}/lib384/384.esm.js`;
export const OS384_CONFIG_PATH = Deno.env.get('OS384_CONFIG_PATH') || `${OS384_PATH}/config.js`;
export const OS384_ENV_PATH = Deno.env.get('OS384_ENV_PATH') || `${OS384_PATH}/env.js`;

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
