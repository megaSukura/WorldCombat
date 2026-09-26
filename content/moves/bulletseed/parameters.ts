/**
 * 种子机关枪 / bulletseed 的参数与伤害段。
 *
 * 原生事实：Grass／物理／单发威力 25／命中 100／PP 30／非接触、子弹（bullet）／
 *   `multihit: [2, 5]`（连续攻击 2～5 次，按普通连续攻击掷次数）；131 位学习者（Cobblemon 1.8 / Showdown）。
 *   描述「向对手猛烈地发射种子进行攻击。连续攻击2～5次」。
 *
 * 翻译：把回合制的「2～5 连击」翻成**一口气连珠喷籽**——每 `gap` 刻独立喷出一发真投递，上一发还在空中，
 *   下一发已经出膛；每发自己飞、自己撞，按实际首碰者结算一次 `pellet` 物理撞击，直到这串打完。
 *   打几发由精灵数据决定（夹在 2～5），所以它卖的是「这一梭子有多少发」。它是本组里唯一的物理招，也是唯一的连发。
 *   每发读当刻自由瞄准，可中途转准心扫射；原目标倒下不自动停火，剩余的籽继续按原节拍飞出。
 *
 * 与同族分开：种子炸弹（seedbomb）是把一荚硬种高抛、从上方落下；能量球是单个实心球命中后长草；
 *   种子机关枪是**贴地连珠的密集小撞击**——没有弧线、没有地面残留，只有一梭子噗噗噗的籽。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   pellet   单籽威力：物攻定籽的狠，等级定籽的熟。
 *   shots    连发数：物攻、速度与等级决定这一梭子有几发（夹 2..5；重籽收在 3）。
 *   gap      间隔：速度决定籽与籽之间喷得多密。
 *   velocity 籽速：速度定籽飞得多快。
 *   radius   籽判定：体型高度定单颗籽的大小。
 *   reach    射程：物攻与等级决定能喷多远，也是本招的实际射程来源。
 *   spread   散布：速度与配置决定籽散多开。
 *   husk     壳量：物攻换算的碎壳量，驱动命中的碎屑。
 *   tempo／aftercast／recharge：速度定节奏，重籽更慢更长。
 *
 * 配置 `heavy`（重籽）双向取舍（默认关）：
 *   开＝单籽威力 ×1.35、籽更大、散布更紧；代价是连发数收在 3、籽速 ×0.9、起手 +2 刻、冷却 +4 刻、间隔 +1——少而重。
 *   关（速射）＝连发数可到 5、间隔更密、籽速 ×1.12；代价是单籽威力 ×0.82、散布更开——多而轻。
 *
 * 伤害段 `pellet` 与参数同名，走共享换算（原始类别 Physical）；对手防御、相性与暴击在每发命中时另算。
 */
