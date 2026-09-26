/**
 * 绑紧 / bind 的参数与伤害段。
 *
 * 原生事实：Normal／物理／威力 15／命中 85／PP 20／优先度 0／接触，volatile partiallytrapped（4–5 回合）。
 * 描述「使用长长的身体或藤蔓等，在 4～5 回合内绑紧对手进行攻击」。
 *
 * 翻译：保留「用长长的身体或藤蔓绑住对手、持续收紧」，翻成即时战斗里**一根绷在两者之间的缚索**：
 * 命中先缠上，此后绳的一头系在施法者身上、另一头拴着目标——目标想跑就被拽回来，绳绷紧时每勒一下更紧一点；
 * 施法者也被绳的张力拖慢。它不是定身：目标能动、能打，但走不出这根绳；施法者被拉开、目标也一起被拽。
 * 挣脱的方式有三种：**把绳扯断**（任一方被位移到 `snap` 之外）、**被实墙隔断**（两端之间不再通视），
 * 或等绳自己走完 `duration`；任一端身上的束缚被清除或任一方倒下也会松开。
 *
 * 与同族分开（束缚对的两招，命中后世界继续变化）：
 *   紧束 —— 藤蔓把目标裹住、钉在原地并压住它的力气，藤不需要施法者维持；
 *   绑紧 —— 绳系在施法者身上，把目标拴在身边拖着走，越拉越紧，代价是施法者也被拖慢。
 *   与已有的缠绕（一次性减速＋短定身）、贝壳夹击（双方都被钉住）也不同：绑紧是**可移动的牵引**。
 *
 * 数据分散（每项读不同的精灵数据，目标侧也用目标事实）：
 *   cinch    每勒一下的威力：物攻给收紧的力，等级拾级抬升；勒得越紧倍率越高（`ramp`）。
 *   leash    绳长：身高给身体/藤蔓的长度，也是目标能被拽离施法者的最大距离。
 *   reach    出手距离：身高给甩出的长度，也是实际射程。
 *   grip     抓取判定：体宽给缠住的容差。
 *   drag     回拽强度：物攻给力气，再按**目标体重**衰减（越重越难拽动）。
 *   ramp     每勒一次的加紧：物攻给熟练度；勒紧式明显更高。
 *   duration 束缚时长：等级决定绳留多久。
 *   snap     扯断距离：身高给一点余量；被击退或瞬移跨过它就绷断。
 *   interval 勒紧间隔：速度决定多快勒一下。
 *   notes    藤屑数量：物攻换算，表现按它发射。
 *   tempo／aftercast／recharge：速度定节奏，等级让冷却回得更快。
 *
 * 配置 `choke`（勒紧式，默认关）双向取舍：开＝绳更短、每勒加紧更快、回拽更狠、留得更久，但基础威力更低、
 * 冷却更久，目标被死死拖在脚边；关（牵引式）＝绳更长、加紧更缓、威力满值，宽容地牵着走，自己也松快些。
 *
 * 伤害段 `cinch` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("bind", {
        /** 缚索威力：15 + 物攻偏移[−5,20] + 等级(≥20)偏移[0,10]；勒紧 ×1.1；夹 10..52。 */
        cinch: formula(
            F.base(15)
                .plus(F.stat("attack").minus(55).times(0.2).clamp(-5, 20))
                .plus(F.level().minus(20).times(0.2).clamp(0, 10))
                .times(F.when(F.pref("choke", text("worldcombat.skill.bind.preference.choke")), F.const(1.1), F.const(1)))
                .clamp(10, 52).round(1),
            "缚索威力", {
                unit: "威力",
                description: "绳每勒一下结算一次的基础威力，随收紧程度（ramp）逐次抬高；对手防御、相性与暴击在命中时另算。"
            }),
        /** 绳长：3.0 + 身高偏移[0,0.9]；勒紧 ×0.78；夹 2.2..4.4 格。 */
        leash: formula(
            F.base(3.0).plus(F.body("height").minus(1.4).times(0.55).clamp(0, 0.9))
                .times(F.when(F.pref("choke", text("worldcombat.skill.bind.preference.choke")), F.const(0.78), F.const(1)))
                .clamp(2.2, 4.4).round(2),
            "绳长", {
                unit: "格",
                description: "目标能被拽离施法者的最大距离；超过它就会被每刻拉回。绳越长越像牵着走，越短越贴身。"
            }),
        /** 出手距离：3.4 + 身高偏移[0,0.8]；夹 2.8..4.6 格。 */
        reach: formula(
            F.base(3.4).plus(F.body("height").minus(1.4).times(0.5).clamp(0, 0.8)).clamp(2.8, 4.6).round(2),
            "出手距离", {
                unit: "格",
                description: "长身或藤蔓能甩出去多远掉头缠住目标；身高给长度，也是本招的实际射程来源。"
            }),
        /** 抓取判定：0.45 + 体宽偏移[−0.05,0.4]；夹 0.35..0.95 格。 */
        grip: formula(
            F.base(0.45).plus(F.body("width").minus(0.9).times(0.4).clamp(-0.05, 0.4)).clamp(0.35, 0.95).round(2),
            "抓取判定", {
                unit: "格",
                description: "甩出去那一下缠住目标的横向容差；身板越宽缠面越大。侧身站得够开就可能被躲过。"
            }),
        /** 回拽强度：0.35 + 物攻偏移[0,0.3]，再 ÷(1 + 目标体重/200)；勒紧 ×1.25；夹 0.15..0.9 格/刻。 */
        drag: formula(
            F.base(0.35)
                .plus(F.stat("attack").minus(60).times(0.006).clamp(0, 0.3))
                .times(F.when(F.pref("choke", text("worldcombat.skill.bind.preference.choke")), F.const(1.25), F.const(1)))
                .div(F.const(1).plus(F.target("body.weight").as("目标体重").div(200)))
                .clamp(0.15, 0.9).round(3),
            "回拽强度", {
                unit: "格/刻",
                description: "绳绷直时每刻把目标拉回多少；物攻给力气，目标越重越难拽动。勒紧式拉得更狠。"
            }),
        /** 每勒一次的加紧：0.12 + 物攻偏移[0,0.2]；勒紧 ×1.6；夹 0.08..0.45。 */
        ramp: formula(
            F.base(0.12).plus(F.stat("attack").minus(60).times(0.004).clamp(0, 0.2))
                .times(F.when(F.pref("choke", text("worldcombat.skill.bind.preference.choke")), F.const(1.6), F.const(1)))
                .clamp(0.08, 0.45).round(3),
            "每勒一次的加紧", {
                unit: "倍/次",
                description: "每勒一下，后续威力与绳长各收紧多少；物攻给收紧的熟练度。这就是「越勒越紧」的速率。"
            }),
        /** 束缚时长：150 + 等级(≥25)偏移[0,60]；勒紧 ×1.15；夹 90..260 刻。 */
        duration: seconds(
            F.base(150).plus(F.level().minus(25).times(1.2).clamp(0, 60))
                .times(F.when(F.pref("choke", text("worldcombat.skill.bind.preference.choke")), F.const(1.15), F.const(1)))
                .clamp(90, 260).round(0),
            "束缚时长", "绳最多留多久；期间目标被拴在身边、不断被勒，直到绳走完或被扯断。"),
        /** 扯断距离：5.0 + 身高偏移[0,1.2]；夹 3.6..7.6 格。 */
        snap: formula(
            F.base(5.0).plus(F.body("height").minus(1.4).times(0.7).clamp(0, 1.2)).clamp(3.6, 7.6).round(2),
            "扯断距离", {
                unit: "格",
                description: "任一方被位移到超过这个距离，绳就绷断；被击退、冲刺或瞬移都可能一步扯断它。"
            }),
        /** 勒紧间隔：24 − 速度偏移[−6,6]；勒紧 ×0.85；夹 12..30 刻。 */
        interval: seconds(
            F.base(24).minus(F.stat("speed").minus(60).times(0.06).clamp(-6, 6))
                .times(F.when(F.pref("choke", text("worldcombat.skill.bind.preference.choke")), F.const(0.85), F.const(1)))
                .clamp(12, 30).round(0),
            "勒紧间隔", "绳两次收紧之间隔多久；速度越快勒得越密，勒紧式也更快。"),
        /** 藤屑数量：14 + 物攻偏移[−3,10]；夹 10..34 个。 */
        notes: formula(
            F.base(14).plus(F.stat("attack").minus(55).times(0.12).clamp(-3, 10)).clamp(10, 34).round(0),
            "藤屑数量", {
                unit: "个",
                description: "绳绷紧与摩擦时掉落的纤维碎屑数量，由物攻换算；表现按它发射，画面里的数量与机制一致。"
            }),
        /** 起手：7 − 速度偏移[−2,3]；夹 4..12 刻。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3)).clamp(4, 12).round(0),
            "起手", "把长身或藤蔓甩出去的时间；速度越快越短。"),
        /** 收招：6 − 速度偏移[−1.5,2.5]；夹 3..11 刻。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.025).clamp(-1.5, 2.5)).clamp(3, 11).round(0),
            "收招", "甩出后把姿态收回的时间；速度越快越短。"),
        /** 冷却：34 − 速度偏移[−5,8] − 等级(≥25)偏移[0,6] + 勒紧 +8；夹 20..52 刻。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(60).times(0.05).clamp(-5, 8))
                .minus(F.level().minus(25).times(0.15).clamp(0, 6))
                .plus(F.when(F.pref("choke", text("worldcombat.skill.bind.preference.choke")), F.const(8), F.const(0)))
                .clamp(20, 52).round(0),
            "冷却", "两次缚索之间的等待；速度与等级让它回得更快，勒紧式更久。")
    });

    stages("bind", [
        { level: 28, values: { cinch: 22 } },
        { level: 44, values: { cinch: 28, leash: 3.4, ramp: 0.2 } }
    ]);

    defineDamage("bind", "cinch", {}, { contact: true });

    describe("bind", [
        { key: "description.0", values: ["cinch","reach","grip"] },
        { key: "description.1", values: ["leash","drag","ramp","interval"] },
        { key: "description.2", values: ["duration","snap"] },
        { key: "description.aim", values: [] },
        { key: "description.slow", values: [] },
        { key: "choke.on", values: [], when: function (context) { return read(context.detail.values, ["choke"]) === true; } },
        { key: "choke.off", values: [], when: function (context) { return read(context.detail.values, ["choke"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cinch"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cinch", "tier.1.leash", "tier.1.ramp"] }
    ]);
}
