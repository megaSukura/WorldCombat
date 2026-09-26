/**
 * 高温重压 / heatcrash 的参数与伤害段。
 *
 * 原生事实：Fire、物理、命中 100、PP 10、接触、威力按**自己体重 / 对手体重**的比值分档
 * （≥5 倍 120、≥4 倍 100、≥3 倍 80、≥2 倍 60、其余 40）（Cobblemon 1.8，30 位学习者）。
 * 翻译：与重磅冲撞同形不同料——但位置完全不同：把自己这副**燃着火的**身躯**低低扑出去**，触地后贴地滑一小段，
 * 把滑过路径上的敌人各压一次（按各自的体重比结算 `crush`），并在地上留一道很快熄灭的火擦痕。
 * 它不做高跃、不做落点圆爆、不替换任何方块：区分它与重磅冲撞的是身体运动（低扑滑行 vs 高跃落圈），不是火色。
 *
 * 数据分散（每项读不同的精灵数据；比较项同时读双方）：
 *   crush      冲撞威力：**自身／目标体重比**给出主曲线 + 施法者物攻（下压的狠度）+ 自身绝对体重。
 *   burnChance 点燃概率：**体重比**（压得越狠、火压得越实）+ 等级；配置 scorch 升高。
 *   burnTicks  灼烧持续：等级；配置 scorch 稍长。
 *   igniteTicks 明火时长：**体重比**；命中瞬间把目标点成明火的时间。
 *   landRadius 压击半径：施法者碰撞箱高度 + 体重；贴着身体一圈的判定。
 *   collisionRadius 滑动判定半径：碰撞箱高度；贴地滑行时扫过的横向半径。
 *   shove      顶开距离：自身体重 + 体重比。
 *   pounceTicks 扑压时长：速度；低弧腾空几刻后触地开始滑。
 *   slideLength 滑行距离：速度 + 体重；配置 scorch 拉长。
 *   slideSpeed  滑行速度：速度；配置 scorch 略慢。
 *   scorchRadius 火痕宽度：体重；配置 scorch 更宽。
 *   scorchTicks  火痕留存：等级；只是一道很快熄灭的擦痕，不留伤害、不换方块。
 *   prepare/recover/cooldown 起手／收招／冷却：速度；配置 scorch 另加。
 *
 * 配置 `scorch`（炙压式，默认关）双向取舍：开＝滑得更远、火痕更宽更久、点燃概率更高、灼烧更久，但单发威力略低、
 * 出手与冷却更慢；关＝更短更重的一记疾扑，滑行短、火痕小。两向各有局面（铺火线 vs 打一发重压）。
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
        /** 冲撞威力：基础 40；体重比每超过 2 倍 1 点加 26.67（上限 +80）；物攻每比 60 多 1 加 0.25（上限 +24）；体重每比 100kg 多 1kg 加 0.4（上限 +18）；炙压 ×0.9 / 疾扑 ×1.08；夹在 36..160。 */
        crush: formula(
            F.base(40)
                .plus(heatcrashRatio.minus(2).clamp(0, 3).times(26.67))
                .plus(F.stat("attack").minus(60).times(0.25).clamp(-8, 24))
                .plus(F.body("weight").minus(1000).times(0.004).clamp(-6, 18))
                .times(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(0.9), F.const(1.08)))
                .clamp(36, 160).round(1),
            "冲撞威力", {
                unit: "威力",
                description: "燃着火的整副身躯贴地压过去的基础威力；**自己比对手越重越狠**（体重比是主曲线），物攻给出下压的狠度、绝对体重再压一层。命中时的防御、相性与暴击另算。"
            }),
        /** 点燃概率：基础 0.22；体重比每超过 1 倍 1 点加 0.09（上限 +0.36）；等级每高 1 级加 0.003（上限 +0.12）；炙压 ×1.25；夹在 0.12..0.75。 */
        burnChance: percent(
            F.base(0.22).plus(heatcrashRatio.minus(1).clamp(0, 4).times(0.09))
                .plus(F.level().minus(20).times(0.003).clamp(0, 0.12))
                .times(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(1.25), F.const(1)))
                .clamp(0.12, 0.75).round(3),
            "点燃概率", "压到目标后把它点着的概率；自己压过对手越多，火压得越实，炙压式更容易点燃。免疫灼烧的目标不受影响。"),
        /** 灼烧持续：基础 60 刻；等级每高 1 级加 1.5 刻（上限 +60）；炙压 ×1.2；夹在 50..160。 */
        burnTicks: seconds(
            F.base(60).plus(F.level().minus(20).times(1.5).clamp(0, 60))
                .times(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(1.2), F.const(1)))
                .clamp(50, 160).round(0),
            "灼烧持续", "被点着后带灼烧身份的时间；炙压式烧得更久。"),
        /** 明火时长：基础 16 刻；体重比每超过 1 倍 1 点加 4 刻（上限 +20）；夹在 12..44。 */
        igniteTicks: seconds(
            F.base(16).plus(heatcrashRatio.minus(1).clamp(0, 4).times(4)).clamp(12, 44).round(0),
            "明火时长", "压中瞬间把目标点成明火的时间；压得越狠烧得越久。免疫火的生物只会被压，不会被点着。"),
        /** 压击半径：基础 1.4 格；碰撞箱每比 1.4 高 1 格加 0.5（上限 +0.8）；体重每比 100kg 多 1kg 加 0.018（上限 +0.45）；夹在 1.2..2.8。 */
        landRadius: formula(
            F.base(1.4).plus(F.body("height").minus(1.4).times(0.5).clamp(0, 0.8))
                .plus(F.body("weight").minus(1000).times(0.018).clamp(0, 0.45))
                .clamp(1.2, 2.8).round(2),
            "压击半径", {
                unit: "格",
                description: "身体贴地压过去时罩住的半径；身板越大、越重压得越广。"
            }),
        /** 滑动判定半径：基础 0.45 格；碰撞箱每比 1.4 高 1 格加 0.14；夹在 0.35..0.8。 */
        collisionRadius: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.14)).clamp(0.35, 0.8).round(2),
            "滑动判定半径", {
                unit: "格",
                description: "贴地滑行时扫过的横向半径；身板越大越宽。"
            }),
        /** 顶开距离：基础 0.7 格；体重每比 100kg 多 1kg 加 0.035（上限 +1.2）；体重比每超过 1 倍 1 点加 0.12（上限 +0.5）；夹在 0.35..2.2。 */
        shove: formula(
            F.base(0.7).plus(F.body("weight").minus(1000).times(0.035).clamp(-0.2, 1.2))
                .plus(heatcrashRatio.minus(1).clamp(0, 4).times(0.12))
                .clamp(0.35, 2.2).round(2),
            "顶开距离", {
                unit: "格",
                description: "压中时把目标推开多远；越重、压过对手越多推得越开。"
            }),
        /** 扑压时长：基础 4 刻；速度每比 60 快 1 减 0.02 刻（上限 ±1）；夹在 3..6。 */
        pounceTicks: seconds(
            F.base(4).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 1)).clamp(3, 6).round(0),
            "扑压时长", "低低扑出去的短短一弧所用时间；几刻后触地开始滑行。"),
        /** 滑行距离：基础 2.6 格；速度每比 60 快 1 加 0.02（上限 +0.8）；体重每比 100kg 多 1kg 加 0.015（上限 +0.5）；炙压 ×1.25 / 疾扑 ×0.9；夹在 2.0..4.6。 */
        slideLength: formula(
            F.base(2.6).plus(F.stat("speed").minus(60).times(0.02).clamp(-0.4, 0.8))
                .plus(F.body("weight").minus(1000).times(0.015).clamp(0, 0.5))
                .times(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(1.25), F.const(0.9)))
                .clamp(2.0, 4.6).round(2),
            "滑行距离", {
                unit: "格",
                description: "触地后贴地向前滑多远；驱动目标接受范围。炙压式滑得更远。"
            }),
        /** 滑行速度：基础 0.7 格/刻；速度每比 60 快 1 加 0.006（上限 +0.25）；炙压 ×0.9；夹在 0.5..1.1。 */
        slideSpeed: formula(
            F.base(0.7).plus(F.stat("speed").minus(60).times(0.006).clamp(0, 0.25))
                .times(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(0.9), F.const(1)))
                .clamp(0.5, 1.1).round(2),
            "滑行速度", {
                unit: "格/刻",
                description: "贴地滑行每刻前进多远；越快越难在中途站住。"
            }),
        /** 火痕宽度：基础 0.45 格；体重每比 100kg 多 1kg 加 0.02（上限 +0.5）；炙压 ×1.4；夹在 0.4..1.3。仅画面，不对玩家展示数值。 */
        scorchRadius: formula(
            F.base(0.45).plus(F.body("weight").minus(1000).times(0.02).clamp(0, 0.5))
                .times(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(1.4), F.const(1)))
                .clamp(0.4, 1.3).round(2),
            "火痕宽度", {
                unit: "格",
                visible: false,
                description: "滑过处那道火擦痕的宽度；越重、炙压式擦痕越宽。它只是画面，不留伤害。"
            }),
        /** 火痕留存：基础 40 刻；等级每高 1 级加 1 刻；炙压 ×1.3；夹在 30..90。仅画面。 */
        scorchTicks: seconds(
            F.base(40).plus(F.level().minus(20).times(1))
                .times(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(1.3), F.const(1)))
                .clamp(30, 90).round(0),
            "火痕留存", "滑过处火擦痕留多久；停止后很快熄灭。它不造成伤害、也不改变方块。", { base: 40 }),
        /** 起手：基础 8 刻；速度每比 60 快 1 减 0.04 刻（上限 −3）；炙压 +2；夹在 5..14。 */
        prepare: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.04).clamp(-1, 3))
                .plus(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(2), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "让全身火苗卷起来、蓄到能扑出去的时间；炙压式起得更慢。"),
        /** 收招：基础 10 刻；速度每比 60 快 1 减 0.03 刻（上限 −4）；炙压 +2；夹在 6..18。 */
        recover: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03).clamp(-1, 4))
                .plus(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(2), F.const(0)))
                .clamp(6, 18).round(0),
            "收招", "滑停后重新站稳的收势；炙压式更久。"),
        /** 冷却：基础 40 刻；速度每比 60 快 1 减 0.06 刻（上限 −8）；炙压 +8；夹在 26..64。 */
        cooldown: seconds(
            F.base(40).minus(F.stat("speed").minus(60).times(0.06).clamp(-2, 8))
                .plus(F.when(F.pref("scorch", text("worldcombat.skill.heatcrash.preference.scorch")), F.const(8), F.const(0)))
                .clamp(26, 64).round(0),
            "冷却", "两次高温重压之间的等待；炙压式缓得更久。")
    });

    stages("heatcrash", [
        { level: 30, values: { crush: 60 } },
        { level: 50, values: { crush: 78, slideLength: 3.6 } }
    ]);

    defineDamage("heatcrash", "crush", { defenceCoefficient: 0.005 }, { contact: true });

    describe("heatcrash", [
        { key: "description.0", values: ["crush","landRadius"] },
        { key: "description.1", values: ["burnChance","burnTicks","igniteTicks"] },
        { key: "description.2", values: ["pounceTicks","slideLength","slideSpeed","shove"] },
        { key: "description.3", values: [] },
        { key: "scorch.on", values: [], when: function (context) { return read(context.detail.values, ["scorch"]) === true; } },
        { key: "scorch.off", values: [], when: function (context) { return read(context.detail.values, ["scorch"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.crush"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.crush", "tier.1.slideLength"] }
    ]);
}
