/**
 * 水炮 / hydropump 的参数与伤害段。
 *
 * 原生事实：Water／特殊／威力 110／命中 80／PP 5／优先度 0／无次要效果／目标单体；
 *   177 位学习者（Cobblemon 1.8 / Showdown）。描述「向对手猛烈地喷射大量水流进行攻击」。
 *
 * 翻译：把「大量水流」落成一记**整柱轰出的洪流**——不是加农水炮那种又细又准的高压水柱，而是水多到会漫开：
 *   主目标被整柱砸中并沿水柱方向顶开，水花在落点炸开、回溅到附近一圈，把那一圈也浇透。它慢、贵、看得见
 *   起手（蓄水很久），所以给对手留出走位窗口；命中 80 就翻成「准线附近会散」加「起手长」这两件看得见的事，
 *   而不是一次暗掷。
 *
 * 与场上最像的招分开：加农水炮是笔直单点高压柱、放完施法者力竭；水炮是**体积**——判定粗、回溅范围大、
 *   一次浇透目标身边一圈，但没有力竭、单点威力也更低。喷水（waterspout）是从脚下整圈漫出，水炮是朝准线轰。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   torrent   洪流威力：特攻定水压，等级定水势。
 *   splash    回溅威力：特攻决定溅到旁人那一圈有多重。
 *   radius    水柱判定：身高决定水柱/水头多粗。
 *   backwash  回溅半径：碰撞箱宽度决定漫开多大一圈，也是画面里那圈水花的半径。
 *   blow      推距：体重与特攻共同决定把目标顶多远。
 *   velocity  洪流速度：速度定射出多急；本招偏慢。
 *   reach     射程：特攻与等级决定能轰多远，也是本招实际射程来源。
 *   soakTicks 湿身时长：等级决定被浇得多透。
 *   spread    散射角：特攻越低散得越开（命中 80 的落地方式之一）。
 *   volume    水量点：特攻与等级换算，驱动表现的水量。
 *   tempo／aftercast／recharge：速度定节奏，本招三项都长。
 *
 * 配置 `deluge`（漫灌）双向取舍（默认关）：
 *   开＝回溅半径 ×1.5、回溅威力 ×1.2、湿身 ×1.25、散射 ×1.4；代价是洪流威力 ×0.82、速度 ×0.9、射程 −2、
 *     起手 +3 刻、冷却 +6 刻——广而薄、更慢。
 *   关（冲压）＝洪流威力 ×1.08、推距 ×1.15、散射收紧、速度 ×1.05；代价是回溅半径 ×0.85——窄而重。
 *
 * 伤害段 `torrent`（主目标）与 `splash`（回溅圈）走共享换算（原生类别 Special）；对手特防、相性与暴击命中时另算。
 */
