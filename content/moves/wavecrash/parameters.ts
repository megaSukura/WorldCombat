/**
 * 波动冲 / wavecrash 的参数与伤害段。
 *
 * 原生事实：水、物理、威力 120、命中 100、PP 10、接触、反作用力 1/3（Cobblemon 1.8，16 位学习者）。
 * 翻译：把“让水覆盖全身后撞向对手”落成一次**裹水涌进的浪冲**——起手把水从四周聚成一层贴身的壳，
 * 提交后整个人连着水墙一起涌出去，撞实的一刻水壳在接触面炸开、把目标浇透并冲开；
 * 冲完水壳散在身后，代价是那一撞的反震砸回自己身上。
 *
 * 与同族分开：舍身冲撞是干身猛撞、撞完双方被弹开；勇鸟猛攻从空中俯冲穿线；木槌用坚硬躯体砸地。
 * 波动冲的辨识点是**水**：它把目标浇湿（共享身份 world_combat:status/soaked，与水流裂破同一件事），
 * 而且施法者本身湿透时水势更盛（雨里、水里冲出去更狠）。玩家凭“带着水墙涌过来、把人浇透”认出它。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   surge           浪冲威力：物攻给狠度，速度把水墙的冲势压进去；湿身再抬一档；厚水壳略抬。
 *   rush            涌进距离：速度与碰撞箱高度决定涌得多远；湿身更远；也是本招射程基准。
 *   pace            每刻位移：速度决定涌进速度。
 *   collisionRadius 判定半径：碰撞箱高度决定水墙多宽。
 *   recoil          反伤比例：防御越高越轻、体重越大越沉；水壳能卸力，湿身与厚水壳都更轻。
 *   drench          湿身时长：水墙大小决定浇透多久；厚水壳更久。
 *   push            冲开距离：速度决定把目标冲多远。
 *   spray           溅水量：速度与威力派生，表现按它发射。
 *   cloak/aftercast/recharge  速度决定聚水/收势/冷却；厚水壳更慢。
 * 配置 thick（厚水壳）双向取舍：开启＝水壳更厚，威力更高、反伤更轻、浇得更久，但涌进更短、起手与冷却更慢；
 * 关闭（薄水刃）＝水壳更薄，涌得更远更快，反伤更重。两个方向各有适用局面（重击＋保命 vs 追击）。
 *
 * 伤害段 surge：这次浪冲随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("wavecrash", {
        /** 浪冲威力：基础 120，物攻每比 60 多 1 加 0.5（上限 +55），速度每比 60 快 1 加 0.18（上限 +30）；湿身 ×1.12；厚水壳 ×1.08；夹在 70..235。 */
        surge: formula(
            F.base(120).plus(F.stat("attack").minus(60).times(0.5).clamp(-30, 55))
                .plus(F.stat("speed").minus(60).times(0.18).clamp(-10, 30))
                .times(F.when(F.state("wet", text("worldcombat.skill.wavecrash.value.wet")), F.const(1.12), F.const(1)))
                .times(F.when(F.pref("thick", text("worldcombat.skill.wavecrash.preference.thick")), F.const(1.08), F.const(1)))
                .clamp(70, 235).round(1),
            "浪冲威力", {
                unit: "威力",
                description: "连着水墙撞实这一下的基础威力；物攻越高、冲势越猛越狠，湿身与厚水壳再抬一档。对手防御、相性与暴击在命中时另算。"
            }),
        /** 涌进距离：基础 4.2 格，速度每比 60 快 1 加 0.024，高度每比 1.4 高 1 格加 0.35；湿身 ×1.15；厚水壳 ×0.9；夹在 2.8..7.0。 */
        rush: formula(
            F.base(4.2).plus(F.stat("speed").minus(60).times(0.024).clamp(-1.2, 2.6))
                .plus(F.body("height").minus(1.4).times(0.35).clamp(-0.3, 1.0))
                .times(F.when(F.state("wet", text("worldcombat.skill.wavecrash.value.wet")), F.const(1.15), F.const(1)))
                .times(F.when(F.pref("thick", text("worldcombat.skill.wavecrash.preference.thick")), F.const(0.9), F.const(1)))
                .clamp(2.8, 7.0).round(2),
            "涌进距离", {
                unit: "格",
                description: "水墙从起步到散开的总位移，也是本招的射程基准；冲得快、身架大涌得更远，湿身更远、厚水壳更短。"
            }),
        /** 每刻位移：基础 0.86 格/刻，速度每比 60 快 1 加 0.007；夹在 0.58..1.5。 */
        pace: formula(
            F.base(0.86).plus(F.stat("speed").minus(60).times(0.007).clamp(-0.28, 0.64)).clamp(0.58, 1.5).round(2),
            "涌进速度", {
                unit: "格/刻",
                description: "水墙每刻推进的距离；越快越难被侧移让开。"
            }),
        /** 判定半径：基础 0.62 格加碰撞箱高度 ×0.18；夹在 0.45..1.05。 */
        collisionRadius: formula(
            F.base(0.62).plus(F.body("height").minus(1.4).times(0.18)).clamp(0.45, 1.05).round(2),
            "判定半径", {
                unit: "格",
                description: "裹在全身的水墙宽度，也是本招的横向判定半径；身板越大水墙越宽。"
            }),
        /** 反伤比例：基础 0.30，防御每比 60 多 1 少 0.0006（上限 −0.14），体重每比 60 多 1 加 0.0006（上限 +0.1）；湿身 ×0.9，厚水壳 ×0.85；夹在 0.14..0.46。 */
        recoil: formula(
            F.base(0.30).minus(F.stat("defence").minus(60).times(0.0006).clamp(0, 0.14))
                .plus(F.body("weight").minus(60).times(0.0006).clamp(-0.04, 0.1))
                .times(F.when(F.state("wet", text("worldcombat.skill.wavecrash.value.wet")), F.const(0.9), F.const(1)))
                .times(F.when(F.pref("thick", text("worldcombat.skill.wavecrash.preference.thick")), F.const(0.85), F.const(1)))
                .clamp(0.14, 0.46).round(3),
            "反伤比例", {
                unit: "比例",
                description: "命中后按实际伤害反震自己的比例；防御越高越轻、身体越沉越狠。水壳能卸掉一部分——湿身与厚水壳都更轻。"
            }),
        /** 湿身时长：基础 120 刻，高度每比 1.4 高 1 格加 20 刻，厚水壳 ×1.4；夹在 80..320。 */
        drench: seconds(
            F.base(120).plus(F.body("height").minus(1.4).times(20).clamp(-20, 60))
                .times(F.when(F.pref("thick", text("worldcombat.skill.wavecrash.preference.thick")), F.const(1.4), F.const(1)))
                .clamp(80, 320).round(0),
            "湿身时长", "命中后目标带着的水多久才干；水墙越大浇得越久，厚水壳更久。别人可以按共享身份 world_combat:status/soaked 消费它。"),
        /** 冲开距离：基础 0.8 格，速度每比 60 快 1 加 0.004（上限 +0.5），高度每比 1.4 高 1 格加 0.1；夹在 0.35..1.6。 */
        push: formula(
            F.base(0.8).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.25, 0.5))
                .plus(F.body("height").minus(1.4).times(0.1).clamp(-0.1, 0.3))
                .clamp(0.35, 1.6).round(2),
            "冲开距离", {
                unit: "格",
                description: "命中后把目标沿涌进方向冲开多远；冲得快、水墙大的个体冲得更远。"
            }),
        /** 溅水量：基础 26，速度每比 60 快 1 加 0.35（夹 -8..22），物攻每比 60 多 1 加 0.15（夹 -4..12）；夹在 18..72。 */
        spray: formula(
            F.base(26).plus(F.stat("speed").minus(60).times(0.35).clamp(-8, 22))
                .plus(F.stat("attack").minus(60).times(0.15).clamp(-4, 12))
                .clamp(18, 72).round(0),
            "溅水量", {
                unit: "个",
                description: "浪冲与命中溅起的水花数量，随速度与物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 聚水：基础 9 刻，速度每比 60 快 1 减 0.02 刻，厚水壳 +2 刻；夹在 5..14。 */
        cloak: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("thick", text("worldcombat.skill.wavecrash.preference.thick")), F.const(2), F.const(0)))
                .clamp(5, 14).round(0),
            "聚水", "把水从四周收拢成贴身水壳的时长；速度越快越干脆，厚水壳要多收一点。"),
        /** 收招：基础 9 刻，速度每比 60 快 1 减 0.02 刻，厚水壳 +2 刻；夹在 5..16。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("thick", text("worldcombat.skill.wavecrash.preference.thick")), F.const(2), F.const(0)))
                .clamp(5, 16).round(0),
            "收招", "水壳散开、站稳的收势；厚水壳要多花一点时间卸掉水。"),
        /** 冷却：基础 44 刻，速度每比 60 快 1 减 0.05 刻，厚水壳 +8 刻；夹在 30..74。 */
        recharge: seconds(
            F.base(44).minus(F.stat("speed").minus(60).times(0.05).clamp(-5, 10))
                .plus(F.when(F.pref("thick", text("worldcombat.skill.wavecrash.preference.thick")), F.const(8), F.const(0)))
                .clamp(30, 74).round(0),
            "冷却", "再次聚水前所需的间隔；速度越快回得越快，厚水壳蓄得更久。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    stages("wavecrash", [
        { level: 40, values: { surge: 130 } },
        { level: 58, values: { surge: 146, drench: 180 } }
    ]);

    defineDamage("wavecrash", "surge", { defenceCoefficient: 0.0046,
        rationale: "水墙拍上去把力摊开，钝撞更容易透过护甲，让体格与等级差更明显。" }, { contact: true });

    describe("wavecrash", [
        { key: "description.0", values: ["surge", "rush", "pace", "collisionRadius"] },
        { key: "description.1", values: ["recoil", "drench", "push"] },
        { key: "thick.on", values: [], when: function (context) { return read(context.detail.values, ["thick"]) === true; } },
        { key: "thick.off", values: [], when: function (context) { return read(context.detail.values, ["thick"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.surge"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.surge", "tier.1.drench"] }
    ]);
}
