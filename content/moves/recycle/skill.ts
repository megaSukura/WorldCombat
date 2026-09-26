/** Restore one confirmed consumed item into an empty held slot, using real nearby material when selected. */
namespace PokemonSkills {
    const recycleScene = "world_combat:move_recycle";
    const recycleDoneText = "world_combat.move.recycle.text.done";
    const recycleFoundText = "world_combat.move.recycle.text.found";
    const recycleEmptyText = "world_combat.move.recycle.text.empty";

    /** 施法者当前是否空手（统一装备读取：宝可梦携带物 / 原版生物与玩家的手）。 */
    export function recycleEmptyHanded(world: CombatWorld, actor: CombatActor): boolean {
        return NativeItems.heldOf(world, actor) === null;
    }

    define({
        id: "recycle",
        name: "回收利用",
        description: "把自己在战斗中消耗掉的持有物重新锻回手里，让它再次可用；记忆只认真实消费的一件，回收成功即清空。空手且记得东西时才能发动，一次只回收一件。",
        uses: ["把战斗中吃掉的树果再生回来", "把自己吃掉的树果重新锻回手中", "在道具耗尽后补回一件继续打"],
        kind: "self",
        range: 0,
        prepare: 9,
        active: 0,
        recover: 5,
        cooldown: 20,
        style: "recycle",
        stationary: true,
        defaults: { scavenge: false, ai: {} },
        fields: [flag("scavenge", "就地取材")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["recycle"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("recycle", "channel", context)), recover: Math.round(p("recycle", "recover", context)),
                cooldown: Math.round(p("recycle", "cooldown", context)), active: 0, range: 0 };
        },
        ready: function (action: CombatAction, config: any): string {
            var actor = action.actor();
            if (!recycleEmptyHanded(action.sense(), actor)) return "already-held";
            return recycleMemory(action.sense(), actor).id ? "" : "no-memory";
        },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            var scavenge = !!(config && config.scavenge);
            action.present("world_combat:recycle:" + action.id(), recycleScene, 1, action.origin(), JSON.stringify({
                moment: "gather", scale: scale, radius: p("recycle", "drawRadius", action),
                motes: Math.round(p("recycle", "motes", action)), scavenge: scavenge ? 1 : 0 }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            var world = action.world(), actor = action.actor();
            var body = world.observe(actor);
            if (body === null) { done(action); return; }
            var scale = (body.width() + body.height()) / 2.3;
            var motes = Math.round(p("recycle", "motes", action));
            var radius = p("recycle", "drawRadius", action);
            var scavenge = !!(config && config.scavenge);
            var memory = recycleMemory(world, actor);
            WorldFeedback.emit(world, recycleScene, 1, body.position(), { moment: "gather", scale: scale, radius: radius,
                motes: motes, scavenge: scavenge ? 1 : 0 }, 24);
            if (!recycleEmptyHanded(world, actor) || !memory.id) {
                WorldFeedback.emit(world, recycleScene, 1, body.position(), { moment: "fizzle", scale: scale }, 20);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), recycleEmptyText, [], 26);
                sound(action, "minecraft:entity.villager.no");
                done(action);
                return;
            }
            var result = recycleRestore(world, actor, memory, scavenge, radius);
            if (result === null) {
                WorldFeedback.emit(world, recycleScene, 1, body.position(), { moment: "fizzle", scale: scale }, 20);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), recycleEmptyText, [], 26);
                sound(action, "minecraft:entity.villager.no");
                done(action);
                return;
            }
            const path = result.found && result.point ? [[result.point.x(), result.point.y(), result.point.z()], String(actor.ref())] : [];
            WorldFeedback.emit(world, recycleScene, 1, body.position(), { moment: "forge", path: path, item: memory.id,
                scale: scale, radius: radius, motes: motes, found: result.found ? 1 : 0, travelMotes: result.found ? motes : 0 }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)),
                result.found ? recycleFoundText : recycleDoneText, [{ key: itemNameKey(memory.id), fallback: memory.id }], 30);
            sound(action, "minecraft:item.trident.return");
            done(action);
        },
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: pokemon ? p("recycle", "drawRadius", pokemon) : 3, geometry: "area", style: "recycle", color: 0xE8C56A, label: "回收范围" };
        }
    });

    /** 物品中文/英文名走原生物品名键：`item.<namespace>.<path>`。 */
    function itemNameKey(id: string): string {
        return "item." + String(id).replace(":", ".");
    }
}
