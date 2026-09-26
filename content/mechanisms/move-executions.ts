/** Once-per-execution commitments; content decides which declared move facts consume its effects. */
namespace MoveExecutions {
    export interface Declaration { world: CombatWorld; actor: CombatActor; action: CombatAction; move: CombatPokemonMove | null; features: PokemonDamage.Features[]; }
    export interface Commit { world: CombatWorld; actor: CombatActor; action: CombatAction | null; metadata: any[]; native: boolean; }
    export var declarations = new WorldContributions.Registry<Declaration>();
    export var committed = new WorldContributions.Registry<Commit>();
    const initialized = "world_combat:execution/committed";
    export function read(world: CombatWorld, key: string): any {
        const data = world.originData(key); return data === null ? null : JSON.parse(String(data));
    }
    export function write(world: CombatWorld, key: string, data: any): void { world.originData(key, JSON.stringify(data)); }
    WorldCombat.on("world_combat:execution/commit", "world_combat:committed", "", event => {
        const action = event.action(), world = event.world();
        if (action === null || !world.originInstance() || read(world, initialized)) return;
        const declaration = declarations.apply({ world: world, actor: event.actor(), action: action,
            move: String(event.actor().domain()) === "cobblemon" ? NativeLoadout.executing(action) : null, features: [] });
        if (declaration.move === null) return;
        const features = declaration.features.length ? declaration.features : [{}];
        const metadata = features.map(value => PokemonDamage.sourceMetadata(world, event.actor(), declaration.move!, value, action));
        write(world, initialized, true);
        committed.apply({ world: world, actor: event.actor(), action: action, metadata: metadata, native: false });
    });
    // Unknown Mod attacks are observed at their native delivery, never guessed to be Normal Pokemon moves.
    NativeEffects.incomingRules.define({ id: "world_combat:execution/native", before: ["world_combat:move_electrify/native", "world_combat:move_charge/discharge"], apply: hit => {
        if (!DamageSemantics.read(hit.data).attack || !hit.world.originInstance() || read(hit.world, initialized)) return;
        write(hit.world, initialized, true);
        committed.apply({ world: hit.world, actor: hit.source, action: null, metadata: [hit.data], native: true });
    } });
}
