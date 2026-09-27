/**
 * 精神场地 / psychicterrain 的场地规则、超能增幅与接地稳定，对所有战斗者一致。
 *
 * 精神域是一条区域规则：每 5 刻扫描半径内、与场地同层且贴地（`WorldEffects.groundedContact`）的活体，给他们补
 *   `world_combat:psychicterrain_ground`（身份 `world_combat:status/psychicterrain`）。资格每 5 刻重算，离地或离开精神域即撤。
 * 保护与增幅都按 `WorldEffects.covers` 实时确认「此刻确实站在一片精神域里且贴地」，不看标记余寿：
 *   带资格者受到的击退、冲量与位移（原生 `world_combat:knockback_incoming` 桥接，覆盖原生击退、`hitImpulse`、`hitDisplace`）
 *   在一次结算里保留一半——多片场也只减一次；原生抗击退属性在这之后照常结算一次。
 *   带资格者超能力招式威力按**自己所站那片场**的 boost 提高。
 */
namespace PokemonSkills {
    /** 护场标记的刷新窗口：扫描间隔 5 刻，留一点余量避免闪断；离地或离场由规则立即撤。 */
    const psychicterrainMarkTicks = 20;
    /** 站定者受到位移后保留的比例：实际抵消一半，多片场不叠乘。 */
    const psychicterrainBuffer = 0.5;

    function psychicPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 实时事实：此刻真的站在一片精神域里且贴地；护场与增幅的唯一资格。 */
    function psychicCovered(world: CombatWorld, actor: CombatActor): boolean {
        const areas = WorldEffects.areas(world, psychicterrainField);
        for (let i = 0; i < areas.length; i++) if (WorldEffects.covers(world, areas[i], actor)) return true;
        return false;
    }

    /** 自己所站那几片场里最高的 boost；没有覆盖自己的场时返回 0（不改写威力）。 */
    function psychicBoostAt(world: CombatWorld, actor: CombatActor): number {
        const areas = WorldEffects.areas(world, psychicterrainField);
        let best = 0;
        for (let i = 0; i < areas.length; i++) {
            if (!WorldEffects.covers(world, areas[i], actor)) continue;
            const value = Number(areas[i].data && areas[i].data.boost);
            const factor = isFinite(value) && value > 0 ? value : 1.3;
            if (factor > best) best = factor;
        }
        return best;
    }

    function psychicTouch(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        const body = world.observe(actor);
        if (body === null || !body.grounded()) { MobEffects.consume(world, actor, psychicterrainGround); return false; }
        MobEffects.apply(world, actor, psychicterrainGround, psychicterrainMarkTicks, 0);
        return true;
    }

    WorldEffects.fieldRule(psychicterrainField, {
        // 纯资格：只有与场地同层且真实贴地的活体才算在场；`covers` 复用同一条件，楼上的身体不算。
        accepts: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
            return WorldEffects.groundedContact(world, actor, field, 1);
        },
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!psychicTouch(world, actor, field)) return;
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, psychicterrainScene, 1, body.position(),
                { moment: "jolt", target: String(actor.ref()), surge: Math.round(Number(field.data.surge) || 10) }, 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            psychicTouch(world, actor, field);
        },
        leave: function (world: CombatWorld, actor: CombatActor): void {
            MobEffects.consume(world, actor, psychicterrainGround);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            // 场地表现挂在场地效果本身：场地到期/被驱散时表现随拥有者一起释放，不留短尾。
            const centre = psychicPoint(field);
            WorldFeedback.onEffect(world, effect.id(), "world_combat:move_psychicterrain/field", psychicterrainScene, 1, centre,
                { moment: "field", density: field.data.density || 26, scale: field.radius / 3.2, boost: field.data.boost || 1.3 });
        }
    }, { identity: WorldEffects.terrain("psychicterrain"), tags: [WorldEffects.categories.terrain] });

    // 场上的超能招式被增幅：只读此刻覆盖施法者的那片场自己的 boost（护场 ×1.15 不会被别的场的基数吞掉）。
    PokemonDamage.metadata.define({ id: "world_combat:move_psychicterrain/power", apply: function (context) {
        if (!context.world || !context.actor || !(context.metadata.power > 0)) return;
        if (String(context.metadata.type).toLowerCase() !== "psychic") return;
        const factor = psychicBoostAt(context.world, context.actor);
        if (!(factor > 0)) return;
        context.metadata.power *= factor;
    } });

    // 接地稳定：站定者受到的原生位移在一次结算里减半。原生 LivingKnockBackEvent 的桥接统一覆盖原生击退、hitImpulse 与
    // hitDisplace；资格看真实的 covers+贴地，多片场不叠乘，原生命中后段仍照常结算原生抗击退。
    WorldCombat.on("world_combat:move_psychicterrain/buffer", "world_combat:knockback_incoming", "", function (event: CombatWorldEvent) {
        const world = event.world(), target = event.target() || event.actor();
        if (!world.valid(target)) return;
        let data: any;
        try { data = JSON.parse(String(event.data())); } catch (error) { return; }
        const strength = data ? Number(data.strength) : 0;
        if (!(strength > 0) || !isFinite(strength)) return;
        if (!psychicCovered(world, target)) return;
        data.strength = strength * psychicterrainBuffer;
        event.data(JSON.stringify(data));
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, psychicterrainScene, 1, body.position(),
            { moment: "brace", target: String(target.ref()), brace: 1 }, 22);
    });
}
