/**
 * 子弹拳 / bulletpunch —— 参数与伤害段。
 *
 * 原生事实：钢／物理／威力 40／命中 100／PP 30／优先度 +1／接触／punch（Cobblemon 1.8 / Showdown）。
 *   描述「向对手使出如子弹般快速而坚硬的拳头。必定能够先制攻击」。
 *
 * 翻译：本招把「如子弹般快速而坚硬」翻成一记**当场击发、笔直贯穿的钢拳**——起手为 0（提交即打），
 *   施法者不位移，钢铁拳锋沿瞄准方向一发打穿；拳走过的那条**窄线**上排在前面的敌人会被一并贯穿，
 *   拳锋够硬，按更低的防御系数结算（钢弹穿甲）。它不是一记抡圆的重拳，是一发直射的弹。
 *
 * 与场上最像的招分开：音速拳是不位移的一记直拳，但只打第一个、且是格斗的气爆；快手还击只认先制招。
 *   子弹拳的读法是**钢弹贯穿**：一道金属火花沿窄线打出，把这条线上前后排着的人一起打穿。
 *
 * 数据分散（每个参数各吃不同的精灵数据，落到不同参数上）：
 *   round      钢拳威力：物攻给份量、速度给弹速；穿甲弹每一下更轻。
 *   reach      拳程（也是射程）：身高给臂展、物攻够得稍远；穿甲弹略短。
 *   halfWidth  贯穿半宽：身高决定这条线多宽。
 *   push       顶开距离：物攻决定把打中的人推开多远。
 *   pierce     贯穿数：速度决定弹能穿几个（1 + 速度阶梯，最多 2）；穿甲弹再 +1，最高 3。
 *   sparks     火花数量：速度驱动，表现按它发射。
 *   tempo/settle/recharge 速度决定节奏；穿甲弹更慢更费。
 *
 * 配置 `ap`（穿甲弹）双向取舍：开启＝贯穿数 +1（最多 3 个）、可以把整条线打穿，但每一下威力 ×0.85、
 *   拳程 −0.3 格、起手 +1 刻、收招 +2 刻、冷却 +6 刻；关闭＝单发实心钢拳，够得更远、回得更快、这一下更重。
 *
 * 伤害段 `round` 与参数同名；钢弹按更低的防御系数结算（defenceCoefficient 0.0042，默认 0.005），
 *   对手防御、相性与暴击在命中时统一结算。
 */
namespace PokemonSkills {
    export const bulletpunchId = "bulletpunch";
    export const bulletpunchScene = "world_combat:move_bulletpunch";
    export const bulletpunchHitText = "world_combat.move.bulletpunch.text.hit";
    export const bulletpunchPierceText = "world_combat.move.bulletpunch.text.pierce";
    export const bulletpunchMissText = "world_combat.move.bulletpunch.text.miss";

