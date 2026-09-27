/**
 * 广域战力 / expandingforce —— 参数、伤害段与精神场地读取。
 *
 * 核心念头：把精神力量压进所选地面，以选定点为中心向外推出一圈短波——普通施放是一记较小的定点精神冲击；
 *   若释放时**真的脚踏实地站在一片有效的精神场地上**（敌我铺的都可以），这一次改为更宽、威力 ×1.5 的增强冲击。
 *   冲击以 6 刻从中心向外扩展，每个敌人只挨一次，结束后不留残留场地、也不减速。
 *
 * 精神场地用共享场地身份 `world_combat:terrain/psychicterrain` 读取：本招不再自产场地，只借现成的。
 * 场地自身的超能增幅由共享规则（`world_combat:move_psychicterrain/power`）按施法者所站那片场实时计算，
 * 与本招的 ×1.5 一起体现在命中结算里；详情页显示本招一侧的理论威力与半径。
 *
 * 数值来源：原生 Psychic/特殊 80/命中 100/单体；精神地形上威力 ×1.5 且改为攻击所有相邻对手。
 *   威力成长与半径由特攻、体型、等级派生；是否增强由释放时脚下是否真实覆盖精神场地决定。
 */
namespace PokemonSkills {
    /** 共享语义身份：本招读取的、由灵能场地/精神 surge 特性铺下的地面。 */
    export const EXPANDINGFORCE_IDENTITY = WorldEffects.terrain("psychicterrain");
    export const EXPANDINGFORCE_SCENE = "world_combat:move_expandingforce";
    actionParameters.define("expandingforce", {
        // 精神冲击的强度：特攻越高越强。
        power: formula(
            F.base(80).plus(F.stat("specialAttack").minus(60).max(0).times(0.2)).clamp(48, 150).round(1),
            "威力", { unit: "威力", description: "站在有效精神场地上释放时由本招另行 ×1.5，精神场地自身的振幅按共享规则另算。" }),
        // 增强冲击半径：真实踩在精神场地上时使用，特攻与体型共同决定贴身波及多远。
        burst: formula(
            F.base(3.2).plus(F.stat("specialAttack").minus(60).max(0).times(0.01)).plus(F.body("height").minus(1.4).max(0).times(0.6)).clamp(2.4, 5.5).round(2),
            "增强半径", { unit: " 格", description: "真实踩在有效精神场地上时的冲击半径，比普通冲击更宽。" }),
        // 普通冲击半径：原场地半径收为其 0.55，至少 1 格，避免无条件远程大圈。
        radius: formula(
            F.base(3.0).plus(F.stat("specialAttack").minus(60).max(0).times(0.01)).clamp(2.2, 5.0)
                .times(0.55).clamp(1, 2.75).round(2),
            "冲击半径", { unit: " 格", description: "普通施放时定点冲击的半径；站在有效精神场地上改为增强半径。" }),
        empower: hidden(1.5)
    });
    defineDamage("expandingforce", "power", { defenceCoefficient: 0.0048, rationale: "精神冲击对防御穿透略强，让特攻差更明显。" }, {});
    describe("expandingforce", [
        { key: "description.0", values: ["power", "radius"] },
        { key: "description.1", values: ["burst"] },
        { key: "description.2", values: [] },
        { key: "timing", values: ["range","prepare","recover","cooldown"] }
    ]);
}
