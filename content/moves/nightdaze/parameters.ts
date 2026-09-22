/**
 * 暗黑爆破 / nightdaze 的参数与伤害段。
 *
 * 原生事实：Dark／特殊／威力 85／命中 95／PP 10／target normal（单体），40% 概率使目标命中下降 1 级；
 *   2 位学习者（Cobblemon 1.8 / Showdown）。描述「放出黑暗的冲击波攻击对手。有时会降低对手的命中率」。
 *
 * 翻译：把「放出黑暗的冲击波」落成一**团从自身炸开、向四周推出去的漆黑冲击波**——暗色半球以施法者为心
 *   一圈圈向外扩，连空中一起罩住（这招只认方向不认地面）；被吞进去的人各吃一次 `surge`、被向外推开 `push`，
 *   有 `shroudChance` 概率掉 `shroudStages` 级命中（原生最高的一档概率），并带上共享身份
 *   `world_combat:status/shrouded`（本单元发明：被黑暗笼罩、看不见）与家族伞身份 `aim_impaired`。
 *
 * 与同族分开：冲浪/重踏都是**贴地**的整圈；暗黑爆破是**含空中的整圈暗波**，压的是命中而不是速度，
 *   而且是本族威力最大、概率最高的一招。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   surge        暗波威力：特攻定暗能，等级定范围；蚀夜式把能量摊开所以更轻。
 *   waveRadius   暗波半径：特攻与等级决定铺多大；蚀夜式更大。它也是本招实际射程来源。
 *   crest        暗波高度：体型高度决定这道波往上罩多高，能不能盖到空中的目标。
 *   waveTicks    推进步数：速度决定波推得多快（每刻一圈）。
 *   shroudChance 笼罩概率：原生 40% 起，特攻与等级提高咬住的机会；蚀夜式更高。
 *   shroudStages 掉命中级数：特攻很高时一次掉 2 级。
 *   shroudTicks  笼罩时长：等级与蚀夜式决定。
 *   push         向外推距：体重与特攻决定把人震开多远；蚀夜式推得更少。
 *   maxTargets   覆盖人数：碰撞箱宽度与配置决定一圈能罩到几个。
 *   motes        暗尘数量：特攻与等级驱动，直接驱动表现。
 *   tempo／aftercast／recharge：速度、等级与配置定节奏。
 *
 * 配置 `eclipse`（蚀夜式）双向取舍（默认关）：
 *   开＝半径 ×1.35、覆盖 +2 人、笼罩概率 +8%、笼罩时长 ×1.4；代价是威力 ×0.78、起手 +4 刻、冷却 +8 刻——铺满一圈、
 *     用削命中的方式困住一群人。
 *   关（爆发式）＝威力 ×1.12、半径 ×0.85、向外推得更远，代价是笼罩概率 −6%——身周炸一下、把贴身的顶开。
 *
 * 伤害段 `surge`（参数同名）走共享换算（原生类别 Special／Dark）；对手特防、相性与暴击命中时另算。
 * 命中下降：真实 MobEffect 让任何战斗者「打不准」（攻击变弱），宝可梦那一层再用 NativeEffects.boost
 * 下降原生命中等级。
 */
namespace PokemonSkills {
    export const nightdazeId = "nightdaze";
    export const nightdazeEffect = "world_combat:nightdaze_shroud";
    export const nightdazeScene = "world_combat:move_nightdaze";
    export const nightdazeIdentity = "world_combat:status/shrouded";
    export const nightdazeShroudText = "world_combat.move.nightdaze.text.shroud";
    export const nightdazeMissText = "world_combat.move.nightdaze.text.miss";

