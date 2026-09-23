/**
 * 水蒸气 / hydrosteam —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Water／特殊／威力 80／命中 100／PP 15／单体；`thawsTarget`（化开目标
 *   的冰冻）、`defrost`（化开自己的冰冻）；「将煮得翻滚的开水猛烈地喷向对手。日照强烈时，招式威力不但不会
 *   降低，还会变成 1.5 倍」。
 *
 * 翻译：把「煮得翻滚的开水」落成**一条滚烫的蒸汽扇面**——施法者体内的水在起手时烧开，随后从身前喷出一条
 *   向外张开的蒸汽；被罩住的敌人各挨一次烫、被蒸汽顶开一点，身上的冰冻被化开，并被熏得湿透。烈日下蒸汽
 *   更烫（×1.5）、也张得更开更高，画面里的白汽更浓更亮。
 *   与同族分开：热水抛的是会烫伤人的沸水并留下烫池；蒸气是一条向前张开、会**解冻**的扇面，且只有它在
 *   强日照下变强（不受日照削弱）。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   steam      蒸汽威力：特攻定水温；强日照 ×1.5；闷蒸式 ×0.9、喷射式 ×1.08；夹 55..220。
 *   reach      扇面长度：特攻越高喷得越远；闷蒸式略近。
 *   angle      张角：等级定火候，强日照再张宽一截；闷蒸式更宽。
 *   soakTicks  湿身时长：等级越高留得越久；闷蒸式更久。
 *   push       顶开距离：特攻与体重派生，蒸汽把目标沿背离方向推开。
 *   vapor      白汽量：特攻换算，驱动表现密度。
 *   boil／settle／recharge：速度定节奏；闷蒸式更慢更费。
 *
 * 配置 `bellow`（闷蒸式）双向取舍：开＝张角 ×1.35、湿身 ×1.3，但威力 ×0.9、射程 ×0.9、起手 +2、冷却 +6；
 *   关（喷射式，默认）＝更窄更烫更快，适合点名单体。罩住一圈 vs 烫穿一个，各有局面。
 *
 * 伤害段 `steam` 走共享换算（原生类别 Special，带 defrost 语义由本单元在命中时化解冰冻）。
 */
namespace PokemonSkills {
    export const hydrosteamId = "hydrosteam";
    export const hydrosteamScene = "world_combat:move_hydrosteam";
    export const hydrosteamSoaked = "world_combat:hydrosteam_soaked";
    export const hydrosteamThawText = "world_combat.move.hydrosteam.text.thaw";
    export const hydrosteamSunText = "world_combat.move.hydrosteam.text.sun";
    export const hydrosteamHitText = "world_combat.move.hydrosteam.text.hit";
    export const hydrosteamReference = 8;

    /** 当前是否处在强日照：与公式同一读数（日光 ≥ 0.85），供伤害段与表现读取。 */
    export function hydrosteamSunlit(world: CombatWorld, actor: CombatActor): boolean {
        const body = world.observe(actor);
        return body !== null && WorldEnvironment.sunlight(world, body.position()) >= 0.85;
    }

