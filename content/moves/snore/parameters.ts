/**
 * 打鼾 / snore —— 参数与伤害段。
 *
 * 原生事实：Normal／特殊／威力 50／命中 100／PP 15／目标单体／30% 畏缩／sound／只能在自己睡着时使用。
 *
 * 翻译：把「睡着时漏出的一声鼾」落成一记从睡着的身体朝对手喷出的声波冲击。声音几乎即时抵达，命中一震；
 * 睡得越沉（剩余睡眠越长），这一声越响、送得越远。它只能在睡着时成立，睡着的人本来什么都做不了，
 * 所以这一招是从睡眠里挤出来的一次反击。开启回响可以把它拖成两段连着喷出的鼾声。
 *
 * 与同族的区分：
 *   吵闹（uproar）是以醒着的自己为圆心、连喊数圈、阻止周围人入睡的持续声浪；
 *   打鼾是睡着时朝一个目标喷出的、一响或两响的定向鼾声，命中后可能把人震懵（畏缩）。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   blast        鼾声威力 44 + 特攻偏移 + 睡意（剩余睡眠时长，越沉越响）；回响 ×0.78 / 单响 ×1.12。
 *   span         声波射程 9 + 特攻偏移 + 等级 + 睡意；它也是本招的实际射程来源。
 *   width        声波判定 0.55 格 + 体型高度偏移（口鼻大的个体吐出的声束更粗）。
 *   echoes       鼾声段数 1 + 回响配置 1；夹 1..2。
 *   gap          两段鼾声之间的间隔 7 刻 − 速度偏移（手快的连得更急）。
 *   stir         起手 8 刻 − 速度偏移 + 回响 2 刻（先翻个身把气吸满再喷）。
 *   settle       收招 6 刻，鼾声落下后缓一下。
 *   recharge     冷却 26 刻 − 速度偏移 + 回响 6 刻。
 *   flinchChance 畏缩几率 0.30（原生）+ 特攻偏移；回响 ×1.12。
 *   flinchTicks  畏缩持续 14 刻 + 睡意偏移（被更沉的一觉震得更久）。
 *
 * 配置 `echo`（回响）：开启＝两段鼾声、每段更轻、畏缩更密，但起手与冷却更长；关闭＝一记更重、更便宜。
 *
 * 伤害段 `blast` 与参数同名，走共享换算（原生类别 Special，Normal 属性）。畏缩状态由本单元的
 * `world_combat:snore_flinch` 承载，带共享身份 `world_combat:status/flinch`。
 */
namespace PokemonSkills {
    /** 睡意：施法者当前睡眠效果的剩余刻数；只在有现场且身上确有一觉时可用。 */
    defineFacts("snore", function (context) {
        return {
            read: function (id) {
                if (id !== "snore.sleep") return undefined;
                if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
                const effect = CombatStatus.representative(context.world, context.actor, "sleep");
                return effect === null ? undefined : effect.duration();
            }
        };
    });

