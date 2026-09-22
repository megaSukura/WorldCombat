/**
 * 冰冻牙 / icefang 的参数与伤害段。
 *
 * 原生事实：Ice／物理／威力 65／命中 95／PP 15／接触、咬击（bite）；两个独立掷签各 10%：冰冻与畏缩
 *   （Cobblemon 1.8，86 位学习者）。
 *
 * 翻译：把「用藏有冷气的牙齿咬住对手」落成**一口咬住、冷气慢慢渗进关节**——咬合本身不高，命中后寒气延迟一拍
 * 才在伤口里发作，掷出时把目标冻在原地（共享身份 world_combat:status/frozen，宝可梦同步为原生冰冻）。
 * 它的独有部分在**冷脆**：对已经冻住的目标再咬，冰壳让皮肉发脆，这一口会多结算一段 `shatter` 额外伤害——
 * 因此它是本族里唯一"收冻结残局"的牙。咬实的那一下也有几率把目标咬懵（共享身份 world_combat:status/flinch）。
 *
 * 与同族分开：冰冻拳是拳、走"结霜 → 收霜冻结"两段；冰冻牙是牙，直冻并把冻住的目标咬碎，且冷气有渗入延迟。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   fang         咬合威力：物攻定咬合力，特攻定寒气；深寒式把每一口摊薄。
 *   reach/lunge  扑出距离与速度：速度派生；深寒式收一点、沉一些。
 *   grip         獠牙判定：身高派生。
 *   freezeChance 冰冻几率：特攻与等级决定寒气能不能冻住；深寒式更高。
 *   freezeTicks  冰冻时长：特攻与等级；深寒式更久。
 *   shatter      冷脆额外伤害：特攻派生，只对已冻结目标结算；深寒式更重。
 *   frostDelay   寒气渗入延迟：速度决定咬中到结冰之间隔多久。
 *   flinchChance 畏缩几率：速度派生；深寒式略降。
 *   flinchTicks  畏缩持续：固定 9 刻，深寒式 +2。
 *   shards       冰屑数：特攻派生，表现按它发射。
 *   tempo/aftercast/recharge：速度决定起手、收招与冷却。
 *
 * 配置 `deep`（深寒式）双向取舍：开启＝冰冻几率 +12%%、冰冻 ×1.4、冷脆 ×1.3，但咬合威力 ×0.90、起手 +2 刻、
 * 冷却 +4 刻；关闭（急寒式）＝咬得更重、循环更快，但冻得更短、咬碎得更轻。两个方向各有局面。
 *
 * 伤害段 `fang`（咬合）与 `shatter`（冷脆）各走共享换算；冰冻经共享状态路由落到任何战斗者身上。
 */
