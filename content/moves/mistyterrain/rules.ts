/**
 * 薄雾场地 / mistyterrain 的雾场规则、异常门禁与龙伤削减，对所有战斗者一致。
 *
 * 薄雾是一条区域规则：每 5 刻扫描半径内、与场地同层且贴地（`WorldEffects.groundedContact`）的活体，给他们补
 *   `world_combat:mistyterrain_ground`（身份 `world_combat:status/mistyterrain`）。护体的资格每 5 刻重算，离地或离开雾即撤。
 *   保护不靠这枚标记的余寿：异常门禁与龙伤结算都用 `WorldEffects.covers` 实时确认「此刻确实站在一片薄雾里且贴地」。
 *   于是共享的**有害**异常施加被 `CombatStatus.gate` 拒绝，有益与中性效果照常通过；龙属性来招的伤害在入场结算时乘
 *   `dragon`（原生 ×0.5）。开启净化时，雾在活体首次进入本次雾时洗掉已有的有害状态效果一次——之后持续只按正常防异常
 *   拒绝新的有害状态，退出再入不再触发，避免反复清场。
 */
namespace PokemonSkills {
    /** 护体标记的刷新窗口：扫描间隔 5 刻，留一点余量避免闪断；离场或离地由规则立即撤。 */
    const mistyterrainMarkTicks = 20;

    function mistyPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 洗掉身上所有有害状态效果；返回是否洗掉了任何一样。 */
    function mistyCleanse(world: CombatWorld, actor: CombatActor): boolean {
        return CombatStatus.cureHarmful(world, actor) > 0;
    }

    /** 实时事实：此刻是否真的站在一片薄雾里且贴地；门禁与龙伤削弱的唯一资格。 */
    function mistyCovered(world: CombatWorld, actor: CombatActor): boolean {
        const areas = WorldEffects.areas(world, mistyterrainField);
        for (let i = 0; i < areas.length; i++) if (WorldEffects.covers(world, areas[i], actor)) return true;
        return false;
    }

    /** 只给在场且接地者补护体；离地或观察不到就撤标记。返回是否被护住。 */
    function mistyTouch(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        const body = world.observe(actor);
        if (body === null || !body.grounded()) { MobEffects.consume(world, actor, mistyterrainGround); return false; }
        MobEffects.apply(world, actor, mistyterrainGround, mistyterrainMarkTicks, 0);
        if (Number(field.data.purify) > 0) {
            // 每块雾、每个活体只在首次进入时净化一次；`cleansed` 随场地数据保存，退出再入不再触发。
            const cleansed = field.data.cleansed || (field.data.cleansed = {});
            const ref = String(actor.ref());
            if (!cleansed[ref]) {
                cleansed[ref] = 1;
                if (mistyCleanse(world, actor)) {
                    WorldFeedback.emit(world, mistyterrainScene, 1, body.position(), { moment: "cleanse", target: ref }, 26);
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), mistyterrainCleanseText, [], 26);
                }
            }
        }
        return true;
    }

    WorldEffects.fieldRule(mistyterrainField, {
        // 纯资格：只有与场地同层且真实贴地的活体才算在场；`covers` 复用同一条件，楼上的身体不算。
        accepts: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
            return WorldEffects.groundedContact(world, actor, field, 1);
        },
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
            WorldFeedback.onEffect(world, effect.id(), "world_combat:move_mistyterrain/field", mistyterrainScene, 1, centre,
                { moment: "field", density: field.data.density || 26, scale: field.radius / 3.2 });
        }
    }, { identity: WorldEffects.terrain("mistyterrain"), tags: [WorldEffects.categories.terrain] });

    // 雾里的**接地**活体不再陷入有害状态效果：共享施加被拒绝（对宝可梦、原版生物、玩家一致）；有益与中性效果通过。
    CombatStatus.gate.define({ id: "world_combat:move_mistyterrain/gate", apply: function (context) {
        if (!context.allowed || !context.harmful) return;
        const world = context.world, actor = context.actor;
        if (!world.valid(actor) || !mistyCovered(world, actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        context.allowed = false; context.reason = "misty-terrain";
        WorldFeedback.emit(world, mistyterrainScene, 1, body.position(), { moment: "ward", target: String(actor.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), mistyterrainWardText, [], 22);
    } });

    // 龙属性来招被雾削掉一半：目标此刻真的站在雾里且贴地才减半，与施法者无关。
    NativeEffects.incomingRules.define({ id: "world_combat:move_mistyterrain/veil", apply: function (hit) {
        const data = hit.data;
        if (!data || data.kind !== "move" || !(data.amount > 0)) return;
        if (String(data.type).toLowerCase() !== "dragon") return;
        const world = hit.world, target = hit.target;
        if (!world.valid(target) || !mistyCovered(world, target)) return;
        const body = world.observe(target);
        if (body === null) return;
        data.amount *= 0.5;
        WorldFeedback.emit(world, mistyterrainScene, 1, body.position(),
            { moment: "veil", target: String(target.ref()), dragon: 1 }, 22);
    } });
}
