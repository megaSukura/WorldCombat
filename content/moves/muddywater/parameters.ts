/**
 * 浊流 / muddywater 的参数与伤害段。
 *
 * 原生事实：Water／特殊／威力 90／命中 85／PP 10／target allAdjacentFoes，30% 概率使目标命中下降 1 级；
 *   102 位学习者（Cobblemon 1.8 / Showdown）。描述「向对手喷射浑浊的水进行攻击。有时会降低对手的命中率」。
 *
 * 翻译：把「喷射浑浊的水」落成一道**贴着地面向前推的浑浊泥浪**——泥水从脚下整片漫出去，从近到远一层层
 *   扫过身前 `span` 度的扇形；扫到的每个非友方各吃一次 `surge`，有 `murkChance` 概率被泥水糊住眼睛、掉
 *   `murkStages` 级命中，并带上共享身份 `world_combat:status/murky`（本单元发明：被泥水糊到）。浪推完，
 *   扫过的地面只留下一层 `siltTicks` 之内的短泥膜粒子，不改动任何方块。
 *
 * 与同族分开：冲浪是自身脚下 360 度整圈、水漫且浇湿；水枪是细快水线；泡沫光线是一团会黏的泡沫球；
 *   浊流是**单向、贴地、缓慢推进的宽泥浪**，不带湿身、不整圈，卖的是「一片地面被泥水抹过去」。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   surge      泥浪威力：特攻定水的冲劲，等级定分量；淤积式把力道摊开所以更轻。
 *   reach      射程：特攻与等级决定能漫多远。它也是本招实际射程来源。
 *   span       扇面张角：碰撞箱宽度决定泥浪铺开多宽；淤积式更宽。
 *   sweep      推进步数：速度决定浪推得多快（每刻一步）；淤积式多推两步。
 *   murkChance 糊眼概率：原生 30% 起，特攻与等级提高咬住的机会；淤积式更高。
 *   murkStages 掉命中级数：特攻很高或淤积式时一次掉 2 级。
 *   murkTicks  糊眼时长：等级与淤积式决定。
 *   maxTargets 覆盖人数：碰撞箱宽度决定一片泥浪能同时污到几个。
 *   drops      泥点数量：特攻与等级驱动，直接驱动表现的密度。
 *   siltTicks  泥膜时长：等级、体重与淤积式决定地上那层短泥膜留多久（纯表现）。
 *   tempo／aftercast／recharge：速度与等级定节奏，淤积式更慢更贵。
 *
 * 配置 `silted`（淤积式）双向取舍（默认关）：
 *   开＝扇面 ×1.35、糊眼概率 +12%、可掉 2 级、糊眼时长 ×1.6、泥膜时长 ×1.5；代价是威力 ×0.85、
 *     射程 −1.5 格、推进 −1 步、起手 +3 刻、冷却 +6 刻——铺得广、留得久。
 *   关（急流）＝威力 ×1.12、射程 +1.5 格、推进 +1 步、糊眼概率 −6%、糊眼时长 ×0.8、泥膜时长 ×0.75——冲得急、打得重。
 *
 * 伤害段 `surge`（参数同名）走共享换算（原生类别 Special／Water）；对手特防、相性与暴击命中时另算。
 * 命中下降：真实 MobEffect 让任何战斗者「打不准」（攻击变弱），宝可梦那一层再用 NativeEffects.boost
 * 下降原生命中等级；效果同时挂共享身份 aim_impaired，别的单元可直接消费。
 */
namespace PokemonSkills {
    export const muddywaterId = "muddywater";
    export const muddywaterEffect = "world_combat:muddywater_murk";
    export const muddywaterScene = "world_combat:move_muddywater";
    export const muddywaterIdentity = "world_combat:status/murky";
    export const muddywaterMurkText = "world_combat.move.muddywater.text.murk";
    export const muddywaterMissText = "world_combat.move.muddywater.text.miss";