namespace PokemonSkills {
    actionParameters.define("icefang", {
        /** 咬合威力：64 + 物攻偏移[−12,34] + 特攻偏移[−4,10]；深寒 ×0.90 / 急寒 ×1.05；夹 46..138。 */
        fang: formula(
            F.base(64).plus(F.stat("attack").minus(60).times(0.32).clamp(-12, 34))
                .plus(F.stat("specialAttack").minus(60).times(0.1).clamp(-4, 10))
                .times(F.when(F.pref("deep", text("worldcombat.skill.icefang.preference.deep")), F.const(0.90), F.const(1.05)))
                .clamp(46, 138).round(1),
            "咬合威力", {
                unit: "威力",
                description: "藏冷獠牙咬合这一下的基础威力；物攻给出咬合力，特攻给出寒气。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扑出距离：2.1 + 速度偏移[−0.35,1.0]；深寒 ×0.9 / 急寒 ×1.06；夹 1.6..3.3。 */
        reach: formula(
            F.base(2.1).plus(F.stat("speed").minus(55).times(0.013).clamp(-0.35, 1.0))
                .times(F.when(F.pref("deep", text("worldcombat.skill.icefang.preference.deep")), F.const(0.9), F.const(1.06)))
                .clamp(1.6, 3.3).round(2),
            "扑出距离", {
                unit: "格",
                description: "从起步到咬到的总位移，也是本招的实际射程来源；腿快的个体扑得更远。深寒式收得更短。"
            }),
        /** 扑咬速度：0.72 + 速度偏移[−0.12,0.3]；深寒 ×0.92 / 急寒 ×1.06；夹 0.48..1.08。 */
        lunge: formula(
            F.base(0.72).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.12, 0.3))
                .times(F.when(F.pref("deep", text("worldcombat.skill.icefang.preference.deep")), F.const(0.92), F.const(1.06)))
                .clamp(0.48, 1.08).round(2),
            "扑咬速度", {
                unit: "格/刻",
                description: "扑出时每刻前进的距离；深寒式沉一点，急寒式起得更急。"
            }),
        /** 獠牙判定：0.42 + 身高偏移[−0.07,0.3]；夹 0.32..0.78。 */
        grip: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.14).clamp(-0.07, 0.3)).clamp(0.32, 0.78).round(2),
            "獠牙判定", {
                unit: "格",
                description: "这一口扫过的横向判定半径；口部越大咬得越宽，越不容易被侧身让开。"
            }),
        /** 冰冻几率：0.24 + 特攻偏移[−0.07,0.2] + 等级偏移[0,0.12] + 深寒 0.12；夹 0.12..0.62。 */
        freezeChance: percent(
            F.base(0.24).plus(F.stat("specialAttack").minus(60).times(0.0016).clamp(-0.07, 0.2))
                .plus(F.level().minus(30).times(0.002).clamp(0, 0.12))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.icefang.preference.deep")), F.const(0.12), F.const(0)))
                .clamp(0.12, 0.62).round(3),
            "冰冻几率", "冷气渗进伤口后把目标冻住的概率（原生 10%）；特攻越高、等级越高越容易冻实，深寒式再抬一档。"),
        /** 冰冻时长：90 + 特攻偏移[−14,50] + 等级偏移[0,35]；深寒 ×1.4；夹 40..200。 */
        freezeTicks: seconds(
            F.base(90).plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-14, 50))
                .plus(F.level().minus(30).times(0.85).clamp(0, 35))
                .times(F.when(F.pref("deep", text("worldcombat.skill.icefang.preference.deep")), F.const(1.4), F.const(1)))
                .clamp(40, 200).round(0),
            "冰冻时长", "目标被冻住的时长；特攻越高、等级越高冻得越久，深寒式更久。"),
        /** 冷脆额外伤害：34 + 特攻偏移[−6,22]；深寒 ×1.3；夹 18..72。 */
        shatter: formula(
            F.base(34).plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-6, 22))
                .times(F.when(F.pref("deep", text("worldcombat.skill.icefang.preference.deep")), F.const(1.3), F.const(1)))
                .clamp(18, 72).round(1),
            "冷脆额外伤害", {
                unit: "威力",
                description: "对已经冻住的目标再咬时，冰壳让皮肉发脆而多结算的一段伤害；特攻派生，深寒式更重。只对被冻住的目标生效。"
            }),
        /** 寒气渗入延迟：4 − 速度偏移[−2,1.5]；夹 2..7。 */
        frostDelay: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 1.5)).clamp(2, 7).round(0),
            "寒气渗入延迟", "咬中到冷气发作、判定是否冻住之间隔的时间；速度越快渗得越快。"),
        /** 畏缩几率：0.18 + 速度偏移[−0.05,0.12]；深寒 ×0.85；夹 0.08..0.44。 */
        flinchChance: percent(
            F.base(0.18).plus(F.stat("speed").minus(55).times(0.0011).clamp(-0.05, 0.12))
                .times(F.when(F.pref("deep", text("worldcombat.skill.icefang.preference.deep")), F.const(0.85), F.const(1)))
                .clamp(0.08, 0.44).round(3),
            "畏缩几率", "咬实时的畏缩几率（原生 10%）；速度越快越容易一口把对手咬懵，深寒式力道分散、略降。"),
        /** 畏缩持续：9 刻，深寒 +2；夹 6..16。 */
        flinchTicks: seconds(
            F.base(9).plus(F.when(F.pref("deep", text("worldcombat.skill.icefang.preference.deep")), F.const(2), F.const(0)))
                .clamp(6, 16).round(0),
            "畏缩持续", "被咬懵的人在这段时间内无法开始新动作；伤害阶段不受影响，仍可被打。"),
        /** 冰屑数：6 + 特攻偏移[−1,6]；夹 5..14。 */
        shards: formula(
            F.base(6).plus(F.stat("specialAttack").minus(60).times(0.07).clamp(-1, 6)).clamp(5, 14).round(0),
            "冰屑数", {
                unit: "片",
                description: "结冰与咬碎时迸出的冰屑数量，随特攻增长；表现按它发射，画面里的冰屑数与机制一致。"
            }),
        /** 起手：6 − 速度偏移[−2,1.5] + 深寒 2；夹 3..12。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.018).clamp(-2, 1.5))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.icefang.preference.deep")), F.const(2), F.const(0)))
                .clamp(3, 12).round(0),
            "起手", "牙间凝起冷气、蓄到能扑出的时间；速度越快越短，深寒式要多凝一拍。"),
        /** 收招：6 − 速度偏移[−2,1.5]；夹 3..10。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.015).clamp(-2, 1.5)).clamp(3, 10).round(0),
            "收招", "咬完松口、退开半步的收势；速度越快越短。"),
        /** 冷却：17 − 速度偏移[−4,2] + 深寒 4；夹 10..29。 */
        recharge: seconds(
            F.base(17).minus(F.stat("speed").minus(55).times(0.04).clamp(-4, 2))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.icefang.preference.deep")), F.const(4), F.const(0)))
                .clamp(10, 29).round(0),
            "冷却", "两口之间冷气重新聚起的时间；速度越快回得越快，深寒式要缓一拍。"),
        traceAhead: hidden(0.9),
        minimumMove: hidden(0.04)
    });

    stages("icefang", [
        { level: 28, values: { fang: 72 } },
        { level: 46, values: { fang: 82, freezeTicks: 120 } }
    ]);

    defineDamage("icefang", "fang", { defenceCoefficient: 0.005,
        rationale: "藏冷獠牙的接触咬合；防御按默认系数减伤。" }, { contact: true, bite: true });
    defineDamage("icefang", "shatter", { defenceCoefficient: 0.005,
        rationale: "冷脆的冰壳被咬碎时多结算的一段；防御按默认系数减伤。" }, { contact: true, bite: true });

    describe("icefang", [
        { key: "description.0", values: ["fang", "grip"] },
        { key: "description.1", values: ["freezeChance", "freezeTicks", "frostDelay"] },
        { key: "description.2", values: ["shatter"] },
        { key: "description.3", values: ["flinchChance", "flinchTicks"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "cooldown", "pp"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.fang"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.fang", "tier.1.freezeTicks"] }
    ]);
}
