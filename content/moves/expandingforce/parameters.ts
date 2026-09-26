/**
 * 广域战力 / expandingforce —— 参数、伤害段与场地读取。
 *
 * 核心念头：把精神力量压进所选地面，在落点摊开一片「精神场地」；站进自己铺的场地再放时，
 * 脚下的场地被吸收，波从施法者身上炸开、覆盖贴身所有敌人，威力更高，并在脚下重新铺一片。
 * 场地用共享场地身份 `world_combat:field/psychicterrain`（`StatusVocabulary.fieldId`），
 * 用 `WorldEffects.field` 租借寿命，到期自己结束；里面的敌对落地单位被压得脚步发沉。
 * 场地的持续表现由场地效果自己的 `scan` 用 `WorldFeedback.onEffect` 绑在这条效果上，
 * 所以被吸收或驱散时画面随效果立即结束，不留旧尾。
 *
 * 数值来源：原生 Psychic/特殊 80/命中 100/单体；精神地形上威力 ×1.5 且改为攻击所有相邻对手。
 * 「是精神地形」由「脚下有没有本招铺下的场地」读取；威力成长与范围由特攻、体型、等级派生。
 */
namespace PokemonSkills {
    export const EXPANDINGFORCE_FIELD = StatusVocabulary.fieldId("psychicterrain");
    /** 共享语义身份：本招铺下的地面与四方精神场地、精神 surge 特性互相可读。 */
    export const EXPANDINGFORCE_IDENTITY = WorldEffects.terrain("psychicterrain");
    export const EXPANDINGFORCE_SCENE = "world_combat:move_expandingforce";
    WorldEffects.fieldRule(EXPANDINGFORCE_FIELD + "/expandingforce", {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            var body = world.observe(actor);
            if (!body || !body.grounded())
                return;
            if (!world.friendly(actor))
                world.marker(actor, "minecraft:slowness", 30, 0);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.onEffect(world, effect.id(), "world_combat:move_expandingforce/field", EXPANDINGFORCE_SCENE, 1,
                WorldCombat.point(field.position[0], field.position[1], field.position[2]),
                { moment: "field", radius: field.radius, scale: field.radius / 3.0 });
        }
    }, { identity: EXPANDINGFORCE_IDENTITY, tags: [WorldEffects.categories.terrain] });
    actionParameters.define("expandingforce", {
        // 精神冲击的强度：特攻越高越强。
        power: formula(
            F.base(80).plus(F.stat("specialAttack").minus(60).max(0).times(0.2)).clamp(48, 150).round(1),
            "威力", { unit: "威力", description: "在精神场地上由本招另行 ×1.5。" }),
        // 引爆范围：特攻与体型共同决定贴身波及多远。
        burst: formula(
            F.base(3.2).plus(F.stat("specialAttack").minus(60).max(0).times(0.01)).plus(F.body("height").minus(1.4).max(0).times(0.6)).clamp(2.4, 5.5).round(2),
            "引爆半径", { unit: " 格", description: "只有吸收了精神场地时才用这个半径。" }),
        // 铺开的场地半径：特攻越高，压出的地面越广；普通施放的局部冲击同样落在这个半径内。
        fieldRadius: formula(
            F.base(3.0).plus(F.stat("specialAttack").minus(60).max(0).times(0.01)).clamp(2.2, 5.0).round(2),
            "场地半径", { unit: " 格", description: "落点铺开的精神场地大小，也是普通施放局部冲击的半径。" }),
        // 场地寿命：等级越高留得越久。
        fieldTicks: seconds(
            F.base(160).plus(F.level().minus(20).max(0).times(2)).clamp(120, 320),
            "场地持续", "到期后场地自行结束，由效果运行时收回。"),
        empower: hidden(1.5)
    });
    defineDamage("expandingforce", "power", { defenceCoefficient: 0.0048, rationale: "精神冲击对防御穿透略强，让特攻差更明显。" }, {});
    describe("expandingforce", [
        { key: "description.0", values: ["power", "fieldRadius"] },
        { key: "description.1", values: ["fieldRadius","fieldTicks"] },
        { key: "description.2", values: ["burst"] },
        { key: "timing", values: ["range","prepare","recover","cooldown"] }
    ]);
}