    actionParameters.define("snore", {
        /** 鼾声威力：44 + 特攻偏移[−14,30] + 睡意[0,9.6]；回响 ×0.78 / 单响 ×1.12；夹 28..96。 */
        blast: formula(
            F.base(44)
                .plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-14, 30))
                .plus(F.var("snore.sleep", "睡意").div(20).clamp(0, 6).times(1.6))
                .times(F.when(F.pref("echo"), F.const(0.78), F.const(1.12)))
                .clamp(28, 96).round(1),
            "鼾声威力", {
                unit: "威力",
                description: "一声鼾落到目标身上的威力；特攻越高气越足，睡得越沉这一声越响。对手特防、相性与暴击在命中时另算。"
            }),
        /** 声波射程：9 + 特攻偏移[−1.2,3] + 等级[0,2.5] + 睡意[0,1.8]；夹 6..16。 */
        span: formula(
            F.base(9)
                .plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-1.2, 3))
                .plus(F.level().minus(25).times(0.05).clamp(0, 2.5))
                .plus(F.var("snore.sleep", "睡意").div(20).clamp(0, 6).times(0.3))
                .clamp(6, 16).round(2),
            "声波射程", {
                unit: "格",
                description: "鼾声能喷出多远；特攻与等级越高、睡得越沉，声音送得越远。它也是本招的实际射程来源。"
            }),
        /** 声波判定：0.55 + 体型高度偏移[−0.1,0.35]；夹 0.4..1.2。 */
        width: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.1, 0.35)).clamp(0.4, 1.2).round(2),
            "声波判定", {
                unit: "格",
                description: "鼾声束能擦到多大一圈；口鼻大的个体吐出的声束更粗。"
            }),
        /** 鼾声段数：1 + 回响配置 1；夹 1..2。 */
        echoes: formula(
            F.base(1).plus(F.when(F.pref("echo"), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "鼾声段数", {
                unit: "段",
                description: "这一觉里连着喷出几声鼾；回响开启时两声，每声更轻但各掷一次畏缩。"
            }),
        /** 鼾声间隔：7 − 速度偏移[−1,2]；夹 4..10。 */
        gap: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(4, 10).round(0),
            "鼾声间隔", "两段鼾声之间隔多久；速度快的个体连得更急。"),
        /** 起手：8 − 速度偏移[−2,3] + 回响 2；夹 5..14。 */
        stir: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.04).clamp(-2, 3))
                .plus(F.when(F.pref("echo"), F.const(2), F.const(0))).clamp(5, 14).round(0),
            "起手", "从睡着到喷出第一声鼾的时间；速度快的个体醒得更利落，回响要多吸一口气。"),
        /** 收招：6 刻；喷完缓一下。 */
        settle: seconds(F.base(6).clamp(3, 12).round(0), "收招", "最后一声鼾落下后收住的时间。"),
        /** 冷却：26 − 速度偏移[−3,5] + 回响 6；夹 18..40。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(55).times(0.1).clamp(-3, 5))
                .plus(F.when(F.pref("echo"), F.const(6), F.const(0))).clamp(18, 40).round(0),
            "冷却", "这一次鼾声之后再攒出一声需要多久；速度快的个体回得更快，回响更费。"),
        /** 畏缩几率：0.30 + 特攻偏移[−0.05,0.10]；回响 ×1.12；夹 0.15..0.45。 */
        flinchChance: percent(
            F.base(0.30).plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.05, 0.10))
                .times(F.when(F.pref("echo"), F.const(1.12), F.const(1))).clamp(0.15, 0.45),
            "畏缩几率", "每一声鼾命中的基础畏缩几率（原生 30%）；特攻越高越容易把人震懵，回响两段各掷一次。"),
        /** 畏缩持续：14 + 睡意偏移[0,3.6]；夹 12..20。 */
        flinchTicks: seconds(
            F.base(14).plus(F.var("snore.sleep", "睡意").div(20).clamp(0, 6).times(0.6)).clamp(12, 20).round(0),
            "畏缩持续", "被震懵的人在这段时间内无法开始新动作；更沉的一觉震得更久。")
    });

    defineDamage("snore", "blast", {});

    stages("snore", [
        { level: 35, values: { blast: 58, span: 10.5 } },
        { level: 50, values: { blast: 70, span: 12, flinchChance: 0.38 } }
    ]);

    describe("snore", [
        { key: "description.0", values: ["blast","echoes"] },
        { key: "description.1", values: ["span", "width"] },
        { key: "description.2", values: ["flinchChance","flinchTicks"] },
        { key: "echo.on", values: [], when: function (context) { return read(context.detail.values, ["echo"]) === true; } },
        { key: "echo.off", values: [], when: function (context) { return read(context.detail.values, ["echo"]) !== true; } },
        { key: "timing", values: ["range", "stir", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blast", "tier.0.span"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.blast", "tier.1.span", "tier.1.flinchChance"] }
    ]);
}
