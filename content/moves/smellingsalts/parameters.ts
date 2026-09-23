/**
 * 清醒 / smellingsalts —— 参数、伤害段与「目标正麻痹」的现场判读。
 *
 * 原生事实：Normal／物理／威力 70／命中 100／PP 10／接触；
 *   「对于麻痹状态下的对手，威力会变成 2 倍。但相反对手的麻痹也会被治愈」（Cobblemon 1.8）。
 *
 * 翻译：把一粒呛人的盐拍在对手脸上——麻痹的神经被这一激，痛感翻倍，但人也因此清醒过来。即时战斗里
 *   直接读共享身份 `world_combat:status/paralysis`：目标正麻痹时这一记翻倍，命中后 `CombatStatus.cure`
 *   把麻痹解掉。所以它是一记**打醒别人的终结技**：趁麻痹的窗口一口气打重，代价是解除了自己的控制。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   salts   清醒威力 62 + 物攻偏移 + 等级偏移；目标麻痹时 ×2，粗盐式 ×0.90。
 *   reach   掴击距离 2.4 格 + 速度偏移；也是实际射程来源，短促。
 *   step    每刻位移 0.90 格/刻 + 速度偏移。
 *   radius  判定半径 0.30 格 + 体型高度偏移。
 *   push    拍开 0.18 格 + 物攻偏移；粗盐式 ×1.5。
 *   stagger 粗盐留下的踉跄 1.2 秒 + 等级偏移（治愈麻痹后额外的一段减速）。
 *   puff    盐屑数 12 + 速度偏移 + 等级偏移，驱动表现。
 *   spark   醒神火花数 4 − 速度偏移，表现麻痹离体。
 *   spark 之外的 spark 是协议常量。
 *   start／settle／recharge 速度决定起手、收招、冷却。
 *
 * 配置 `coarse`（粗盐）：开启＝拍开 ×1.5、治愈后额外留下一段踉跄（减速），但本击 ×0.90、冷却 +3；
 *   关闭＝本击 ×1.06、拍醒就干净。两向各有局面：控住刚清醒的目标 vs 把伤害打足。
 */
namespace PokemonSkills {
    export const smellingsaltsId = "smellingsalts";
    export const smellingsaltsScene = "world_combat:move_smellingsalts";
    export const smellingsaltsWakeText = "world_combat.move.smellingsalts.text.wake";
    export const smellingsaltsHitText = "world_combat.move.smellingsalts.text.hit";
    export const smellingsaltsMissText = "world_combat.move.smellingsalts.text.miss";

    /** 命中目标此刻是否正麻痹；1 即这一记会被盐激醒并翻倍。 */
    export function smellingsaltsNumb(context: FactContext): number {
        const world = context.world, actor = context.actor;
        if (!world || !actor || !world.valid(actor)) return 0;
        const target = context.action ? context.action.target() : context.target ? context.target.actor || null : null;
        if (!target || !world.valid(target)) return 0;
        return CombatStatus.has(world, target, "paralysis") ? 1 : 0;
    }

