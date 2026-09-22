/**
 * 薄雾场地 / mistyterrain 的雾场规则、异常门禁与龙伤削减，对所有战斗者一致。
 *
 * 薄雾是一条区域规则：每 5 刻扫描半径内、贴地（grounded）的活体，给他们补 `world_combat:mistyterrain_ground`
 *   （身份 `world_combat:status/mistyterrain`）。带该身份者：共享的异常施加被 `CombatStatus.gate` 拒绝；
 *   龙属性来招的伤害在入场结算时乘 `dragon`（原生 ×0.5）。开启净化时，雾还会把已有的主异常洗掉。
 */
namespace PokemonSkills {
    function mistyPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 洗掉身上所有主异常；返回是否洗掉了任何一样。 */
    function mistyCleanse(world: CombatWorld, actor: CombatActor): boolean {
        let changed = false;
        for (let i = 0; i < StatusVocabulary.majorNames.length; i++)
            if (CombatStatus.cure(world, actor, StatusVocabulary.majorNames[i])) changed = true;
        return changed;
    }

    function mistyTouch(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        const body = world.observe(actor);
        if (body === null || !body.grounded()) return false;
        MobEffects.apply(world, actor, mistyterrainGround, Math.max(40, Math.round(Number(field.data.mark) || 60)) + 20, 0);
        if (Number(field.data.purify) > 0 && mistyCleanse(world, actor)) {
            WorldFeedback.emit(world, mistyterrainScene, 1, body.position(), { moment: "cleanse", target: String(actor.ref()) }, 26);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), mistyterrainCleanseText, [], 26);
        }
        return true;
    }

    WorldEffects.fieldRule(mistyterrainField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!mistyTouch(world, actor, field)) return;
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, mistyterrainScene, 1, body.position(),
                { moment: "jolt", target: String(actor.ref()), surge: Math.round(Number(field.data.surge) || 10) }, 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            mistyTouch(world, actor, field);
        },
        leave: function (world: CombatWorld, actor: CombatActor): void {
            MobEffects.consume(world, actor, mistyterrainGround);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = mistyPoint(field);
            WorldFeedback.keep(world, "world_combat:move_mistyterrain/field/" + effect.id(), mistyterrainScene, 1, centre,
                { moment: "field", density: field.data.density || 26, scale: field.radius / 3.2 }, 20);
        }
    }, { identity: WorldEffects.terrain("mistyterrain"), tags: [WorldEffects.categories.terrain] });

    // 雾里的活体不再陷入主异常：共享施加被拒绝（对宝可梦、原版生物、玩家一致）。
    CombatStatus.gate.define({ id: "world_combat:move_mistyterrain/gate", apply: function (context) {
        if (!context.allowed) return;
        const world = context.world, actor = context.actor;
        if (!world.valid(actor) || !CombatStatus.has(world, actor, mistyterrainStatus)) return;
        context.allowed = false; context.reason = "misty-terrain";
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, mistyterrainScene, 1, body.position(), { moment: "ward", target: String(actor.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), mistyterrainWardText, [], 22);
    } });

    // 龙属性来招被雾削掉一半：目标身上有雾身份就减半，与施法者无关。
    NativeEffects.incomingRules.define({ id: "world_combat:move_mistyterrain/veil", apply: function (hit) {
        const data = hit.data;
        if (!data || data.kind !== "move" || !(data.amount > 0)) return;
        if (String(data.type).toLowerCase() !== "dragon") return;
        const world = hit.world, target = hit.target;
        if (!world.valid(target) || !CombatStatus.has(world, target, mistyterrainStatus)) return;
        data.amount *= 0.5;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, mistyterrainScene, 1, body.position(),
            { moment: "veil", target: String(target.ref()), dragon: 1 }, 22);
    } });
}