    actionParameters.define(bulletpunchId, {
        /** 钢拳威力：40 +（物攻 − 55）× 0.26 [−11,30] +（速度 − 55）× 0.14 [−4,16]；穿甲 ×0.85；夹 26..104。 */
        round: formula(
            F.base(40)
                .plus(F.stat("attack").minus(55).times(0.26).clamp(-11, 30))
                .plus(F.stat("speed").minus(55).times(0.14).clamp(-4, 16))
                .times(F.when(F.pref("ap", text("worldcombat.skill.bulletpunch.preference.ap")), F.const(0.85), F.const(1)))
                .clamp(26, 104).round(1),
            "钢拳威力", {
                unit: "威力",
                description: "这一发钢拳的威力；物攻给份量、速度给弹速。穿甲弹每一下更轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 拳程：2.3 +（身高 − 1.4）× 0.32 [−0.15,0.9] +（物攻 − 55）× 0.004 [−0.08,0.2]；穿甲 −0.3；夹 1.9..3.4。 */
        reach: formula(
            F.base(2.3).plus(F.body("height").minus(1.4).times(0.32).clamp(-0.15, 0.9))
                .plus(F.stat("attack").minus(55).times(0.004).clamp(-0.08, 0.2))
                .minus(F.when(F.pref("ap", text("worldcombat.skill.bulletpunch.preference.ap")), F.const(0.3), F.const(0)))
                .clamp(1.9, 3.4).round(2),
            "拳程", {
                unit: "格",
                description: "这条弹道打出去多远，也是本招的实际射程来源；臂长的个体够得更远、力大的出拳带得更前，穿甲弹略短。"
            }),
        /** 贯穿半宽：0.5 +（身高 − 1.4）× 0.10 [−0.06,0.24]；夹 0.4..0.85。 */
        halfWidth: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.10).clamp(-0.06, 0.24)).clamp(0.4, 0.85).round(2),
            "贯穿半宽", { unit: "格", description: "这条弹道有多宽（单边）；身板越大扫得越宽。画面里的火花线就是它。" }),
        /** 顶开距离：0.35 +（物攻 − 55）× 0.005 [−0.08,0.4]；夹 0.15..0.9。 */
        push: formula(
            F.base(0.35).plus(F.stat("attack").minus(55).times(0.005).clamp(-0.08, 0.4)).clamp(0.15, 0.9).round(2),
            "顶开距离", { unit: "格", description: "打中后把目标沿弹道方向推开多远；物攻越高推得越远。" }),
        /** 贯穿数：1 +（速度 − 55）÷ 30 [0,1]；穿甲弹再 +1；夹 1..3。 */
        pierce: formula(
            F.base(1).plus(F.stat("speed").minus(55).div(30).clamp(0, 1))
                .plus(F.when(F.pref("ap", text("worldcombat.skill.bulletpunch.preference.ap")), F.const(1), F.const(0)))
                .clamp(1, 3).round(0),
            "贯穿数", {
                unit: "个",
                description: "这一发能在窄线上打穿几个敌人；速度越快弹越顺，最多 2 个，穿甲弹再 +1 最多 3 个。"
            }),
        /** 火花数量：14 +（速度 − 55）× 0.24 [−3,12]；夹 10..32。 */
        sparks: formula(
            F.base(14).plus(F.stat("speed").minus(55).times(0.24).clamp(-3, 12)).clamp(10, 32).round(0),
            "火花数量", {
                unit: "点",
                description: "击发与贯穿时迸出的金属火花数量，也直接驱动画面的发射量；速度越快越密。"
            }),
        /** 起手：0 + 穿甲 1；夹 0..2 刻。 */
        tempo: seconds(
            F.base(0).plus(F.when(F.pref("ap", text("worldcombat.skill.bulletpunch.preference.ap")), F.const(1), F.const(0)))
                .clamp(0, 2).round(0),
            "起手", "从起念到钢拳击发之间的时间；默认 0（提交即打，没有前摇），穿甲弹要多压半拍。"),
        /** 收招：5 −（速度 − 55）× 0.02 [−0.8,1.5] + 穿甲 2；夹 3..9 刻。 */
        settle: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.5))
                .plus(F.when(F.pref("ap", text("worldcombat.skill.bulletpunch.preference.ap")), F.const(2), F.const(0)))
                .clamp(3, 9).round(0),
            "收招", "收拳站定的时间；它不位移，所以收得干脆，穿甲弹多带回一点余势。"),
        /** 冷却：14 −（速度 − 55）× 0.06 [−2,3] + 穿甲 6；夹 9..26 刻。 */
        recharge: seconds(
            F.base(14).minus(F.stat("speed").minus(55).times(0.06).clamp(-2, 3))
                .plus(F.when(F.pref("ap", text("worldcombat.skill.bulletpunch.preference.ap")), F.const(6), F.const(0)))
                .clamp(9, 26).round(0),
            "冷却", "两次击发之间的等待；实心弹回得最快，穿甲弹要重新压一发。")
    });

    defineDamage(bulletpunchId, "round", { defenceCoefficient: 0.0042,
        rationale: "钢弹比一般的物理招式更硬：对防御的削弱略强，让物攻与速度的差距在场上更明显，也让「穿甲」这个念头落到数值上。" },
        { contact: true, punch: true });

    stages(bulletpunchId, [
        { level: 18, values: { round: 50 } },
        { level: 36, values: { round: 60, reach: 2.6 } }
    ]);

    describe(bulletpunchId, [
        { key: "description.0", values: ["round", "reach", "halfWidth"] },
        { key: "description.1", values: ["pierce", "push"] },
        { key: "description.2", values: [] },
        { key: "ap.on", values: [], when: function (context) { return read(context.detail.values, ["ap"]) === true; } },
        { key: "ap.off", values: [], when: function (context) { return read(context.detail.values, ["ap"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.round"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.round", "tier.1.reach"] }
    ]);
}
