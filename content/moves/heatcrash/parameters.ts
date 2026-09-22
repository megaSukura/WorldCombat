/**
 * 高温重压 / heatcrash 的参数与伤害段。
 *
 * 原生事实：Fire、物理、命中 100、PP 10、接触、威力按**自己体重 / 对手体重**的比值分档
 * （≥5 倍 120、≥4 倍 100、≥3 倍 80、≥2 倍 60、其余 40）（Cobblemon 1.8，30 位学习者）。
 * 翻译：与重磅冲撞同形不同料——把自己整副**燃着火的**身躯砸下去，分量在这里变成火：
 * 自己越压过对手，砸得越狠、也越容易把对手点着；落点被烤成一片短命的焦土（岩浆块），走上去会烫脚。
 *
 * 数据分散（每项读不同的精灵数据；比较项同时读双方）：
 *   crush      冲撞威力：**自身／目标体重比**给出主曲线 + 施法者物攻（下砸的狠度）+ 自身绝对体重。
 *   burnChance 点燃概率：**体重比**（压得越狠、火压得越实）+ 等级；配置 scorch 升高。
 *   burnTicks  灼烧持续：等级；配置 scorch 稍长。
 *   igniteTicks 身上着火：**体重比**；命中瞬间把目标点成明火的时间（观感与立即压力）。
 *   landRadius／shove／hop／airTicks／leap／collisionRadius 同重磅冲撞，另有一档配置修正。
 *   scorchRadius／scorchTicks 焦土半径与留存：体重与等级；配置 scorch 放大。
 *   prepare/recover/cooldown 起手／收招／冷却：速度；配置 scorch 另加。
 *
 * 配置 `scorch`（焦土式，默认关）双向取舍：开＝焦土更大、点燃概率更高、灼烧更久，但单发威力略低、收招与冷却更久；
 * 关＝更重更快的一记火焰冲撞，只留一小片焦痕。两向各有局面（铺火场 vs 打一发重击）。
 *
 * 伤害段 `crush` 与参数同名；属性与分类沿用原生 Fire／物理，对手防御、相性与暴击在命中时统一结算。
 */
namespace PokemonSkills {
    const heatcrashMassNode: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");

    /** 自身体重 / 目标体重，夹在 1..5。 */
    const heatcrashRatio: Formula.Node = F.body("weight").div(heatcrashMassNode.max(1)).clamp(1, 5).as("体重比");

