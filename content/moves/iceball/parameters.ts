/**
 * 冰球 / iceball 的参数与数值来源。
 *
 * 原生事实：冰／物理／威力 30／命中 90／PP 20／接触／子弹类（bullet）；锁定 5 回合连续滚动，每命中一次
 * 威力翻倍（30→60→120→240→480）；使用者处于「蜷缩」状态时整招威力再翻倍（Cobblemon 1.8，21 位学习者）。
 *
 * 翻译：把「原地蜷成冰球、一回合滚一次、越滚越重」翻成**一次出手内一颗会自己回头的冰球**——施法者蜷身
 * 定住不动，把冰球抛向目标；命中一趟就在壳上加冻一层，球体随之胀大、下一趟更重；冰球飞空就绕回来再撞，
 * 直到撞满 `passes` 趟或目标消失。最后一下撞碎，在落点留下几块冰面（`world.terrain` 租借，走完自己化掉）。
 * 与滚动分开：滚动是施法者自己跨出手一趟趟滚、靠顶开来逼你重新贴；冰球是**一次出手内**离手的球，会追踪回头。
 *
 * 数值分散（每个参数各吃不同的精灵数据，小差距才在场上看得出来）：
 *   ball      每趟威力：物攻定球有多重；再乘 ramp^已命中趟数。
 *   passes    趟数上限：固定 5 趟，是本招整套的长度。
 *   ramp      每中一趟的递增倍数：本招的加速档，厚壳式更陡。
 *   cap       威力上限：等级与物攻决定尾段最大能到多重，避免无限翻倍。
 *   speed     球速：速度决定球飞得快不快。
 *   flight    飞行距离：等级与速度决定球能飞多远，也是本招的实际射程来源。
 *   radius    判定半径：碰撞箱宽度决定球体多大一圈。
 *   gap       趟间隔：速度决定球回得多急；厚壳式更慢。
 *   frostCells 冰面块数：物攻决定碎开时冻住几块地；厚壳式更多。
 *   frostTicks 冰面停留：等级决定冰面留多久；厚壳式更久。
 *   shards    冰屑点数：物攻派生，表现按它发射。
 *   tempo／recover／recharge：速度与配置共同决定起手、收招与冷却。
 *
 * 配置 `thick`（厚壳式）双向取舍（默认关）：
 *   开（厚壳）：每中一趟乘 2.3、威力上限 ×1.15、冰面更大更久，代价是球速 ×0.85、趟间隔 +2 刻、收招 +2 刻、
 *     冷却 +6 刻、每趟基础威力 ×0.9——更重更难被躲开，但慢而费。
 *   关（薄壳，原生形态）：乘 2.0、球飞得更快、趟间隔与冷却更短，代价是上限较低、冰面更小更短。
 *
 * 伤害段 `ball` 走共享换算（对手防御、相性与暴击在命中时另算）；接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    export const iceballId = "iceball";
    export const iceballScene = "world_combat:move_iceball";
    export const iceballCapText = "world_combat.move.iceball.text.cap";
    export const iceballHitText = "world_combat.move.iceball.text.hit";
    /** 表现里冰球的参考半径（格）；服务端传 scale = 实际半径 / 这个值。 */
    export const iceballReference = 0.45;

    actionParameters.define(iceballId, {
        /** 每趟威力：(8 + 物攻偏移[−2,9]) × 厚壳 0.9；夹 5..26。 */
        ball: formula(
            F.base(8)
                .plus(F.stat("attack").minus(50).times(0.08).clamp(-2, 9))
                .times(F.when(F.pref("thick", { key: "worldcombat.skill.iceball.preference.thick", fallback: "厚壳式" }), F.const(0.9), F.const(1)))
                .clamp(5, 26).round(1),
            "每趟威力", {
                unit: "威力",
                description: "冰球一趟撞上去的基础威力；物攻越高球越重，再乘 ramp 的已命中趟数次方。对手防御、相性与暴击在命中时另算。"
            }),
        /** 趟数上限：固定 5 趟。 */
        passes: formula(
            F.base(5).round(0),
            "趟数上限", {
                unit: "趟",
                description: "这一串最多撞几趟；撞满之后冰球碎开，在落点留下冰面。"
            }),
        /** 每中一趟的递增倍数：厚壳 2.3 / 薄壳 2.0。 */
        ramp: formula(
            F.when(F.pref("thick", { key: "worldcombat.skill.iceball.preference.thick", fallback: "厚壳式" }), F.const(2.3), F.const(2.0)).round(2),
            "每中翻倍", {
                unit: "倍",
                description: "每命中一趟，下一趟威力乘上这个倍数；厚壳式更陡（原生为 2 倍）。"
            }),
        /** 威力上限：26 + 等级偏移[0,10]，厚壳 ×1.15；夹 22..62。 */
        cap: formula(
            F.base(26).plus(F.level().minus(20).times(0.4).clamp(0, 10))
                .times(F.when(F.pref("thick", { key: "worldcombat.skill.iceball.preference.thick", fallback: "厚壳式" }), F.const(1.15), F.const(1)))
                .clamp(22, 62).round(1),
            "威力上限", {
                unit: "威力",
                description: "单趟威力的天花板；尾段撞到上限就不再涨，避免无限翻倍。等级越高、厚壳式越抬得高。"
            }),
        /** 球速：0.9 + 速度偏移[−0.12,0.4]，厚壳 ×0.85 / 薄壳 ×1.06；夹 0.6..1.5。 */
        speed: formula(
            F.base(0.9).plus(F.stat("speed").minus(50).times(0.006).clamp(-0.12, 0.4))
                .times(F.when(F.pref("thick", { key: "worldcombat.skill.iceball.preference.thick", fallback: "厚壳式" }), F.const(0.85), F.const(1.06)))
                .clamp(0.6, 1.5).round(2),
            "球速", {
                unit: "格/刻",
                description: "冰球飞行的速度；速度快的个体球更利落，厚壳式更慢也因此更好躲。"
            }),
        /** 飞行距离：8 + 等级偏移[0,2.2] + 速度偏移[−0.6,1.6]；夹 6..13。 */
        flight: formula(
            F.base(8)
                .plus(F.level().minus(20).times(0.06).clamp(0, 2.2))
                .plus(F.stat("speed").minus(50).times(0.02).clamp(-0.6, 1.6))
                .clamp(6, 13).round(2),
            "飞行距离", {
                unit: "格",
                description: "冰球能够到多远；等级越高、出手越快飞得越远。它也是本招的实际射程来源。"
            }),
        /** 判定半径：0.45 + 碰撞箱宽度偏移[−0.05,0.3]；夹 0.38..0.9。 */
        radius: formula(
            F.base(0.45).plus(F.body("width").minus(0.9).times(0.3).clamp(-0.05, 0.3)).clamp(0.38, 0.9).round(2),
            "判定半径", {
                unit: "格",
                description: "冰球能撞到多大一圈；身体越宽的个体球体越大，画面里的球径与它一致。"
            }),
        /** 趟间隔：6 − 速度偏移[−1,1.6]，厚壳 +2 / 薄壳 −1；夹 4..11。 */
        gap: seconds(
            F.base(6).minus(F.stat("speed").minus(50).times(0.02).clamp(-1, 1.6))
                .plus(F.when(F.pref("thick", { key: "worldcombat.skill.iceball.preference.thick", fallback: "厚壳式" }), F.const(2), F.const(-1)))
                .clamp(4, 11).round(0),
            "趟间隔", "两趟之间冰球绕回来的时间；速度越快越急，厚壳更慢、给对手更长的窗口。"),
        /** 冰面块数：3 + 物攻偏移[−1,4]，厚壳 ×1.5；夹 2..8。 */
        frostCells: formula(
            F.base(3).plus(F.stat("attack").minus(50).times(0.06).clamp(-1, 4))
                .times(F.when(F.pref("thick", { key: "worldcombat.skill.iceball.preference.thick", fallback: "厚壳式" }), F.const(1.5), F.const(1)))
                .clamp(2, 8).round(0),
            "冰面块数", {
                unit: "块",
                description: "冰球碎开时在落点冻住几块地面；物攻越高、厚壳式越多。冰面会滑，是留给战场的一小片改变。"
            }),
        /** 冰面停留：70 + 等级偏移[0,30]，厚壳 ×1.25；夹 50..170。 */
        frostTicks: seconds(
            F.base(70).plus(F.level().minus(20).times(0.7).clamp(0, 30))
                .times(F.when(F.pref("thick", { key: "worldcombat.skill.iceball.preference.thick", fallback: "厚壳式" }), F.const(1.25), F.const(1)))
                .clamp(50, 170).round(0),
            "冰面停留", "碎开留下的冰面过多久被地面收回；等级越高留得越久，厚壳式更久。"),
        /** 冰屑点数：16 + 物攻偏移[−3,16]；夹 12..44。 */
        shards: formula(
            F.base(16).plus(F.stat("attack").minus(50).times(0.12).clamp(-3, 16)).clamp(12, 44).round(0),
            "冰屑点数", {
                unit: "点",
                description: "飞行与撞击时迸出的冰屑数量，随物攻增长；粒子直接按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：7 − 速度偏移[−0.8,1.5]；夹 5..10。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(50).times(0.02).clamp(-0.8, 1.5)).clamp(5, 10).round(0),
            "起手", "蜷身抱成一团、把冰球捧到身前的时间；速度越快越短。"),
        /** 收招：8 − 速度偏移[−0.8,1.6]，厚壳 +2；夹 5..12。 */
        recover: seconds(
            F.base(8).minus(F.stat("speed").minus(50).times(0.02).clamp(-0.8, 1.6))
                .plus(F.when(F.pref("thick", { key: "worldcombat.skill.iceball.preference.thick", fallback: "厚壳式" }), F.const(2), F.const(0)))
                .clamp(5, 12).round(0),
            "收招", "冰球碎开后重整姿态的时间；速度越快收得越快，厚壳式更慢。"),
        /** 冷却：38 − 速度偏移[−2,5]，厚壳 +6 / 薄壳 −4；夹 24..54。 */
        recharge: seconds(
            F.base(38).minus(F.stat("speed").minus(50).times(0.05).clamp(-2, 5))
                .plus(F.when(F.pref("thick", { key: "worldcombat.skill.iceball.preference.thick", fallback: "厚壳式" }), F.const(6), F.const(-4)))
                .clamp(24, 54).round(0),
            "冷却", "再滚一颗冰球前的等待；速度越快回得越快，厚壳更费、薄壳更短。PP 20 的代价。")
    });

    defineDamage(iceballId, "ball", {}, { contact: true });

    stages(iceballId, [
        { level: 30, values: { ball: 10, flight: 8.6 } },
        { level: 55, values: { ball: 13, cap: 34, flight: 10 } }
    ]);

    describe(iceballId, [
        { key: "description.0", values: ["ball","passes"] },
        { key: "description.1", values: ["ramp", "cap", "speed", "radius"] },
        { key: "description.2", values: ["flight","gap","frostCells","frostTicks"] },
        { key: "description.stance", values: [] },
        { key: "thick.on", values: [], when: function (context) { return read(context.detail.values, ["thick"]) === true; } },
        { key: "thick.off", values: [], when: function (context) { return read(context.detail.values, ["thick"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.ball", "tier.0.flight"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.ball", "tier.1.cap", "tier.1.flight"] }
    ]);
}
