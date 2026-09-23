/**
 * 劈瓦 / brickbreak 的参数与伤害段。
 *
 * 原生事实：Fighting／物理／威力 75／命中 100／PP 15／接触；出手时（onTryHit）移除对手一侧的
 *   反射壁、光墙与极光幕。Cobblemon 1.8，308 位学习者，是全族最普及的一记。
 * 核心念头：一步踏进，一记手刀自上而下劈在目标身上；刀锋落在哪，那一片的屏障就被震碎。
 *   它是破壁四打里最快、最便宜的一记：不要求先命中身体，只要刀锋落下，目标脚下的整块屏障网络就先碎。
 *
 * 数值分散（每个参数读不同的个体数据）：
 *   chop       劈斩威力：物攻给刀劲，速度给“快刀”的干脆。
 *   reach      出手距离：速度决定踏进的多远，身高决定刀锋的覆盖面。
 *   chopWidth  劈面半宽：碰撞箱宽度决定这一刀有多宽。
 *   wardBreak  碎壁半径：物攻决定这一震能传多远（覆盖被屏障护住的一整簇目标）。
 *   tempo      起手：速度越快抬手越短。
 *   aftercast  收招：速度越快收得越快。
 *   recharge   冷却：速度越快回刀越快。
 * 配置 wide（裂瓦式）：劈面与碎壁范围更大、能劈到走廊里更多人，代价是单发威力更低、起手与冷却更久。
 *
 * 伤害段 chop：手刀劈中身体的那一下；接触由共享结算按 contact 处理。
 */
namespace PokemonSkills {
    actionParameters.define("brickbreak", {
        /** 劈斩威力：基础 70，物攻每比 60 多 1 加 0.34（上限 +34），速度每比 55 快 1 加 0.12（上限 +16）；寸劲 ×1.06 / 裂瓦 ×0.9；夹 46..120。 */
        chop: formula(
            F.base(70)
                .plus(F.stat("attack").minus(60).times(0.34).clamp(-12, 34))
                .plus(F.stat("speed").minus(55).times(0.12).clamp(-4, 16))
                .times(F.when(F.pref("wide", text("worldcombat.skill.brickbreak.preference.wide")), F.const(0.9), F.const(1.06)))
                .clamp(46, 120).round(1),
            "劈斩威力", {
                unit: "威力",
                description: "一记手刀劈实的基础威力；物攻给出刀劲、速度给出快刀的干脆。对手防御、相性与暴击在命中时另算。"
            }),
        /** 出手距离：基础 2.6 格，速度每比 55 快 1 加 0.012（上限 +0.9），身高每比 1.4 高 1 格加 0.35（上限 +0.7）；裂瓦 ×1.15；夹 2.2..4.2。 */
        reach: formula(
            F.base(2.6)
                .plus(F.stat("speed").minus(55).times(0.012).clamp(-0.3, 0.9))
                .plus(F.body("height").minus(1.4).times(0.35).clamp(-0.2, 0.7))
                .times(F.when(F.pref("wide", text("worldcombat.skill.brickbreak.preference.wide")), F.const(1.15), F.const(1)))
                .clamp(2.2, 4.2).round(2),
            "出手距离", {
                unit: "格",
                description: "从抬手到刀锋落点的直距；快、高的个体劈得更远。它也是本招的实际射程来源。"
            }),
        /** 劈面半宽：基础 0.55 格，碰撞箱每比 0.9 宽 1 格加 0.4（上限 +0.45）；裂瓦 ×1.5；夹 0.4..1.5。 */
        chopWidth: formula(
            F.base(0.55)
                .plus(F.body("width").minus(0.9).times(0.4).clamp(-0.15, 0.45))
                .times(F.when(F.pref("wide", text("worldcombat.skill.brickbreak.preference.wide")), F.const(1.5), F.const(1)))
                .clamp(0.4, 1.5).round(2),
            "劈面半宽", {
                unit: "格",
                description: "刀锋两侧覆盖的横向半宽；身体越宽的个体劈面越大，裂瓦式再宽一半。"
            }),
        /** 碎壁半径：基础 8 格，物攻每比 60 多 1 加 0.02（上限 +1.5）；裂瓦 ×1.25；夹 8..12。 */
        wardBreak: formula(
            F.base(8)
                .plus(F.stat("attack").minus(60).times(0.02).clamp(0, 1.5))
                .times(F.when(F.pref("wide", text("worldcombat.skill.brickbreak.preference.wide")), F.const(1.25), F.const(1)))
                .clamp(8, 12).round(2),
            "碎壁半径", {
                unit: "格",
                description: "刀锋落点周围被震碎的屏障范围；被屏障护住的一整簇目标都会一起失去反射壁、光墙与极光幕，物攻越高震得越远。"
            }),
        /** 起手：基础 7 刻，速度每比 55 快 1 少 0.045（上限 −1.5）；裂瓦 +2；夹 4..11。 */
        tempo: seconds(
            F.base(7)
                .minus(F.stat("speed").minus(55).times(0.045).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.brickbreak.preference.wide")), F.const(2), F.const(0)))
                .clamp(4, 11).round(0),
            "起手", "抬手到刀锋落下需要多久；速度越快抬得越短，裂瓦式要多摆一下。"),
        /** 收招：基础 6 刻，速度每比 55 快 1 少 0.03（上限 −1）；裂瓦 +1；夹 3..9。 */
        aftercast: seconds(
            F.base(6)
                .minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.brickbreak.preference.wide")), F.const(1), F.const(0)))
                .clamp(3, 9).round(0),
            "收招", "劈完把刀收回架势的时间；快的个体收得干脆。"),
        /** 冷却：基础 26 刻，速度每比 55 快 1 少 0.1（上限 −3）；裂瓦 +8；夹 16..44。 */
        recharge: seconds(
            F.base(26)
                .minus(F.stat("speed").minus(55).times(0.1).clamp(-3, 7))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.brickbreak.preference.wide")), F.const(8), F.const(0)))
                .clamp(16, 44).round(0),
            "冷却", "两次劈瓦之间的等待；这是全族最短的一档，快的个体回刀更快。")
    });

    defineDamage("brickbreak", "chop", {}, { contact: true });

    stages("brickbreak", [
        { level: 30, values: { chop: 78 } },
        { level: 48, values: { chop: 88, wardBreak: 9 } }
    ]);

    describe("brickbreak", [
        { key: "description.0", values: ["chop","chopWidth"] },
        { key: "description.1", values: ["reach","wardBreak"] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.chop"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.chop", "tier.1.wardBreak"] }
    ]);
}