    actionParameters.define(hydrosteamId, {
        /** 蒸汽威力：80 + 特攻偏移[−15,34]；强日照 ×1.5；闷蒸 ×0.9 / 喷射 ×1.08；夹 55..220。 */
        steam: formula(
            F.base(80)
                .plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-15, 34))
                .times(F.when(F.world("sunlight", text("worldcombat.skill.hydrosteam.value.sunlight")).gte(0.85),
                    F.const(1.5), F.const(1)).as(text("worldcombat.skill.hydrosteam.value.sunlit")))
                .times(F.when(F.pref("bellow", text("worldcombat.skill.hydrosteam.preference.bellow")), F.const(0.9), F.const(1.08)))
                .clamp(55, 220).round(1),
            "蒸汽威力", {
                unit: "威力",
                description: "这条蒸汽扇面打在身上那一下的威力；特攻越高水温越足。**强日照下 ×1.5**（不像普通水招那样被日照削弱）。对手特防、相性与暴击在命中时另算。"
            }),
        /** 扇面长度：8 + 特攻偏移[−1,3]；闷蒸 ×0.9；强日照再 +1.2；夹 6..15。也是实际射程来源。 */
        reach: formula(
            F.base(8).plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-1, 3))
                .times(F.when(F.pref("bellow", text("worldcombat.skill.hydrosteam.preference.bellow")), F.const(0.9), F.const(1)))
                .plus(F.world("sunlight", text("worldcombat.skill.hydrosteam.value.sunlight")).times(1.2))
                .clamp(6, 15).round(1),
            "扇面长度", {
                unit: "格",
                description: "蒸汽从身前喷出多远，也是本招的实际射程；特攻越高、日照越强喷得越远。"
            }),
        /** 张角：42 + 等级偏移[−4,16] + 日光 ×10；闷蒸 ×1.35；夹 28..90。 */
        angle: formula(
            F.base(42).plus(F.level().minus(30).times(0.4).clamp(-4, 16))
                .plus(F.world("sunlight", text("worldcombat.skill.hydrosteam.value.sunlight")).times(10))
                .times(F.when(F.pref("bellow", text("worldcombat.skill.hydrosteam.preference.bellow")), F.const(1.35), F.const(1)))
                .clamp(28, 90).round(0),
            "张角", {
                unit: "度",
                description: "蒸汽扇面张多宽；等级越高火候越足、烈日下更炸开，闷蒸式更宽。"
            }),
        /** 湿身时长：100 + 等级 ×0.8；闷蒸 ×1.3；夹 60..240。 */
        soakTicks: seconds(
            F.base(100).plus(F.level().times(0.8))
                .times(F.when(F.pref("bellow", text("worldcombat.skill.hydrosteam.preference.bellow")), F.const(1.3), F.const(1)))
                .clamp(60, 240).round(0),
            "湿身时长", "被蒸汽熏湿的目标带着湿透身份多久；等级越高、闷蒸式留得越久。它借共享身份 soaked。"),
        /** 顶开距离：0.15 + 特攻偏移[0,0.4] + 体重偏移[0,0.25]；夹 0.1..0.8。 */
        push: formula(
            F.base(0.15)
                .plus(F.stat("specialAttack").minus(60).times(0.008).clamp(0, 0.4))
                .plus(F.body("weight").minus(60).times(0.0025).clamp(0, 0.25))
                .clamp(0.1, 0.8).round(2),
            "顶开距离", {
                unit: "格",
                description: "蒸汽把被喷中的目标沿背离方向顶开多远；特攻高、体格大的个体顶得越开。"
            }),
        /** 白汽量：20 + 特攻偏移[−5,28]；强日照 ×1.4；夹 14..60。 */
        vapor: formula(
            F.base(20).plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-5, 28))
                .times(F.when(F.world("sunlight", text("worldcombat.skill.hydrosteam.value.sunlight")).gte(0.85), F.const(1.4), F.const(1)))
                .clamp(14, 60).round(0),
            "白汽量", {
                unit: "团",
                description: "喷出时翻滚的白汽数量，也驱动画面密度；特攻越高、烈日下越浓。"
            }),
        /** 一次最多罩住几个敌人：固定 4。 */
        maxTargets: hidden(4),
        /** 起手：10 − 速度偏移[−1.5,2] + 闷蒸 2；夹 5..16。 */
        boil: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("bellow", text("worldcombat.skill.hydrosteam.preference.bellow")), F.const(2), F.const(0))).clamp(5, 16).round(0),
            "起手", "把水烧开、憋在身前的时间；速度越快越短，闷蒸式多烧一会儿。"),
        /** 收招：8 − 速度偏移[−1.5,1.5]；夹 4..12。 */
        settle: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.015).clamp(-1.5, 1.5)).clamp(4, 12).round(0),
            "收招", "喷完后收住蒸汽的时间；速度快的个体更利落。"),
        /** 冷却：26 − 速度偏移[−3,4] + 闷蒸 6 / 喷射 −2；夹 18..42。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(55).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("bellow", text("worldcombat.skill.hydrosteam.preference.bellow")), F.const(6), F.const(-2))).clamp(18, 42).round(0),
            "冷却", "再烧一炉蒸汽前的等待；速度越快回得越快，闷蒸式更费。")
    });

    defineDamage(hydrosteamId, "steam", { defenceCoefficient: 0.0048, rationale: "高温蒸汽绕过正面架势，对防御穿透略强，让日照与特攻的差别更可见。" }, {});

    stages(hydrosteamId, [
        { level: 40, values: { steam: 96 } },
        { level: 56, values: { steam: 112, angle: 52 } }
    ]);

    describe(hydrosteamId, [
        { key: "description.0", values: ["steam"] },
        { key: "description.1", values: ["reach", "angle"] },
        { key: "description.2", values: ["soakTicks", "push"] },
        { key: "rule.thaw", values: [] },
        { key: "bellow.on", values: [], when: function (context) { return read(context.detail.values, ["bellow"]) === true; } },
        { key: "bellow.off", values: [], when: function (context) { return read(context.detail.values, ["bellow"]) !== true; } },
        { key: "timing", values: ["range", "boil", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.steam"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.steam", "tier.1.angle"] }
    ]);
}
