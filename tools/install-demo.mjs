import { copyFile, mkdir, readFile } from "node:fs/promises";
import { installContentResources } from "./install-content-resources.mjs";
import { resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = process.argv[2];
const manifest = JSON.parse(await readFile(resolve(root, "content/packs.json"), "utf8"));
const custom = process.argv[3] === '--from' ? process.argv[4] : null;
if (process.argv[3] === '--from' && !custom) throw new Error('Pass a built authoring directory after --from');
const profile = custom ? 'authoring' : process.argv[3] || manifest.defaultProfile;
const testing = !custom && !Object.hasOwn(manifest.profiles, profile);
if (testing && !Object.hasOwn(JSON.parse(await readFile(resolve(root, "tests/content/packs.json"), "utf8")).profiles, profile))
    throw new Error("Unknown content profile: " + profile);
const built = testing ? "build/test-content/profiles" : "build/content/profiles";
const source = custom ? resolve(root, custom) : resolve(root, built, profile);
const sourceRelative = relative(resolve(root, 'build'), source);
if (custom && (!sourceRelative || sourceRelative.startsWith('..') || isAbsolute(sourceRelative))) throw new Error('Authoring build must be inside build');
if (custom) JSON.parse(await readFile(resolve(source, 'content-profile.json'), 'utf8'));
if (!destination) throw new Error("Pass a game directory inside this workspace and optionally a content profile");
const game = resolve(root, destination);
const local = relative(root, game);
if (!local || local.startsWith("..") || isAbsolute(local)) throw new Error("Choose a game directory inside the workspace");
const scripts = resolve(game, "kubejs/server_scripts/worldcombat");
await mkdir(scripts, { recursive: true });
for (const name of ["p1_demo.js", "p1_demo.js.map", "content-profile.json"])
    await copyFile(resolve(source, name), resolve(scripts, name));
process.stdout.write("Installed content profile " + profile + " in " + scripts + "\n");
const client = resolve(game, "kubejs/client_scripts/worldcombat");
await mkdir(client, { recursive: true });
for (const name of ["client.js", "client.js.map"])
    await copyFile(resolve(source, name), resolve(client, name));
await installContentResources(source,game);

const startup = resolve(game, "kubejs/startup_scripts/worldcombat");
await mkdir(startup, { recursive: true });
for (const name of ["startup.js", "startup.js.map"]) await copyFile(resolve(source, name), resolve(startup, name));
