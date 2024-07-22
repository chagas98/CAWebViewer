import { PluginCommands } from 'molstar/lib/mol-plugin/commands';
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { arrayDistinct } from 'molstar/lib/mol-util/array';
import { isPlainObject } from 'molstar/lib/mol-util/object';
import { combineUrl } from '../../helpers';


export interface StateGalleryData {
    entity?: {
        [entityId: string]: {
            image: Image[],
            database?: {
                [databaseName: string]: {
                    [domainId: string]: {
                        image: Image[],
                    },
                },
            },
        },
    },
    assembly?: {
        [assemblyId: string]: {
            image: Image[],
            preferred?: boolean,
        },
    },
    entry?: {
        all?: {
            image: Image[],
        },
        bfactor?: {
            image: Image[],
        },
        ligands?: {
            [compId: string]: {
                image: Image[],
                entity?: string,
                number_of_instances?: number,
            },
        },
        mod_res?: {
            [compId: string]: {
                image: Image[],
            },
        },
    },
    validation?: {
        geometry?: {
            deposited?: {
                image: Image[],
            },
        },
    },
    image_suffix?: string[],
    last_modification?: string,
}

interface Image {
    filename: string,
    alt: string,
    description: string,
    clean_description: string,
}


export class StateGalleryManager {
    public readonly images: Image[];

    private constructor(
        public readonly plugin: PluginContext,
        public readonly serverUrl: string,
        public readonly entryId: string,
        public readonly data: StateGalleryData | undefined,
    ) {
        this.images = removeWithSuffixes(listImages(data, true), ['_side', '_top']); // TODO allow suffixes by a parameter, sort by parameter
    }

    static async create(plugin: PluginContext, serverUrl: string, entryId: string) {
        const data = await getData(plugin, serverUrl, entryId);
        console.log('data:', data);
        if (data === undefined) {
            console.error(`StateGalleryManager failed to get data for entry ${entryId}`);
        }
        return new this(plugin, serverUrl, entryId, data);
    }

    async load(filename: string): Promise<void> {
        const url = combineUrl(this.serverUrl, `${filename}.molj`);
        await PluginCommands.State.Snapshots.OpenUrl(this.plugin, { url, type: 'molj' });
    }
}


async function getData(plugin: PluginContext, serverUrl: string, entryId: string) {
    const url = combineUrl(serverUrl, entryId + '.json');
    try {
        const text = await plugin.runTask(plugin.fetch(url));
        const data = JSON.parse(text);
        return data[entryId];
    } catch {
        return undefined;
    }
}

function listImages(data: StateGalleryData | undefined, byCategory: boolean = false): Image[] {
    if (byCategory) {
        const out: Image[] = [];

        // Entry
        out.push(...data?.entry?.all?.image ?? []);
        // Validation
        out.push(...data?.validation?.geometry?.deposited?.image ?? []);
        // Bfactor
        out.push(...data?.entry?.bfactor?.image ?? []);
        // Assembly
        const assemblies = data?.assembly;
        for (const ass in assemblies) {
            out.push(...assemblies[ass].image);
        }
        // Entity
        const entities = data?.entity;
        for (const entity in entities) {
            out.push(...entities[entity].image);
        }
        // Ligand
        const ligands = data?.entry?.ligands;
        for (const ligand in ligands) {
            out.push(...ligands[ligand].image);
        }
        // Modres
        const modres = data?.entry?.mod_res;
        for (const res in modres) {
            out.push(...modres[res].image);
        }
        // Domain
        for (const entity in entities) {
            const dbs = entities[entity].database;
            for (const db in dbs) {
                const domains = dbs[db];
                for (const domain in domains) {
                    out.push(...domains[domain].image);
                }
            }
        }

        // Any other potential images not caught in categories above
        pushImages(out, data);
        return arrayDistinct(out as any) as any;
    } else {
        return pushImages([], data);
    }
}

function pushImages(out: Image[], data: any): Image[] {
    if (isPlainObject(data)) {
        for (const key in data) {
            const value = data[key];
            if (key === 'image' && Array.isArray(value)) {
                out.push(...value);
            } else {
                pushImages(out, value);
            }
        }
    }
    return out;
}

function removeWithSuffixes(images: Image[], suffixes: string[]): Image[] {
    return images.filter(img => !suffixes.some(suffix => img.filename.endsWith(suffix)));
}