namespace PokemonSkills {
    actionParameters.define("bulletseed", {
        /** 单籽威力：基础 25，物攻每比 55 多 1 加 0.16（夹 −4..16），等级每比 25 多 1 加 0.3（夹 0..8）；
         *  重籽 ×1.35 / 速射 ×0.82；夹 14..60。 */
        pellet: formula(
            F.base(25)
                .plus(F.stat("attack").minus(55).times(0.16).clamp(-4, 16))
                .plus(F.level().minus(25).times(0.3).clamp(0, 8))
                .times(F.when(F.pref("heavy"), F.const(1.35), F.const(0.82)))
                .clamp(14, 60).round(1),
            "单籽威力", {
                unit: "威力",
                description: "每一发籽撞上去的威力；总数乘起来才是这一梭子的分量。物攻定狠度，等级让籽更熟。重籽更沉。对手防御、相性与暴击在每发命中时另算。"
            }),
        /** 连发数：基础 2 + 物攻偏移[0,1.5] + 速度偏移[0,1.5] + 等级(≥25)偏移[0,1]；向下取整；
         *  重籽上限 3、速射上限 5；夹 2..5。 */
        shots: formula(
            F.base(2)
                .plus(F.stat("attack").minus(55).times(0.012).clamp(0, 1.5))
                .plus(F.stat("speed").minus(55).times(0.012).clamp(0, 1.5))
                .plus(F.level().minus(25).times(0.02).clamp(0, 1))
                .floor()
                .clamp(F.when(F.pref("heavy"), F.const(2), F.const(2)), F.when(F.pref("heavy"), F.const(3), F.const(5))),
            "连发数", {
                unit: "发",
                description: "这一梭子喷出几发籽；物攻、速度与等级越高越多（原生 2～5）。重籽形态收在 3 发，速射形态可到 5 发。"
            }),
        /** 间隔：基础 4 刻，速度每比 55 快 1 减 0.025（夹 −1..1.5）；重籽 +1 / 速射 −1；夹 2..6。 */
        gap: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.025).clamp(-1, 1.5))
                .plus(F.when(F.pref("heavy"), F.const(1), F.const(-1)))
                .clamp(2, 6).round(0),
            "间隔", "两发籽之间隔多久喷出；速度越快越密，重籽更从容、速射更急。"),
        /** 籽速：基础 1.6，速度每比 55 快 1 加 0.01（夹 −0.2..0.4）；重籽 ×0.9 / 速射 ×1.12；夹 1.2..2.4。 */
        velocity: formula(
            F.base(1.6).plus(F.stat("speed").minus(55).times(0.01).clamp(-0.2, 0.4))
                .times(F.when(F.pref("heavy"), F.const(0.9), F.const(1.12)))
                .clamp(1.2, 2.4).round(2),
            "籽速", {
                unit: "格/刻",
                description: "每发籽飞行的速度；速度快的个体喷得更急。重籽更沉、飞得稍慢。"
            }),
        /** 籽判定：基础 0.2 格，碰撞箱每比 1.4 高 0.04（夹 −0.03..0.12）；夹 0.15..0.36。 */
        radius: formula(
            F.base(0.2).plus(F.body("height").minus(1.4).times(0.04).clamp(-0.03, 0.12)).clamp(0.15, 0.36).round(2),
            "籽判定", {
                unit: "格",
                description: "单颗籽飞行与命中的判定大小；体型越高籽越大。画出的籽粒大小与它一致。"
            }),
        /** 射程：基础 8，物攻每比 55 多 1 加 0.03（夹 −1..2.5），等级每比 25 多 1 加 0.05（夹 0..1.5）；夹 6..12。 */
        reach: formula(
            F.base(8)
                .plus(F.stat("attack").minus(55).times(0.03).clamp(-1, 2.5))
                .plus(F.level().minus(25).times(0.05).clamp(0, 1.5))
                .clamp(6, 12).round(1),
            "射程", {
                unit: "格",
                description: "籽能喷到多远；物攻与等级越高送得越远。它也是本招的实际射程来源。"
            }),
        /** 散布：基础 2.5°，速度每比 55 快 1 加 0.03°（夹 0..3）；重籽 ×0.6 / 速射 ×1.35；夹 1.2..8。 */
        spread: formula(
            F.base(2.5).plus(F.stat("speed").minus(55).times(0.03).clamp(0, 3))
                .times(F.when(F.pref("heavy"), F.const(0.6), F.const(1.35)))
                .clamp(1.2, 8).round(1),
            "散布", {
                unit: "°",
                description: "每发籽射出时的随机偏角；速度快的个体喷得散，重籽收得更紧、速射更开。"
            }),
        /** 壳量：基础 14，物攻每比 55 多 1 加 0.22（夹 −4..18）；夹 10..36。 */
        husk: formula(
            F.base(14).plus(F.stat("attack").minus(55).times(0.22).clamp(-4, 18)).clamp(10, 36).round(0),
            "壳量", {
                unit: "片",
                description: "每发籽撞碎时崩出的壳片数量，由物攻换算；它驱动命中的碎屑表现，不是独立伤害。"
            }),
        /** 起手：基础 8 刻，速度每比 55 快 1 减 0.04（夹 −1.5..2.5）；重籽 +2；夹 4..13。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("heavy"), F.const(2), F.const(0)))
                .clamp(4, 13).round(0),
            "起手", "把籽在口边囤起来、喷出第一发的时间；速度越快越短，重籽要多囤一下。"),
        /** 收招：基础 7 刻，速度每比 55 快 1 减 0.03（夹 −1..2）；夹 4..10。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2)).clamp(4, 10).round(0),
            "收招", "这一梭子喷完后收势的时间；快的个体更利落。"),
        /** 冷却：基础 26 刻，速度每比 55 快 1 减 0.05（夹 −3..5）；重籽 +4 / 速射 −3；夹 15..40。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(55).times(0.05).clamp(-3, 5))
                .plus(F.when(F.pref("heavy"), F.const(4), F.const(-3)))
                .clamp(15, 40).round(0),
            "冷却", "再囤一梭子籽前等待多久；重籽更长、速射更短。")
    });

    stages("bulletseed", [
        { level: 30, values: { pellet: 32, shots: 3 } },
        { level: 46, values: { pellet: 38, reach: 10 } }
    ]);

    defineDamage("bulletseed", "pellet", {}, { flags: { bullet: true } });

    describe("bulletseed", [
        { key: "description.0", values: ["pellet","shots"] },
        { key: "description.1", values: ["gap", "velocity", "reach", "spread"] },
        { key: "description.2", values: ["radius"] },
        { key: "heavy.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "heavy.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.pellet", "tier.0.shots"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.pellet", "tier.1.reach"] }
    ]);
}