namespace PokemonSkills {
    actionParameters.define("hydropump", {
        /** 洪流威力：基础 110，特攻每比 55 多 1 加 0.7（夹 −24..60），等级每比 25 多 1 加 0.5（夹 0..18）；
         *  漫灌 ×0.82 / 冲压 ×1.08；夹 78..210。 */
        torrent: formula(
            F.base(110)
                .plus(F.stat("specialAttack").minus(55).times(0.7).clamp(-24, 60))
                .plus(F.level().minus(25).times(0.5).clamp(0, 18))
                .times(F.when(F.pref("deluge"), F.const(0.82), F.const(1.08)))
                .clamp(78, 210).round(1),
            "洪流威力", {
                unit: "威力",
                description: "整柱洪流砸在主目标身上的基础威力；特攻越高水越猛，等级越高水势越足。漫灌把力量摊到更宽的水面上。对手特防、相性与暴击在命中时另算。"
            }),
        /** 回溅威力：基础 40，特攻每比 55 多 1 加 0.28（夹 −10..28）；漫灌 ×1.2 / 冲压 ×1；夹 26..96。 */
        splash: formula(
            F.base(40)
                .plus(F.stat("specialAttack").minus(55).times(0.28).clamp(-10, 28))
                .times(F.when(F.pref("deluge"), F.const(1.2), F.const(1)))
                .clamp(26, 96).round(1),
            "回溅威力", {
                unit: "威力",
                description: "水花在落点炸开、溅到目标身边一圈时那一下的威力；特攻越高回溅越重，漫灌更盛。"
            }),
        /** 水柱判定：基础 0.55 格，碰撞箱每比 1.4 高 0.1（夹 −0.08..0.35）；夹 0.42..1.0。 */
        radius: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.08, 0.35)).clamp(0.42, 1.0).round(2),
            "水柱判定", {
                unit: "格",
                description: "洪流水头的判定粗细；体型越高水头越大，越容易正面撞上目标。画面里水头的宽度就是它。"
            }),
        /** 回溅半径：基础 2.0 格，碰撞箱每比 0.9 宽 0.7（夹 −0.3..1.6）；漫灌 ×1.5 / 冲压 ×0.85；夹 1.2..4.4。 */
        backwash: formula(
            F.base(2.0).plus(F.body("width").minus(0.9).times(0.7).clamp(-0.3, 1.6))
                .times(F.when(F.pref("deluge"), F.const(1.5), F.const(0.85)))
                .clamp(1.2, 4.4).round(2),
            "回溅半径", {
                unit: "格",
                description: "水花从落点漫开、能浇到落点多远一圈的人；身体越宽漫得越开，漫灌再放大。画面里那圈水花的最外沿就是它。"
            }),
        /** 推距：基础 1.5，体重每比 60 多 1 加 0.4（夹 −0.3..1.2），特攻每比 55 多 1 加 0.02（夹 −0.3..1.0）；
         *  漫灌 ×0.9 / 冲压 ×1.15；夹 0.6..3.4。 */
        blow: formula(
            F.base(1.5)
                .plus(F.body("weight").minus(60).times(0.4).clamp(-0.3, 1.2))
                .plus(F.stat("specialAttack").minus(55).times(0.02).clamp(-0.3, 1.0))
                .times(F.when(F.pref("deluge"), F.const(0.9), F.const(1.15)))
                .clamp(0.6, 3.4).round(2),
            "推距", {
                unit: "格",
                description: "命中后把主目标沿水柱方向顶开多远；身体越沉、水势越猛顶得越远，冲压式更集中。"
            }),
        /** 洪流速度：基础 1.0，速度每比 55 快 1 加 0.006（夹 −0.15..0.4）；漫灌 ×0.9 / 冲压 ×1.05；夹 0.7..1.8。 */
        velocity: formula(
            F.base(1.0)
                .plus(F.stat("speed").minus(55).times(0.006).clamp(-0.15, 0.4))
                .times(F.when(F.pref("deluge"), F.const(0.9), F.const(1.05)))
                .clamp(0.7, 1.8).round(2),
            "洪流速度", {
                unit: "格/刻",
                description: "洪流飞行的速度；本招水多而慢，为的是让对手从起手读出这一柱。漫灌更慢。"
            }),
        /** 射程：基础 12，特攻每比 55 多 1 加 0.05（夹 −2..4），等级每比 25 多 1 加 0.06（夹 0..2），
         *  漫灌 −2；夹 9..18。 */
        reach: formula(
            F.base(12)
                .plus(F.stat("specialAttack").minus(55).times(0.05).clamp(-2, 4))
                .plus(F.level().minus(25).times(0.06).clamp(0, 2))
                .minus(F.when(F.pref("deluge"), F.const(2), F.const(0)))
                .clamp(9, 18).round(1),
            "射程", {
                unit: "格",
                description: "洪流能轰到多远；特攻高、等级高的个体送得更远，漫灌更近。它也是本招的实际射程来源。"
            }),
        /** 湿身时长：基础 120 刻，等级每比 25 多 1 加 2.4（夹 0..144）；漫灌 ×1.25 / 冲压 ×1；夹 80..300。 */
        soakTicks: seconds(
            F.base(120).plus(F.level().minus(25).times(2.4).clamp(0, 144))
                .times(F.when(F.pref("deluge"), F.const(1.25), F.const(1)))
                .clamp(80, 300).round(0),
            "湿身时长", "被洪流浇透后湿身多久；湿身是共享身份 world_combat:status/soaked，别的单元可以消费它（例如加农水炮对湿透目标有加成）。漫灌浇得更久。"),
        /** 散射角：基础 5°，特攻每比 55 多 1 减 0.03°（夹 −0.5..2）；漫灌 ×1.4 / 冲压 ×0.6；夹 1.5..12。 */
        spread: formula(
            F.base(5).minus(F.stat("specialAttack").minus(55).times(0.03).clamp(-0.5, 2))
                .times(F.when(F.pref("deluge"), F.const(1.4), F.const(0.6)))
                .clamp(1.5, 12).round(1),
            "散射角", {
                unit: "°",
                description: "洪流射出时的随机偏角；特攻高瞄得稳、散得小，漫灌更散。它把原生 80 命中翻成看得见的「准线附近会散」，配合长起手给对手走位窗口。"
            }),
        /** 水量点：基础 60，特攻每比 55 多 1 加 0.6（夹 −12..40），等级每比 25 多 1 加 0.8（夹 0..20）；夹 40..130。 */
        volume: formula(
            F.base(60)
                .plus(F.stat("specialAttack").minus(55).times(0.6).clamp(-12, 40))
                .plus(F.level().minus(25).times(0.8).clamp(0, 20))
                .clamp(40, 130).round(0),
            "水量点", {
                unit: "点",
                description: "洪流轰出与炸开时用掉的水量点数，由特攻与等级换算；它驱动表现里的水的密度，不是独立伤害。"
            }),
        /** 起手：基础 15 刻，速度每比 55 快 1 减 0.05（夹 −2..4）；漫灌 +3；夹 10..24。 */
        tempo: seconds(
            F.base(15).minus(F.stat("speed").minus(55).times(0.05).clamp(-2, 4))
                .plus(F.when(F.pref("deluge"), F.const(3), F.const(0)))
                .clamp(10, 24).round(0),
            "起手", "把大量水压到膛里再轰出的时间；本招起手很长，是给对手的走位窗口。速度快的个体更短，漫灌更久。"),
        /** 收招：基础 12 刻，速度每比 55 快 1 减 0.045（夹 −2..3）；夹 7..18。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.045).clamp(-2, 3)).clamp(7, 18).round(0),
            "收招", "轰完稳住身子的时间；速度快的个体更利落。"),
        /** 冷却：基础 48 刻，速度每比 55 快 1 减 0.07（夹 −4..8）；漫灌 +6；夹 32..68。 */
        recharge: seconds(
            F.base(48).minus(F.stat("speed").minus(55).times(0.07).clamp(-4, 8))
                .plus(F.when(F.pref("deluge"), F.const(6), F.const(0)))
                .clamp(32, 68).round(0),
            "冷却", "再蓄一次大量水前等待多久；本招很贵，速度快的个体回得稍快，漫灌更久。PP 5 是它的代价。")
    });

    stages("hydropump", [
        { level: 38, values: { torrent: 132, backwash: 2.4 } },
        { level: 56, values: { torrent: 150, reach: 14.5, soakTicks: 180 } }
    ]);

    defineDamage("hydropump", "torrent", {}, {});
    defineDamage("hydropump", "splash", {}, {});

    describe("hydropump", [
        { key: "description.0", values: ["torrent"] },
        { key: "description.1", values: ["radius", "velocity", "reach", "spread"] },
        { key: "description.2", values: ["blow","soakTicks"] },
        { key: "description.3", values: ["splash","backwash"] },
        { key: "deluge.on", values: [], when: function (context) { return read(context.detail.values, ["deluge"]) === true; } },
        { key: "deluge.off", values: [], when: function (context) { return read(context.detail.values, ["deluge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.torrent", "tier.0.backwash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.torrent", "tier.1.reach", "tier.1.soakTicks"] }
    ]);
}
