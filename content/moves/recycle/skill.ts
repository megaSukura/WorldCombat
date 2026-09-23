/**
 * 回收利用 / recycle —— 注册与动作。
 *
 * 念头的形状：两幕。
 *   收（windup，提交前）：施法者俯身，碎片与记忆里的那件道具以弧线朝掌心聚拢，浮出一圈等待合拢的收拢环。
 *   成（execute，提交后）：那件已经消耗掉的持有物在掌心重新成形（贴图沿一条归巢弧线飞回手里），
 *       手里落一圈金光，随后的持有物写入让它重新可以被使用；没有可回收的东西时只留下一次空转。
 * 记忆从事件来：本单元的规则盯着 `world_combat:actor_changed`，持有物从「有」变成「空」的那一拍把刚失去的那件
 * 记进个体状态；回收成功即清空，和原生一样一次一件。持有物写入走统一的原生装备事务（按序列化栈 CAS 装入空槽），保留组件。
 * 与同为「持有物」家族的交换招式分开：戏法与掉包换的是两个人手里的东西，回收利用只把自己失去的那件拿回来。
 */
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
        description: "把自己在战斗中消耗掉的持有物重新锻回手里，让它再次可用；记忆记下最近持有的那件，消耗掉后仍然保留，回收成功即清空。空手且记得东西时才能发动，一次只回收一件。",
        uses: ["把战斗中吃掉的树果再生回来", "把被打掉的持有物重新锻回手中", "在道具耗尽后补回一件继续打"],
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
            if (String(actor.domain()) !== "cobblemon") return "no-item";
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
            // 道具从身前（就地取材时正是被吸回的那一件）沿归巢弧线飞回掌心。
            var origin = body.position().plus(WorldCombat.point(0, body.height() * 0.5, 0));
            var delta = body.position().plus(WorldCombat.point(0, body.height() * 0.6, 0)).minus(origin);
            var velocity = (delta.length() < 0.05 ? aim(action) : delta.unit()).scale(0.7);
            var flight = action.projectile(origin, velocity, 0, 0.2, 6, 18, function () { }, function () { },
                JSON.stringify({ item: memory.id, scale: 1, glow: true, spin: true, pierce: 1, homing: { target: String(actor.ref()), turn: 140 } }));
            WorldFeedback.emit(world, recycleScene, 1, body.position(), { moment: "forge", projectile: flight, item: memory.id,
                scale: scale, radius: radius, motes: motes, found: result.found ? 1 : 0 }, 30);
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
