/**
 * 精神场地 / psychicterrain 的场地规则、超能增幅与先制封锁，对所有战斗者一致。
 *
 * 精神域是一条区域规则：每 5 刻扫描半径内、贴地（grounded）的活体，给他们补 `world_combat:psychicterrain_ground`
 *   （身份 `world_combat:status/psychicterrain`）。带该身份者：超能力招式威力按场上的 boost 提高；
 *   被带优先度（原生 priority > 0）的招式指向时伤害被抹掉——这是「先制招式打不到」的翻译。
 * 增幅在 `PokemonDamage.metadata` 里改写；先制封锁在入场伤害规则里清零。
 */
namespace PokemonSkills {
    function psychicPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    function psychicTouch(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        const body = world.observe(actor);
        if (body === null || !body.grounded()) return false;
        MobEffects.apply(world, actor, psychicterrainGround, Math.max(40, Math.round(Number(field.data.mark) || 60)) + 20, 0);
        return true;
    }

    WorldEffects.fieldRule(psychicterrainField, {
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
            const centre = psychicPoint(field);
            WorldFeedback.keep(world, "world_combat:move_psychicterrain/field/" + effect.id(), psychicterrainScene, 1, centre,
                { moment: "field", density: field.data.density || 26, scale: field.radius / 3.2, boost: field.data.boost || 1.3 }, 20);
        }
    }, { identity: WorldEffects.terrain("psychicterrain"), tags: [WorldEffects.categories.terrain] });

    // 场上的超能招式被增幅：增幅值由场写进 data，多个场取最高。
    PokemonDamage.metadata.define({ id: "world_combat:move_psychicterrain/power", apply: function (context) {
        if (!context.world || !context.actor || !(context.metadata.power > 0)) return;
        if (String(context.metadata.type).toLowerCase() !== "psychic") return;
        if (!CombatStatus.has(context.world, context.actor, psychicterrainStatus)) return;
        let factor = 1.3;
        const areas = WorldEffects.areas(context.world, WorldEffects.terrain("psychicterrain"));
        for (let i = 0; i < areas.length; i++) {
            const value = Number(areas[i].data && areas[i].data.boost);
            if (isFinite(value) && value > factor) factor = value;
        }
        context.metadata.power *= factor;
    } });

    // 场上的活体不会被先制招式打到：带优先度的招式伤害在入场结算时清零（自己指向自己不算）。
    NativeEffects.incomingRules.define({ id: "world_combat:move_psychicterrain/ward", apply: function (hit) {
        const data = hit.data;
        if (!data || data.kind !== "move" || !(data.priority > 0) || !(data.amount > 0)) return;
        const world = hit.world, target = hit.target;
        if (!world.valid(target) || String(hit.source.key()) === String(target.key())) return;
        if (!CombatStatus.has(world, target, psychicterrainStatus)) return;
        data.amount = 0;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, psychicterrainScene, 1, body.position(), { moment: "ward", target: String(target.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), psychicterrainWardText, [], 26);
    } });
}