    actionParameters.define(nightdazeId, {
        /** 暗波威力：85 + 特攻偏移[−11,34] + 等级(≥25)偏移[0,14]；蚀夜 ×0.78 / 爆发 ×1.12；夹 50..150。 */
        surge: formula(
            F.base(85).plus(F.stat("specialAttack").minus(55).times(0.36).clamp(-11, 34))
                .plus(F.level().minus(25).times(0.5).clamp(0, 14))
                .times(F.when(F.pref("eclipse"), F.const(0.78), F.const(1.12)))
                .clamp(50, 150).round(1),
            "暗波威力", {
                unit: "威力",
                description: "暗波吞到目标那一下的基础威力；特攻越高暗能越足、等级越高范围越实，蚀夜式把能量摊到更大一圈上。对手特防、相性与暴击在命中时另算。"
            }),
        /** 暗波半径：4.2 + 特攻偏移[−0.6,2.4] + 等级(≥25)偏移[0,1.0]；蚀夜 ×1.35 / 爆发 ×0.85；夹 2.4..7。 */
        waveRadius: formula(
            F.base(4.2).plus(F.stat("specialAttack").minus(55).times(0.012).clamp(-0.6, 2.4))
                .plus(F.level().minus(25).times(0.02).clamp(0, 1.0))
                .times(F.when(F.pref("eclipse"), F.const(1.35), F.const(0.85)))
                .clamp(2.4, 7).round(2),
            "暗波半径", {
                unit: "格",
                description: "暗波从自身向外铺开多远；特攻高、等级高的个体铺得越大，蚀夜式更大。它也是本招的实际射程来源，画面里的黑圈就是它。"
            }),
        /** 暗波高度：2.6 + 体型高度偏移[−0.4,1.6]；夹 1.8..5。 */
        crest: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).times(1.4).clamp(-0.4, 1.6)).clamp(1.8, 5).round(2),
            "暗波高度", {
                unit: "格",
                description: "这道暗波往上罩多高；体型越高罩得越高，能把空中的目标也吞进来。"
            }),
        /** 推进步数：5 + 速度偏移[−1,2] + 蚀夜 +2 / 爆发 −1；夹 3..9（每刻一圈）。 */
        waveTicks: formula(
            F.base(5).plus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("eclipse"), F.const(2), F.const(-1))).clamp(3, 9).round(0),
            "推进步数", {
                unit: "步",
                description: "暗波从脚下推到半径尽头要走几步（每刻一圈）；速度越快推得越快，蚀夜式更慢。"
            }),
        /** 笼罩概率：基础 0.40 + 特攻偏移[0,0.16] + 等级偏移[0,0.04] + 蚀夜 +0.08 / 爆发 −0.06；夹 0.2..0.7。 */
        shroudChance: percent(
            F.base(0.40).plus(F.stat("specialAttack").minus(55).times(0.002).clamp(0, 0.16))
                .plus(F.level().minus(25).times(0.0008).clamp(0, 0.04))
                .plus(F.when(F.pref("eclipse"), F.const(0.08), F.const(-0.06)))
                .clamp(0.2, 0.7).round(3),
            "笼罩概率", "黑暗把目标罩住、把它命中降下来的概率；原生 40% 起（本族最高），特攻与等级越高越容易罩住。"),
        /** 掉命中级数：1 + 特攻 ≥ 120；夹 1..2。 */
        shroudStages: formula(
            F.base(1).plus(F.stat("specialAttack").gte(120)).clamp(1, 2).round(0),
            "掉命中级数", {
                unit: "级",
                description: "被黑暗罩住时一次掉几级命中；特攻很高的个体（≥120）会一次掉 2 级。"
            }),
        /** 笼罩时长：基础 110 刻 + 等级(≥25)偏移[0,60]；蚀夜 ×1.4；夹 70..300。 */
        shroudTicks: seconds(
            F.base(110).plus(F.level().minus(25).times(1.4).clamp(0, 60))
                .times(F.when(F.pref("eclipse"), F.const(1.4), F.const(1)))
                .clamp(70, 300).round(0),
            "笼罩时长", "被黑暗罩住、带着共享身份 shrouded 的时间；等级越高、蚀夜式留得越久。"),
        /** 向外推距：0.8 + 体重偏移[−0.2,0.6] + 特攻偏移[−0.2,0.5]；蚀夜 ×0.9 / 爆发 ×1.15；夹 0.3..1.8。 */
        push: formula(
            F.base(0.8).plus(F.body("weight").times(0.004).clamp(-0.2, 0.6))
                .plus(F.stat("specialAttack").minus(55).times(0.004).clamp(-0.2, 0.5))
                .times(F.when(F.pref("eclipse"), F.const(0.9), F.const(1.15)))
                .clamp(0.3, 1.8).round(2),
            "向外推距", {
                unit: "格",
                description: "暗波把人沿离中心方向震开多远；越重、特攻越高的个体推得越远，爆发式推得更狠。"
            }),
        /** 覆盖人数：2 + 体型宽度偏移[−1,4] + 蚀夜 2；夹 1..8。 */
        maxTargets: formula(
            F.base(2).plus(F.body("width").minus(0.9).times(2.5).clamp(-1, 4))
                .plus(F.when(F.pref("eclipse"), F.const(2), F.const(0))).clamp(1, 8).round(0),
            "覆盖人数", {
                unit: "个",
                description: "一圈暗波最多同时罩到几个敌人；身体越宽、蚀夜式罩得越多。"
            }),
        /** 暗尘数量：20 + 特攻偏移[−5,22] + 等级(≥25)偏移[0,12]；夹 14..64。 */
        motes: formula(
            F.base(20).plus(F.stat("specialAttack").minus(55).times(0.24).clamp(-5, 22))
                .plus(F.level().minus(25).times(0.5).clamp(0, 12)).clamp(14, 64).round(0),
            "暗尘数量", {
                unit: "点",
                description: "暗波与命中处翻涌的暗尘数量，也驱动表现的密度；特攻与等级越高越密。"
            }),
        /** 起手：10 − 速度偏移[−1.5,2.5] + 蚀夜 4；夹 5..17。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.035).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("eclipse"), F.const(4), F.const(0))).clamp(5, 17).round(0),
            "起手", "把黑暗在身下压起来再炸出去的时间；速度越快越短，蚀夜式要多蓄一会儿。"),
        /** 收招：9 − 速度偏移[−1,2]；夹 5..13。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2)).clamp(5, 13).round(0),
            "收招", "暗波推完后收势的时间；快的个体更利落。"),
        /** 冷却：48 − 速度偏移[−3,6] + 蚀夜 8；夹 28..66。 */
        recharge: seconds(
            F.base(48).minus(F.stat("speed").minus(55).times(0.06).clamp(-3, 6))
                .plus(F.when(F.pref("eclipse"), F.const(8), F.const(0))).clamp(28, 66).round(0),
            "冷却", "再压一次黑暗前等待多久；速度快的个体回得稍快，蚀夜式更久。")
    });

    stages(nightdazeId, [
        { level: 40, values: { surge: 98, waveRadius: 4.6 } },
        { level: 58, values: { surge: 114, shroudChance: 0.54 } }
    ]);

    defineDamage(nightdazeId, "surge", {});

    describe(nightdazeId, [
        { key: "description.0", values: ["surge", "shroudChance", "shroudStages"] },
        { key: "description.1", values: ["waveRadius", "crest", "waveTicks"] },
        { key: "description.2", values: ["push", "maxTargets"] },
        { key: "description.3", values: ["shroudTicks", "motes"] },
        { key: "eclipse.on", values: [], when: function (context) { return read(context.detail.values, ["eclipse"]) === true; } },
        { key: "eclipse.off", values: [], when: function (context) { return read(context.detail.values, ["eclipse"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.surge", "tier.0.waveRadius"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.surge", "tier.1.shroudChance"] }
    ]);
}
