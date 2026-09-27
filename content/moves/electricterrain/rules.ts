/**
 * 电气场地 / electricterrain 的电场规则与属性结算，对所有战斗者一致。
 *
 * 电场是一条区域规则：每 5 刻扫描半径内、与落点同一层且贴地（grounded）的活体，给他们补 `world_combat:electricterrain_ground`
 * （身份 `world_combat:status/electricterrain`）。「在场」由 `fieldRule.accepts` 的 groundedContact 统一限定：楼上平台、
 * 腾空者或墙后都不算。这份余电只做一件事：共享的入睡被 `CombatStatus.gate` 拒绝，若已经睡着则被电醒——离开电场后按剩余时间消退。
 *
 * 电属性招式的 ×1.3 不再看余电身份，而是每段伤害结算时实时确认「施法者本人此刻就站在一片真实电场里且接地」（WorldEffects.covers），
 * 离场、腾空或场地到期后立即失去加成，不再靠 40–180 刻的余电继续吃满伤害。
 * 属性改写放在 `PokemonDamage.metadata`，结算前对任何来源的招式生效。
 */
namespace PokemonSkills {
    function electricPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 施法者此刻是否真的站在一片电气场地内（贴地、同层、无遮挡）；电招加成的唯一条件。 */
    function electricOnField(world: CombatWorld, actor: CombatActor): boolean {
        var areas = WorldEffects.areas(world, electricField);
        for (var i = 0; i < areas.length; i++) if (WorldEffects.covers(world, areas[i], actor)) return true;
        return false;
    }

    function electricCharge(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        var body = world.observe(actor);
        if (body === null || !body.grounded()) return false;
        MobEffects.apply(world, actor, electricGround, Math.max(40, Math.round(Number(field.data.wake) || 60)) + 20, 0);
        return true;
    }

    WorldEffects.fieldRule(electricField, {
        // 只把与落点同层、真正接地的活体当作在场：楼上平台或腾空者带电不成立，也不吃电招加成。
        accepts: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
            return WorldEffects.groundedContact(world, actor, field, 1);
        },
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!electricCharge(world, actor, field)) return;
            var body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, electricScene, 1, body.position(),
                { moment: "jolt", target: String(actor.ref()), surge: Math.round(Number(field.data.surge) || 10) }, 20);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), electricChargeText, [], 20);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            // 只有真正贴地并领到电荷的人才会被电醒；腾空/离地的身体不醒。
            if (!electricCharge(world, actor, field)) return;
            if (!CombatStatus.has(world, actor, "sleep")) return;
            CombatStatus.cure(world, actor, "sleep");
            var body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, electricScene, 1, body.position(), { moment: "awake", target: String(actor.ref()) }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), electricAwakeText, [], 22);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            // 场地表现挂在场地效果本身（presentOn）：场地到期/被驱散时表现随拥有者一起释放，不留短尾。
            var centre = electricPoint(field);
            WorldFeedback.onEffect(world, effect.id(), "world_combat:move_electricterrain/field", electricScene, 1, centre,
                { moment: "field", density: field.data.density || 26, scale: field.radius / 3, surge: field.data.surge || 10 });
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
        if (String(context.metadata.type).toLowerCase() !== "electric") return;
        if (!electricOnField(context.world, context.actor)) return;
        context.metadata.power *= 1.3;
    } });
}
