/**
 * 精神之牙 / psychicfangs 的参数与伤害段。
 *
 * 原生事实：Psychic／物理／威力 85／命中 100／PP 10／接触／咬击（bite）；出手时移除对手一侧的
 *   反射壁、光墙与极光幕。Cobblemon 1.8，68 位学习者。
 * 核心念头：用意念把身体送出去，咬住对手；这一口会把目标身上那层屏障咬碎并吞下去，碎得越多咬得越狠。
 *   与劈瓦分开：它是更远、更慢、更重的一口，且碎壁本身喂给它额外的力道。
 *
 * 数值分散（每个参数读不同的个体数据）：
 *   bite       咬击威力：物攻给牙口，特攻给精神劲，等级给咬合的深度。
 *   lunge      扑咬距离：速度决定扑得多远，特攻决定意念推得多快。
 *   fangWidth  咬合半径：碰撞箱高度决定张口的大小。
 *   devour     每碎一层屏障追加的威力份额：特攻越高，吞得越狠。
 *   wardBreak  碎壁半径：特攻决定这一咬的意念能传多远。
 *   tempo      起手：速度越快咬得越快。
 *   aftercast  收招、recharge 冷却：速度决定收口与再咬的等待。
 * 配置 devour（噬壁式）：每碎一层的加成 ×1.7、碎壁范围 ×1.25，代价是基础咬击 ×0.9、冷却 +8 刻；
 *   穿刺式则相反，基础咬击 ×1.08、吞壁加成 ×0.6。
 *
 * 伤害段 bite：咬实的那一下；接触与咬击由共享结算按 contact／bite 处理。
 */
namespace PokemonSkills {
    actionParameters.define("psychicfangs", {
        /** 咬击威力：基础 78，物攻每比 60 多 1 加 0.34（上限 +34），特攻每比 60 多 1 加 0.2（上限 +20），等级 30 起每级 +0.5（上限 +14）；噬壁 ×0.9 / 穿刺 ×1.08；夹 52..128。 */
        bite: formula(
            F.base(78)
                .plus(F.stat("attack").minus(60).times(0.34).clamp(-12, 34))
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-8, 20))
                .plus(F.level().minus(30).times(0.5).clamp(-8, 14))
                .times(F.when(F.pref("devour", text("worldcombat.skill.psychicfangs.preference.devour")), F.const(0.9), F.const(1.08)))
                .clamp(52, 128).round(1),
            "咬击威力", {
                unit: "威力",
                description: "精神之力送出去咬实的基础威力；物攻给牙口、特攻给精神劲、等级给咬合的深度。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扑咬距离：基础 2.8 格，速度每比 55 快 1 加 0.014（上限 +1.0），特攻每比 60 高 1 加 0.008（上限 +0.9）；噬壁 ×1.1；夹 2.4..4.6。 */
        lunge: formula(
            F.base(2.8)
                .plus(F.stat("speed").minus(55).times(0.014).clamp(-0.3, 1.0))
                .plus(F.stat("specialAttack").minus(60).times(0.008).clamp(-0.2, 0.9))
                .times(F.when(F.pref("devour", text("worldcombat.skill.psychicfangs.preference.devour")), F.const(1.1), F.const(1)))
                .clamp(2.4, 4.6).round(2),
            "扑咬距离", {
                unit: "格",
                description: "从念头起势到咬合的直距；快、特攻高的个体扑得更远。它也是本招的实际射程来源。"
            }),
        /** 咬合半径：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.15（上限 +0.4）；夹 0.36..0.85。 */
        fangWidth: formula(
            F.base(0.5)
                .plus(F.body("height").minus(1.4).times(0.15).clamp(-0.1, 0.4))
                .clamp(0.36, 0.85).round(2),
            "咬合半径", {
                unit: "格",
                description: "张口覆盖的横向半径；身体越大的个体咬合面越大。"
            }),
        /** 吞壁加成：基础 0.16，特攻每比 60 高 1 加 0.0012（上限 +0.09）；噬壁 ×1.7 / 穿刺 ×0.6；夹 0.06..0.4。 */
        devour: percent(
            F.base(0.16)
                .plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.03, 0.09))
                .times(F.when(F.pref("devour", text("worldcombat.skill.psychicfangs.preference.devour")), F.const(1.7), F.const(0.6)))
                .clamp(0.06, 0.4).round(3),
            "吞壁加成", "每咬碎一层屏障，这一口威力提高的份额（最多计三层）；特攻越高吞得越狠，噬壁式再翻近一倍。"),
        /** 碎壁半径：基础 8 格，特攻每比 60 高 1 加 0.02（上限 +1.6）；噬壁 ×1.25；夹 8..11。 */
        wardBreak: formula(
            F.base(8)
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(0, 1.6))
                .times(F.when(F.pref("devour", text("worldcombat.skill.psychicfangs.preference.devour")), F.const(1.25), F.const(1)))
                .clamp(8, 11).round(2),
            "碎壁半径", {
                unit: "格",
                description: "咬合点周围被意念咬碎的屏障范围；反射壁、光墙与极光幕一并失效，特攻越高传得越远。"
            }),
        /** 起手：基础 9 刻，速度每比 55 快 1 少 0.045（上限 −1.5）；噬壁 +2；夹 5..14。 */
        tempo: seconds(
            F.base(9)
                .minus(F.stat("speed").minus(55).times(0.045).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("devour", text("worldcombat.skill.psychicfangs.preference.devour")), F.const(2), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "把精神之力压进口中、扑出去需要多久；速度越快越短。"),
        /** 收招：基础 8 刻，速度每比 55 快 1 少 0.025（上限 −1）；夹 4..11。 */
        aftercast: seconds(
            F.base(8)
                .minus(F.stat("speed").minus(55).times(0.025).clamp(-1, 2))
                .clamp(4, 11).round(0),
            "收招", "咬完收口的时间；快的个体收得干脆。"),
        /** 冷却：基础 30 刻，速度每比 55 快 1 少 0.09（上限 −3）；噬壁 +8；夹 18..50。 */
        recharge: seconds(
            F.base(30)
                .minus(F.stat("speed").minus(55).times(0.09).clamp(-3, 6))
                .plus(F.when(F.pref("devour", text("worldcombat.skill.psychicfangs.preference.devour")), F.const(8), F.const(0)))
                .clamp(18, 50).round(0),
            "冷却", "两次精神之牙之间的等待；比劈瓦长，换来更远更重的一口。")
    });

    defineDamage("psychicfangs", "bite", {}, { contact: true, bite: true });

    stages("psychicfangs", [
        { level: 30, values: { bite: 88 } },
        { level: 48, values: { bite: 98, devour: 0.2 } }
    ]);

    describe("psychicfangs", [
        { key: "description.0", values: ["bite", "fangWidth"] },
        { key: "description.1", values: ["lunge", "wardBreak", "devour"] },
        { key: "devour.on", values: [], when: function (context) { return read(context.detail.values, ["devour"]) === true; } },
        { key: "devour.off", values: [], when: function (context) { return read(context.detail.values, ["devour"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bite"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.bite", "tier.1.devour"] }
    ]);
}
