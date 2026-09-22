/**
 * 回复封锁 / healblock —— 区域规则与回血闸门，对所有战斗者一致。
 *
 * 主闸：治愈走共享的 `NativeEffects.healing`；带 `world_combat:status/healblock` 身份的活体把回量清零，
 *   于是所有经过共享治疗入口的回复（回复招式、吸取、道具触发的回血）都回不上去。
 * 补漏：少数回血路径（特性、树果一类）直接写世界生命，绕过共享闸门；本单元盯着 `world_combat:actor_changed`，
 *   带身份期间记下生命地板（受伤会把地板压低），任何高于地板的净回升都被按回地板，并画一段「回血被吸走」。
 * 结束：`world_combat:mob_effect_removed` 清掉地板；到期是自己松开，被牛奶／`/effect clear` 清除是硬拔下来。
 * 任何生物都会被套上紫环；回血闸门只对有回血结算的活体成立，对原版生物是纯标记与表现。
 */
namespace PokemonSkills {
    /** 生命地板：带身份者当前「允许的最低生命」，随受伤下移，随回血被按住。 */
    var healBlockFloor: { [ref: string]: number } = Object.create(null);

    // 主闸：共享治疗入口。
    NativeEffects.healing.define({ id: "world_combat:move_healblock/gate", apply: function (context) {
        if (CombatStatus.has(context.world, context.actor, healBlockStatus)) context.amount = 0;
    } });

    /** 套上回复封锁：记下当前生命作为地板，再挂上共享身份的镇环。返回是否落下。 */
    export function healBlockArm(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        var body = world.observe(target);
        if (body === null) return false;
        if (!CombatStatus.apply(world, target, healBlockStatus, healBlockEffect, ticks, 0, { unique: true })) return false;
        healBlockFloor[String(target.ref())] = body.health();
        return true;
    }

    // 补漏：任何高于地板的净回升都被按回地板。
    WorldCombat.on("world_combat:move_healblock/guard", "world_combat:actor_changed", "", function (event) {
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor) || !CombatStatus.has(world, actor, healBlockStatus)) return;
        var body = world.observe(actor);
        if (body === null) return;
        var ref = String(actor.ref()), floor = healBlockFloor[ref];
        if (floor === undefined) { healBlockFloor[ref] = body.health(); return; }
        if (body.health() < floor - 0.001) { healBlockFloor[ref] = body.health(); return; }
        if (body.health() <= floor + 0.001) return;
        var stolen = body.health() - floor;
        world.health(actor, floor - body.health(), "world_combat:healblock");
        var at = world.observe(actor);
        if (at === null) return;
        WorldFeedback.emit(world, healBlockScene, 1, at.position(),
            { moment: "block", target: ref, amount: Math.round(stolen * 10) / 10,
                motes: Math.max(6, Math.min(48, Math.round(stolen * 6))),
                intensity: Math.max(0.6, Math.min(2, stolen / Math.max(1, at.maxHealth()) * 22)) }, 22);
        WorldFeedback.text(world, at.position().plus(WorldCombat.point(0, 1.2, 0)), healBlockTextDenied, [], 22);
        world.sound("minecraft:block.beacon.deactivate", at.position(), 10, "{}");
    });

    // 结束：清地板；到期松开与硬拔下来画面不同。
    WorldCombat.on("world_combat:move_healblock/end", "world_combat:mob_effect_removed", "", function (event) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== healBlockEffect) return;
        var world = event.world(), actor = event.actor();
        delete healBlockFloor[String(actor.ref())];
        if (!world.valid(actor)) return;
        var body = world.observe(actor);
        if (body === null) return;
        var expired = String(data.cause) === "expired";
        WorldFeedback.emit(world, healBlockScene, 1, body.position(),
            { moment: expired ? "release" : "break", target: String(actor.ref()), expired: expired ? 1 : 0 }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)),
            expired ? healBlockTextOpen : healBlockTextBreak, [], 26);
    });
}
