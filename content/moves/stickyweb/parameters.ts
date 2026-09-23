/**
 * 黏黏网 / stickyweb 的参数。
 *
 * 原生事实：Bug／变化／威力 0／命中 必中／PP 20／target foeSide；出场即触发，只有落地（isGrounded）的生物
 *   触发，降低 1 级速度（boosts={spe:-1}）。
 *
 * 世界化：把「在对手周围围上黏黏的网」翻成**一片留在世界地面上的黏网**——施法者把一团黏丝抛到选定的地面，
 *   落地摊成一张网（`WorldEffects.field`，规则 `world_combat:hazard/stickyweb`）；贴地的非友方踏进来，
 *   速度等级直接掉一档（宝可梦落到原生速度等级，原版生物与其他模组生物落到移动速度属性），并挂上
 *   `world_combat:stickywebbed`（身份 `world_combat:status/stickyweb`，持续把脚下拖慢）；留在网里时这层
 *   黏劲被持续维持，走出后按剩余时间慢慢脱开。它不造成伤害，是本组唯一的**纯减速陷阱**。
 *
 * 数值来源（每个参数读不同的个体数据，分散到不同参数上）：
 *   dropStages   速度下降级数：原生 1 级；深锚 +1；夹 1..2。
 *   strandTicks  黏身（被网缠住）时长：等级 ＋ 特攻；深锚 ×1.3 / 广铺 ×0.85；夹 60..260。
 *   webRadius    黏网半径：体宽（铺得开）＋特攻；深锚 ×0.8 / 广铺 ×1.25；夹 1.6..4.6。
 *   webTicks     黏网存续时长：等级 ＋ HP；深锚 ×1.15 / 广铺 ×0.9；夹 110..420。
 *   strands      黏丝数量：特攻；它同时是画面里网线与丝屑的数量。
 *   reach        抛网距离：速度与等级；夹 6..12，也是实际射程。
 *   throwSpeed   抛网速度：速度。
 *   tempo        起手：速度；深锚 +2 刻。
 *   recharge     冷却：特攻；深锚 ×1.05 / 广铺 ×0.95。
 *
 * 配置 `anchored`（深锚）双向取舍：开启＝多降一级速度、黏身与黏网都更久，但网收窄到 0.8 倍、起手 +2 刻、
 *   冷却更长，用来把一条窄路黏死；关闭＝广铺式，网铺大 1.25 倍、出手更快，代价是只降一级、黏得更短，
 *   用来罩住一大片地。公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const stickywebId = "stickyweb";
    export const stickywebRule = "world_combat:hazard/stickyweb";
    export const stickywebScene = "world_combat:move_stickyweb";
    export const stickywebEffect = "world_combat:stickywebbed";
    export const stickywebLayText = "world_combat.move.stickyweb.text.lay";
    export const stickywebSnareText = "world_combat.move.stickyweb.text.snare";

    actionParameters.define(stickywebId, {
        dropStages: formula(
            F.base(1).plus(F.when(F.pref("anchored"), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "速度下降级数", {
                unit: "级",
                description: "被网黏住时损失的速度等级；原生 1 级，深锚式多降一级。对宝可梦落到原生速度等级，对其他战斗者落到移动速度属性。"
            }),
        strandTicks: seconds(
            F.base(100).plus(F.level().minus(25).times(1.2).clamp(0, 44)).plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-10, 40))
                .times(F.when(F.pref("anchored"), F.const(1.3), F.const(0.85)))
                .clamp(60, 260).round(0),
            "黏身时长", "被网缠住、脚步发沉的状态持续多久；等级与特攻越高缠得越久，深锚式更长。"),
        webRadius: formula(
            F.base(2.6)
                .plus(F.body("width").minus(0.9).times(1.1).clamp(-0.3, 1.4))
                .plus(F.stat("specialAttack").minus(60).times(0.005).clamp(-0.3, 0.7))
                .times(F.when(F.pref("anchored"), F.const(0.8), F.const(1.25)))
                .clamp(1.6, 4.6).round(2),
            "黏网半径", {
                unit: "格",
                description: "一张黏网摊开覆盖的半径；体型越宽、特攻越高铺得越开，深锚式收窄。它也是指示圈与实际判定半径。"
            }),
        webTicks: seconds(
            F.base(200).plus(F.level().minus(25).times(2.2).clamp(0, 80)).plus(F.stat("hp").minus(60).times(0.25).clamp(-16, 34))
                .times(F.when(F.pref("anchored"), F.const(1.15), F.const(0.9)))
                .clamp(110, 420).round(0),
            "黏网存续时长", "一张黏网在世界上留多久；等级与 HP 越高留得越久，深锚式更耐放。"),
        strands: formula(
            F.base(18).plus(F.stat("specialAttack").times(0.16)).clamp(14, 44).round(0),
            "黏丝数量", {
                unit: "缕",
                description: "一张网里有多少缕能被射出去的黏丝；特攻越高越密，也是画面里网线与丝屑的数量。"
            }),
        reach: formula(
            F.base(8)
                .plus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2))
                .plus(F.level().minus(25).times(0.04).clamp(0, 2))
                .clamp(6, 12).round(2),
            "抛网距离", {
                unit: "格",
                description: "能把黏网抛到多远的地面；速度与等级越高够得越远。它也是本招的实际射程。"
            }),
        throwSpeed: formula(
            F.base(1).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.15, 0.4)).clamp(0.8, 1.5).round(2),
            "抛网速度", {
                unit: "格/刻",
                description: "黏丝团脱手飞向落点的速度；速度快的个体抛得更急，目标更难在网摊开前走开。"
            }),
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("anchored"), F.const(2), F.const(0)))
                .clamp(6, 14).round(0),
            "起手", "把丝拢成团再抛出的时间；速度越快起手越短，深锚 +2 刻。"),
        recharge: seconds(
            F.base(100).minus(F.stat("specialAttack").minus(60).times(0.2).clamp(-10, 20))
                .times(F.when(F.pref("anchored"), F.const(1.05), F.const(0.95)))
                .clamp(55, 170).round(0),
            "冷却", "两次织网之间的等待；特攻越高回得越快，深锚 ×1.05、广铺 ×0.95。")
    });

    describe(stickywebId, [
        { key: "description.0", values: ["dropStages","strandTicks"] },
        { key: "description.1", values: ["webRadius","webTicks"] },
        { key: "description.2", values: [] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["anchored"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["anchored"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