    actionParameters.define("heatcrash", {
        /** 冲撞威力：基础 40；体重比每超过 2 倍 1 点加 26.67（上限 +80）；物攻每比 60 多 1 加 0.25（上限 +24）；体重每比 100kg 多 1kg 加 0.4（上限 +18）；焦土 ×0.9 / 重压 ×1.08；夹在 36..160。 */
        crush: formula(
            F.base(40)
                .plus(heatcrashRatio.minus(2).clamp(0, 3).times(26.67))
                .plus(F.stat("attack").minus(60).times(0.25).clamp(-8, 24))
                .plus(F.body("weight").minus(1000).times(0.004).clamp(-6, 18))
                .times(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(0.9), F.const(1.08)))
                .clamp(36, 160).round(1),
            "冲撞威力", {
                unit: "威力",
                description: "燃着火的整副身躯砸下的基础威力；**自己比对手越重越狠**（体重比是主曲线），物攻给出下砸的狠度、绝对体重再压一层。命中时的防御、相性与暴击另算。"
            }),
        /** 点燃概率：基础 0.22；体重比每超过 1 倍 1 点加 0.09（上限 +0.36）；等级每高 1 级加 0.003（上限 +0.12）；焦土 ×1.25；夹在 0.12..0.75。 */
        burnChance: percent(
            F.base(0.22).plus(heatcrashRatio.minus(1).clamp(0, 4).times(0.09))
                .plus(F.level().minus(20).times(0.003).clamp(0, 0.12))
                .times(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(1.25), F.const(1)))
                .clamp(0.12, 0.75).round(3),
            "点燃概率", "命中后把目标点着的概率；自己压过对手越多，火压得越实，焦土式更容易点燃。免疫灼烧的目标不受影响。"),
        /** 灼烧持续：基础 60 刻；等级每高 1 级加 1.5 刻（上限 +60）；焦土 ×1.2；夹在 50..160。 */
        burnTicks: seconds(
            F.base(60).plus(F.level().minus(20).times(1.5).clamp(0, 60))
                .times(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(1.2), F.const(1)))
                .clamp(50, 160).round(0),
            "灼烧持续", "被点着后带灼烧身份的时间；焦土式烧得更久。"),
        /** 明火时长：基础 16 刻；体重比每超过 1 倍 1 点加 4 刻（上限 +20）；夹在 12..44。 */
        igniteTicks: seconds(
            F.base(16).plus(heatcrashRatio.minus(1).clamp(0, 4).times(4)).clamp(12, 44).round(0),
            "明火时长", "命中瞬间把目标点成明火的时间；压得越狠烧得越久。"),
        /** 落点半径：基础 1.7 格；碰撞箱每比 1.4 高 1 格加 0.55（上限 +0.9）；体重每比 100kg 多 1kg 加 0.02（上限 +0.5）；夹在 1.4..3.0。 */
        landRadius: formula(
            F.base(1.7).plus(F.body("height").minus(1.4).times(0.55).clamp(0, 0.9))
                .plus(F.body("weight").minus(1000).times(0.02).clamp(0, 0.5))
                .clamp(1.4, 3.0).round(2),
            "落点半径", {
                unit: "格",
                description: "落地冲击罩住的范围；身板越大、越重范围越大。"
            }),
        /** 顶开距离：基础 0.7 格；体重每比 100kg 多 1kg 加 0.035（上限 +1.2）；体重比每超过 1 倍 1 点加 0.12（上限 +0.5）；夹在 0.35..2.2。 */
        shove: formula(
            F.base(0.7).plus(F.body("weight").minus(1000).times(0.035).clamp(-0.2, 1.2))
                .plus(heatcrashRatio.minus(1).clamp(0, 4).times(0.12))
                .clamp(0.35, 2.2).round(2),
            "顶开距离", {
                unit: "格",
                description: "落地把范围里目标推开多远；越重、压过对手越多推得越开。"
            }),
        /** 跃起高度：基础 1.7 格；速度每比 60 快 1 加 0.01（上限 +0.7）；夹在 1.1..2.8。 */
        hop: formula(
            F.base(1.7).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.3, 0.7)).clamp(1.1, 2.8).round(2),
            "跃起高度", {
                unit: "格",
                description: "腾空到最高点的高度；动作快的个体跳得更高。"
            }),
        /** 腾空时长：基础 11 刻；速度每比 60 快 1 减 0.05 刻（上限 ±4）；夹在 8..17。 */
        airTicks: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 4)).clamp(8, 17).round(0),
            "腾空时长", "从起跳到砸地的时间；火在腾空里翻卷，快脚落地更干脆。"),
        /** 跳跃距离：基础 3.5 格；速度每比 60 快 1 加 0.03（上限 +1.8）；体重每比 100kg 多 1kg 加 0.02（上限 +1.0）；夹在 2.6..5.8。 */
        leap: formula(
            F.base(3.5).plus(F.stat("speed").minus(60).times(0.03).clamp(-0.8, 1.8))
                .plus(F.body("weight").minus(1000).times(0.02).clamp(0, 1.0))
                .clamp(2.6, 5.8).round(2),
            "跳跃距离", {
                unit: "格",
                description: "最多能从多远跃起砸落；驱动目标接受范围。"
            }),
        /** 判定半径：基础 0.55 格；碰撞箱每比 1.4 高 1 格加 0.16；夹在 0.4..0.95。 */
        collisionRadius: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.16)).clamp(0.4, 0.95).round(2),
            "判定半径", {
                unit: "格",
                description: "砸中活体时的横向判定半径；身板越大越宽。"
            }),
        /** 焦土半径：基础 1.5 格；体重每比 100kg 多 1kg 加 0.035（上限 +1.2）；焦土 ×1.3 / 重压 ×0.85；夹在 1.2..3.2。 */
        scorchRadius: formula(
            F.base(1.5).plus(F.body("weight").minus(1000).times(0.035).clamp(0, 1.2))
                .times(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(1.3), F.const(0.85)))
                .clamp(1.2, 3.2).round(2),
            "焦土半径", {
                unit: "格",
                description: "地面被烤成岩浆块的范围；站进去会烫脚。焦土式铺得更开。"
            }),
        /** 焦土留存：基础 110 刻；等级每高 1 级加 2；焦土 ×1.35；夹在 90..300。 */
        scorchTicks: seconds(
            F.base(110).plus(F.level().minus(20).times(2))
                .times(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(1.35), F.const(1)))
                .clamp(90, 300).round(0),
            "焦土留存", "烤焦的地面留多久；到期原方块回来。"),
        /** 起手：基础 9 刻；速度每比 60 快 1 减 0.04 刻（上限 −3）；焦土 +2；夹在 5..15。 */
        prepare: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.04).clamp(-1, 3))
                .plus(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(2), F.const(0)))
                .clamp(5, 15).round(0),
            "起手", "让全身火苗卷起来、蓄到能跃起的时间；焦土式起得更慢。"),
        /** 收招：基础 11 刻；速度每比 60 快 1 减 0.03 刻（上限 −4）；焦土 +3；夹在 6..19。 */
        recover: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.03).clamp(-1, 4))
                .plus(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(3), F.const(0)))
                .clamp(6, 19).round(0),
            "收招", "落地后重新站稳的收势；焦土式更久。"),
        /** 冷却：基础 44 刻；速度每比 60 快 1 减 0.06 刻（上限 −8）；焦土 +8；夹在 28..72。 */
        cooldown: seconds(
            F.base(44).minus(F.stat("speed").minus(60).times(0.06).clamp(-2, 8))
                .plus(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(8), F.const(0)))
                .clamp(28, 72).round(0),
            "冷却", "两次高温重压之间的等待；焦土式缓得更久。")
    });

    stages("heatcrash", [
        { level: 30, values: { crush: 60 } },
        { level: 50, values: { crush: 78, scorchRadius: 2.2 } }
    ]);

    defineDamage("heatcrash", "crush", { defenceCoefficient: 0.005 }, { contact: true });

    describe("heatcrash", [
        { key: "description.0", values: ["crush", "landRadius", "collisionRadius"] },
        { key: "description.1", values: ["burnChance", "burnTicks", "igniteTicks"] },
        { key: "description.2", values: ["leap", "hop", "airTicks", "shove"] },
        { key: "description.3", values: ["scorchRadius", "scorchTicks"] },
        { key: "scorch.on", values: [], when: function (context) { return read(context.detail.values, ["scorch"]) === true; } },
        { key: "scorch.off", values: [], when: function (context) { return read(context.detail.values, ["scorch"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.crush"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.crush", "tier.1.scorchRadius"] }
    ]);
}
