/**
 * 电气场地 / electricterrain 的电场规则与属性结算，对所有战斗者一致。
 *
 * 电场是一条区域规则：每 5 刻扫描半径内、贴地（grounded）的活体，给他们补 `world_combat:electricterrain_ground`
 * （身份 `world_combat:status/electricterrain`）。带该身份的活体：电属性招式威力 ×1.3；
 * 共享的入睡被 `CombatStatus.gate` 拒绝（脚下的电荷撑着不让睡着），若已经睡着则被电醒。
 * 属性改写放在 `PokemonDamage.metadata`，结算前对任何来源的招式生效。
 */
namespace PokemonSkills {
    function electricPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    function electricCharge(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        var body = world.observe(actor);
        if (body === null || !body.grounded()) return false;
        MobEffects.apply(world, actor, electricGround, Math.max(40, Math.round(Number(field.data.wake) || 60)) + 20, 0);
        return true;
    }

    WorldEffects.fieldRule(electricField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!electricCharge(world, actor, field)) return;
            var body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, electricScene, 1, body.position(),
                { moment: "jolt", target: String(actor.ref()), surge: Math.round(Number(field.data.surge) || 10) }, 20);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), electricChargeText, [], 20);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            electricCharge(world, actor, field);
            if (!CombatStatus.has(world, actor, "sleep")) return;
            CombatStatus.cure(world, actor, "sleep");
            var body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, electricScene, 1, body.position(), { moment: "awake", target: String(actor.ref()) }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), electricAwakeText, [], 22);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            var centre = electricPoint(field);
            WorldFeedback.keep(world, "world_combat:move_electricterrain/field/" + effect.id(), electricScene, 1, centre,
                { moment: "field", density: field.data.density || 26, scale: field.radius / 3, surge: field.data.surge || 10 }, 20);
        }
    }, { identity: WorldEffects.terrain("electricterrain"), tags: [WorldEffects.categories.terrain] });

    // 脚下的电荷不让睡着：共享的睡眠施加被拒绝（对宝可梦、原版生物、玩家一致）。
    CombatStatus.gate.define({ id: "world_combat:move_electricterrain/awake", apply: function (context) {
        if (!context.allowed || CombatStatus.normalize(context.name) !== "sleep") return;
        if (!CombatStatus.has(context.world, context.actor, "electricterrain")) return;
        context.allowed = false; context.reason = "electric-terrain-awake";
    } });

    PokemonDamage.metadata.define({ id: "world_combat:move_electricterrain/power", apply: function (context) {
        if (!context.world || !context.actor || !(context.metadata.power > 0)) return;
        if (!CombatStatus.has(context.world, context.actor, "electricterrain")) return;
        if (String(context.metadata.type).toLowerCase() === "electric") context.metadata.power *= 1.3;
    } });
}