    defineFacts(smellingsaltsId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string): Formula.Fact {
            if (id === "smellingsalts.numb") return smellingsaltsNumb(context);
            return undefined;
        } };
    });

    actionParameters.define(smellingsaltsId, {
        /** 清醒威力：62 + 物攻偏移[−14,34] + 等级偏移[−4,10]；目标麻痹 ×2、粗盐式 ×0.90 / 常规 ×1.06；夹 38..160。 */
        salts: formula(
            F.base(62)
                .plus(F.stat("attack").minus(58).times(0.30).clamp(-14, 34))
                .plus(F.level().minus(28).times(0.35).clamp(-4, 10))
                .times(F.when(F.var("smellingsalts.numb", text("worldcombat.skill.smellingsalts.value.numb")).gt(0), F.const(2), F.const(1)))
                .times(F.when(F.pref("coarse", text("worldcombat.skill.smellingsalts.preference.coarse")), F.const(0.90), F.const(1.06)))
                .clamp(38, 160).round(1),
            "清醒威力", {
                unit: "威力",
                description: "这一记盐击的基准威力；物攻与等级越高越重。目标正麻痹时翻倍，并在命中后解除它的麻痹。对手防御、相性与暴击在命中时另算。"
            }),
        /** 掴击距离：3.2 格 + 速度偏移[−0.3,0.8]；夹 2.9..4.0；也是实际射程来源。 */
        reach: formula(
            F.base(3.2).plus(F.stat("speed").minus(58).times(0.010).clamp(-0.3, 0.8)).clamp(2.9, 4.0).round(2),
            "掴击距离", {
                unit: "格",
                description: "这一记盐击能够到的最大距离，也是本招的实际射程来源；出手快的个体够得更前。"
            }),
        /** 每刻位移：0.90 格/刻 + 速度偏移[−0.15,0.35]；夹 0.65..1.35。 */
        step: formula(
            F.base(0.90).plus(F.stat("speed").minus(58).times(0.0035).clamp(-0.15, 0.35)).clamp(0.65, 1.35).round(2),
            "拍击速度", {
                unit: "格/刻",
                description: "拍上去每刻移动的距离；越快越打得出这记措手不及。"
            }),
        /** 判定半径：0.30 格 + 体型高度偏移[−0.06,0.26]；夹 0.26..0.56。 */
        radius: formula(
            F.base(0.30).plus(F.body("height").minus(1.4).times(0.09).clamp(-0.06, 0.26)).clamp(0.26, 0.56).round(2),
            "判定半径", {
                unit: "格",
                description: "这一掌能拍中多大一圈；身板大的个体掌面更宽。"
            }),
        /** 拍开：(0.18 + 物攻偏移[−0.05,0.25]) × 粗盐 1.5；夹 0.12..0.60。 */
        push: formula(
            F.base(0.18).plus(F.stat("attack").minus(58).times(0.003).clamp(-0.05, 0.25))
                .times(F.when(F.pref("coarse", text("worldcombat.skill.smellingsalts.preference.coarse")), F.const(1.5), F.const(1.0)))
                .clamp(0.12, 0.60).round(2),
            "拍开", {
                unit: "格",
                description: "命中后把目标拍开一点的距离；物攻高、用粗盐时拍得更远。"
            }),
        /** 踉跄：24 刻（1.2 秒）+ 等级偏移[0,12 刻]；夹 16..40 刻（粗盐在治愈麻痹后额外留下的减速时长）。 */
        stagger: seconds(
            F.base(24).plus(F.level().minus(28).times(0.2).clamp(0, 12)).clamp(16, 40).round(0),
            "踉跄", "粗盐式把对手拍醒后，它还会踉跄多久（这段减速留在治愈麻痹之后）。"),
        /** 盐屑数：12 + 速度偏移[−3,18] + 等级偏移[−2,4]；夹 8..30。 */
        puff: formula(
            F.base(12).plus(F.stat("speed").minus(58).times(0.14).clamp(-3, 18))
                .plus(F.level().minus(28).times(0.12).clamp(-2, 4)).clamp(8, 30).round(0),
            "盐屑数", {
                unit: "撮",
                description: "拍出的盐屑数量；速度与等级越高越密，直接驱动画面的发射量。"
            }),
        /** 醒神火花：4 − 速度偏移[−1,1.5]；夹 3..7（麻痹离体时迸出的黄色火花）。 */
        spark: formula(
            F.base(4).minus(F.stat("speed").minus(58).times(0.015).clamp(-1, 1.5)).clamp(3, 7).round(0),
            "醒神火花", {
                unit: "枚",
                description: "击散麻痹时迸出的火花数；手快的个体出手更利落、数量略少但更集中。"
            }),
        /** 起手：4 刻 − 速度偏移[−1,1.5]；夹 3..7。 */
        start: seconds(
            F.base(4).minus(F.stat("speed").minus(58).times(0.015).clamp(-1, 1.5)).clamp(3, 7).round(0),
            "起手", "从抓盐到拍出去之间的时间；速度快的个体起得更快。"),
        /** 收招：6 刻；夹 4..10。 */
        settle: seconds(F.base(6).clamp(4, 10).round(0), "收招", "拍完收住的时间。"),
        /** 冷却：22 − 速度偏移[−3,5] + 粗盐 3；夹 14..34。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(58).times(0.10).clamp(-3, 5))
                .plus(F.when(F.pref("coarse", text("worldcombat.skill.smellingsalts.preference.coarse")), F.const(3), F.const(0))).clamp(14, 34).round(0),
            "冷却", "这一记之后多久能再拍一次；速度快的个体回得更快，粗盐式更费。")
    });

    defineDamage(smellingsaltsId, "salts", {}, { contact: true });

    stages(smellingsaltsId, [
        { level: 26, values: { salts: 74 } },
        { level: 42, values: { salts: 90, stagger: 1.5 } }
    ]);

    describe(smellingsaltsId, [
        { key: "description.0", values: ["salts"] },
        { key: "description.paralysis", values: [] },
        { key: "description.1", values: ["reach", "step", "radius", "push"] },
        { key: "coarse.on", values: [], when: function (context) { return read(context.detail.values, ["coarse"]) === true; } },
        { key: "coarse.off", values: [], when: function (context) { return read(context.detail.values, ["coarse"]) !== true; } },
        { key: "timing", values: ["range", "start", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.salts"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.salts", "tier.1.stagger"] }
    ]);
}