    actionParameters.define(muddywaterId, {
        /** 泥浪威力：90 + 特攻偏移[−12,36] + 等级(≥25)偏移[0,14]；淤积 ×0.85 / 急流 ×1.12；夹 58..150。 */
        surge: formula(
            F.base(90).plus(F.stat("specialAttack").minus(55).times(0.38).clamp(-12, 36))
                .plus(F.level().minus(25).times(0.5).clamp(0, 14))
                .times(F.when(F.pref("silted"), F.const(0.85), F.const(1.12)))
                .clamp(58, 150).round(1),
            "泥浪威力", {
                unit: "威力",
                description: "泥浪扫到目标那一下的基础威力；特攻越高水越冲、等级越高分量越足，淤积式把力道摊到更宽的地面上。对手特防、相性与暴击在命中时另算。"
            }),
        /** 射程：11 + 特攻偏移[−2,4] + 等级(≥25)偏移[0,2] + 淤积 −1.5 / 急流 +1.5；夹 8..16。 */
        reach: formula(
            F.base(11).plus(F.stat("specialAttack").minus(55).times(0.05).clamp(-2, 4))
                .plus(F.level().minus(25).times(0.05).clamp(0, 2))
                .plus(F.when(F.pref("silted"), F.const(-1.5), F.const(1.5)))
                .clamp(8, 16).round(1),
            "射程", {
                unit: "格",
                description: "泥浪能漫到多远；特攻高、等级高的个体推得更远，急流更远。它也是本招的实际射程来源。"
            }),
        /** 扇面张角：70 + 体型宽度偏移[−12,60]；淤积 ×1.35；夹 45..150。 */
        span: formula(
            F.base(70).plus(F.body("width").minus(0.9).times(45).clamp(-12, 60))
                .times(F.when(F.pref("silted"), F.const(1.35), F.const(1)))
                .clamp(45, 150).round(0),
            "扇面张角", {
                unit: "度",
                description: "泥浪在身前铺开的扇形张角；身体越宽铺得越开，淤积式更宽。判定与画面共用同一个扇形。"
            }),
        /** 推进步数：6 + 速度偏移[−1,2] + 淤积 +2 / 急流 −1；夹 3..10（每刻一步）。 */
        sweep: formula(
            F.base(6).plus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("silted"), F.const(2), F.const(-1)))
                .clamp(3, 10).round(0),
            "推进步数", {
                unit: "步",
                description: "泥浪从脚下推到射程尽头要走几步（每刻一步）；速度越快推得越快，淤积式更慢。"
            }),
        /** 糊眼概率：基础 0.30 + 特攻偏移[0,0.18] + 等级偏移[0,0.05] + 淤积 +0.12 / 急流 −0.06；夹 0.12..0.62。 */
        murkChance: percent(
            F.base(0.30).plus(F.stat("specialAttack").minus(55).times(0.002).clamp(0, 0.18))
                .plus(F.level().minus(25).times(0.001).clamp(0, 0.05))
                .plus(F.when(F.pref("silted"), F.const(0.12), F.const(-0.06)))
                .clamp(0.12, 0.62).round(3),
            "糊眼概率", "泥水糊住目标眼睛、把它命中降下来的概率；原生 30% 起，特攻与等级越高越容易糊住。"),
        /** 掉命中级数：1 + 特攻 ≥ 115 + 淤积 1；夹 1..2。 */
        murkStages: formula(
            F.base(1).plus(F.stat("specialAttack").gte(115))
                .plus(F.when(F.pref("silted"), F.const(1), F.const(0)))
                .clamp(1, 2).round(0),
            "掉命中级数", {
                unit: "级",
                description: "被泥水糊住时一次掉几级命中；特攻很高的个体（≥115）或淤积式会一次掉 2 级。"
            }),
        /** 糊眼时长：基础 100 刻 + 等级(≥25)偏移[0,50]；淤积 ×1.6 / 急流 ×0.8；夹 60..260。 */
        murkTicks: seconds(
            F.base(100).plus(F.level().minus(25).times(1.2).clamp(0, 50))
                .times(F.when(F.pref("silted"), F.const(1.6), F.const(0.8)))
                .clamp(60, 260).round(0),
            "糊眼时长", "被泥水糊住、带着共享身份 murky 的时间；等级越高、淤积式留得越久。"),
        /** 覆盖人数：2 + 体型宽度偏移[−1,4]；夹 1..6 取整。 */
        maxTargets: formula(
            F.base(2).plus(F.body("width").minus(0.9).times(2.5).clamp(-1, 4)).clamp(1, 6).round(0),
            "覆盖人数", {
                unit: "个",
                description: "一片泥浪最多同时污到几个敌人；身体越宽罩得越多。"
            }),
        /** 泥点数量：18 + 特攻偏移[−5,20] + 等级(≥25)偏移[0,12]；夹 12..60。 */
        drops: formula(
            F.base(18).plus(F.stat("specialAttack").minus(55).times(0.22).clamp(-5, 20))
                .plus(F.level().minus(25).times(0.5).clamp(0, 12)).clamp(12, 60).round(0),
            "泥点数量", {
                unit: "点",
                description: "泥浪与命中处用到的泥点数量，也驱动表现的密度；特攻与等级越高越密。"
            }),
        /** 泥膜时长：24 + 体重偏移[0,14] + 等级(≥25)偏移[0,12]；淤积 ×1.5 / 急流 ×0.75；夹 16..64（纯表现，不改方块）。 */
        siltTicks: seconds(
            F.base(24).plus(F.body("weight").times(0.05).clamp(0, 14))
                .plus(F.level().minus(25).times(0.4).clamp(0, 12))
                .times(F.when(F.pref("silted"), F.const(1.5), F.const(0.75)))
                .clamp(16, 64).round(0),
            "泥膜时长", "浪推完后扫过的地面留下的短泥膜停留多久，到期自然散去；只影响画面，不替换任何方块。越重的个体带得越多、淤积式留得更久。"),
        /** 起手：12 − 速度偏移[−1.5,3] + 淤积 3；夹 7..18。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 3))
                .plus(F.when(F.pref("silted"), F.const(3), F.const(0))).clamp(7, 18).round(0),
            "起手", "把一口浑水囤起来再漫出去的时间；速度越快越短，淤积式要多囤一下。"),
        /** 收招：9 − 速度偏移[−1,2]；夹 5..13。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2)).clamp(5, 13).round(0),
            "收招", "泥浪推完后收势的时间；快的个体更利落。"),
        /** 冷却：44 − 速度偏移[−3,6] + 淤积 6；夹 26..60。 */
        recharge: seconds(
            F.base(44).minus(F.stat("speed").minus(55).times(0.06).clamp(-3, 6))
                .plus(F.when(F.pref("silted"), F.const(6), F.const(0))).clamp(26, 60).round(0),
            "冷却", "再漫一次浑水前等待多久；速度快的个体回得稍快，淤积式更久。")
    });

    stages(muddywaterId, [
        { level: 38, values: { surge: 104, murkChance: 0.38 } },
        { level: 55, values: { surge: 122, span: 86, murkTicks: 160 } }
    ]);

    defineDamage(muddywaterId, "surge", {});

    describe(muddywaterId, [
        { key: "description.0", values: ["surge","murkChance","murkStages"] },
        { key: "description.1", values: ["span", "reach", "sweep"] },
        { key: "description.2", values: ["murkTicks"] },
        { key: "description.3", values: ["maxTargets"] },
        { key: "silted.on", values: [], when: function (context) { return read(context.detail.values, ["silted"]) === true; } },
        { key: "silted.off", values: [], when: function (context) { return read(context.detail.values, ["silted"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.surge", "tier.0.murkChance"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.surge", "tier.1.span", "tier.1.murkTicks"] }
    ]);
}
