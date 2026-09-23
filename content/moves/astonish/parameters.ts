/**
 * 惊吓 / astonish 的参数与伤害段。
 *
 * 原生事实：Ghost／物理／威力 30／命中 100／PP 15／接触／30% 畏缩（Cobblemon 1.8，152 位学习者）。
 * 翻译：把“用尖叫声等突然惊吓对手”落成一记**没有预警的贴脸尖叫**——起手为 0，当场把尖叫砸在目标脸上；
 * 伤害很轻，值钱的是那一下几乎必然的一滞；**越暗越吓人**（环境亮度低时威力、畏缩几率与持续都抬升）。
 * 它是畏缩家族里唯一瞬发、也是伤害最低的一式：代价是极短射程与很轻的单发。
 *
 * 与同族分开：咬住是钩住拉近、踩踏是沉重的下砸、骨棒是长柄横扫；**只有惊吓在黑暗里更凶**，
 * 玩家凭“它在阴影里才真正吓人”把它读出来。
 *
 * 数值来源（每项依赖不同的精灵数据／现场，分散到不同参数上）：
 *   shriek        尖啸威力 30 + 物攻偏移 + 速度偏移；黑暗 ×1.18；潜吓式 ×0.90、疾呼 ×1.08。
 *   reach         贴近距离 1.3 + 速度偏移；潜吓式减半（原地不动，只对贴身的对手生效）。
 *   burst         惊吓判定半径 0.38 + 身高偏移。
 *   hop           贴身小跳速度 0.6 + 速度偏移。
 *   flinchChance  畏缩几率 0.30 + 速度偏移；黑暗 ×1.18；潜吓式 ×1.25。
 *   flinchTicks   畏缩持续 10 刻；黑暗 +4、潜吓式 +4。
 *   aftercast/recharge 速度决定收招与冷却。
 *
 * 配置 `lurk`（潜吓式）双向取舍：开启＝原地不动、几乎不扑近，但畏缩更久更易、伤得更轻、收招与冷却更长；
 * 关闭＝疾呼，稍稍扑近、出手利落、单发略高。两个方向各有适用局面（控制 vs 抢节奏）。
 *
 * 伤害段 `shriek` 与参数同名，走共享换算（原生类别 Physical，Ghost 属性）；接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    /** 环境昏暗（方块光 < 7）；未知一律按暗处理，让没有现场数据的悬浮说明也偏保守。 */
    const astonishDark: Formula.Node = F.world("blockLight", text("worldcombat.skill.astonish.value.darkness")).lt(7);

    actionParameters.define("astonish", {
        /** 尖啸威力：攻击每比 50 多 1 加 0.26（上限 +28），速度每比 55 快 1 加 0.08（上限 +10）；
         *  黑暗 ×1.18；潜吓 ×0.90 / 疾呼 ×1.08；夹在 16..74。 */
        shriek: formula(
            F.base(30).plus(F.stat("attack").minus(50).times(0.26).clamp(-12, 28))
                .plus(F.stat("speed").minus(55).times(0.08).clamp(-3, 10))
                .times(F.when(astonishDark, F.const(1.18), F.const(1)))
                .times(F.when(F.pref("lurk", text("worldcombat.skill.astonish.preference.lurk")), F.const(0.90), F.const(1.08)))
                .clamp(16, 74).round(1),
            "尖啸威力", {
                unit: "威力",
                description: "贴脸尖叫这一下的基础威力；物攻给出声势、速度让它更突然。环境越暗越吓人。对手防御、相性与暴击在命中时另算。"
            }),
        /** 贴近距离：基础 1.3 格，速度每比 55 快 1 加 0.012（上限 +0.7）；潜吓 ×0.5 / 疾呼 ×1；夹在 0.5..2.2。 */
        reach: formula(
            F.base(1.3).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.2, 0.7))
                .times(F.when(F.pref("lurk", text("worldcombat.skill.astonish.preference.lurk")), F.const(0.5), F.const(1)))
                .clamp(0.5, 2.2).round(2),
            "贴近距离", {
                unit: "格",
                description: "施法者最多靠近到多近才把尖叫砸出去，也是本招的实际射程来源；潜吓式几乎不扑近，只够贴身的对手。"
            }),
        /** 惊吓判定：基础 0.38 格，碰撞箱每比 1.4 高 1 格加 0.12（上限 +0.25）；夹在 0.3..0.65。 */
        burst: formula(
            F.base(0.38).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.05, 0.25)).clamp(0.3, 0.65).round(2),
            "惊吓判定", {
                unit: "格",
                description: "尖叫在目标周身笼罩的判定半径；身板越大，吼声兜得越开。"
            }),
        /** 贴身小跳：基础 0.6 格/刻，速度每比 55 快 1 加 0.004（上限 +0.25）；夹在 0.4..0.95。 */
        hop: formula(
            F.base(0.6).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.1, 0.25)).clamp(0.4, 0.95).round(2),
            "贴身小跳", {
                unit: "格/刻",
                description: "疾呼式往前蹭近的那一小步每刻走多远；潜吓式不移动。"
            }),
        /** 畏缩几率：基础 0.30，速度每比 55 快 1 加 0.0012（上限 +0.12）；
         *  黑暗 ×1.18；潜吓 ×1.25；夹在 0.18..0.56。 */
        flinchChance: percent(
            F.base(0.30).plus(F.stat("speed").minus(55).times(0.0012).clamp(-0.05, 0.12))
                .times(F.when(astonishDark, F.const(1.18), F.const(1)))
                .times(F.when(F.pref("lurk", text("worldcombat.skill.astonish.preference.lurk")), F.const(1.25), F.const(1)))
                .clamp(0.18, 0.56),
            "畏缩几率", "被尖叫贴脸时的畏缩几率（原生 30%）；速度越快越突然，黑暗与潜吓式再抬一档。"),
        /** 畏缩持续：基础 10 刻；黑暗 +4、潜吓式 +4；夹在 8..22 刻。 */
        flinchTicks: seconds(
            F.base(10).plus(F.when(astonishDark, F.const(4), F.const(0)))
                .plus(F.when(F.pref("lurk", text("worldcombat.skill.astonish.preference.lurk")), F.const(4), F.const(0)))
                .clamp(8, 22).round(0),
            "畏缩持续", "被吓懵的人在这段时间内无法开始新动作；伤害阶段不受影响，仍可被打。"),
        /** 收招：基础 6 刻，速度每比 55 快 1 减 0.012（下限 −2）；潜吓 +4；夹在 3..13。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.012).clamp(-2, 1.5))
                .plus(F.when(F.pref("lurk", text("worldcombat.skill.astonish.preference.lurk")), F.const(4), F.const(0)))
                .clamp(3, 13).round(0),
            "收招", "喊完那一声之后回神的时间；速度越快越利落，潜吓式收得更慢。"),
        /** 冷却：基础 15 刻，速度每比 55 快 1 减 0.02（下限 −3）；潜吓 +5；夹在 8..26。 */
        recharge: seconds(
            F.base(15).minus(F.stat("speed").minus(55).times(0.02).clamp(-3, 2))
                .plus(F.when(F.pref("lurk", text("worldcombat.skill.astonish.preference.lurk")), F.const(5), F.const(0)))
                .clamp(8, 26).round(0),
            "冷却", "两声尖叫之间的等待；这是本组较快的冷却，疾呼式回得尤其快。")
    });

    stages("astonish", [
        { level: 20, values: { shriek: 30 } },
        { level: 38, values: { shriek: 38, flinchChance: 0.40, flinchTicks: 16 } }
    ]);

    defineDamage("astonish", "shriek", { defenceCoefficient: 0.004,
        rationale: "惊吓以声势为主；防御按略低系数减伤，单发本就轻。" }, { contact: true });

    describe("astonish", [
        { key: "description.0", values: ["shriek", "burst"] },
        { key: "description.1", values: ["reach"] },
        { key: "description.2", values: ["flinchChance", "flinchTicks"] },
        { key: "lurk.on", values: [], when: function (context) { return read(context.detail.values, ["lurk"]) === true; } },
        { key: "lurk.off", values: [], when: function (context) { return read(context.detail.values, ["lurk"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shriek"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.shriek", "tier.1.flinchChance", "tier.1.flinchTicks"] }
    ]);
}
