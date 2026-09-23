/**
 * 喷射拳 / jetpunch —— 参数与伤害段。
 *
 * 原生事实：水／物理／威力 60／命中 100／PP 15／优先度 +1／接触／拳（punch），无次要效果（Cobblemon 1.8，2 位学习者）。
 *   描述「将激流覆盖于拳头，以肉眼无法辨识的速度打出拳击。必定能够先制攻击」。
 *
 * 翻译：把「先制」翻成一记**站定不动的激流直拳**：水在拳上压缩成一条水柱，把拳程推出身外，
 *   拳头几乎瞬发地打出去；命中把目标**浇透**（共享身份 soaked，别的单元只问「湿没湿」）、沿水柱方向顶退，
 *   若它正带着火或灼伤，这一拳的水把火浇熄。它与音速拳同为「不位移的直拳」，区别是拳上裹着一条水柱：
 *   打得更远、更重、会浇湿对手；它也是全族唯一的拳（punch）水招。
 *   与水流喷射分开：水流喷射是把自己整个裹进水柱冲出去；喷射拳站着不动，水柱只裹拳，靠水花读出来。
 *
 * 数据分散（每个参数各吃不同的精灵数据，落到不同参数上）：
 *   torrent  水柱威力：物攻给拳力、速度给水压；水锤式 ×0.9。
 *   reach    拳程：身高给臂展、物攻给水柱推得更前；水锤式 −0.4；也是射程来源。它比音速拳长，因为水柱在拳外延伸。
 *   burst    判定半径：身高决定水花拳面多宽；水锤式 ×1.25。
 *   drive    顶开距离：物攻决定水柱把目标冲退多远；水锤式 ×1.7。
 *   drench   浇透时长：等级与体重决定水在身上挂多久；水锤式 ×0.7（水在撞击时炸散）。
 *   spray    水花数量：速度与体重驱动，表现按它发射。
 *   tempo/settle/recharge 速度决定起手、收招与冷却；水锤式冷却更久。
 *
 * 配置 `hammer`（水锤式）双向取舍：开启＝水柱在接触瞬间炸开，顶开 ×1.7、判定更宽、把目标推得更远，
 *   但威力 ×0.9、拳程 −0.4、浇透更短、冷却 +6 刻；关闭（直拳式）＝更长、更重、湿得更久，但顶得近。
 *   一个换「把对手推开、打断站位」，一个换「贴着打重一点」。
 *
 * 伤害段 `torrent` 与参数同名；接触与拳标记写在 defineDamage 上，对手防御、相性与暴击在命中时统一结算。
 * 浇透用的载体 `world_combat:jetpunch_drenched` 在 startup.ts 注册并打共享身份 soaked（identity_only）。
 */
namespace PokemonSkills {
    export const jetpunchId = "jetpunch";
    export const jetpunchScene = "world_combat:move_jetpunch";
    export const jetpunchDrenchedEffect = "world_combat:jetpunch_drenched";
    export const jetpunchHitText = "world_combat.move.jetpunch.text.hit";
    export const jetpunchDouseText = "world_combat.move.jetpunch.text.douse";
    export const jetpunchMissText = "world_combat.move.jetpunch.text.miss";

    actionParameters.define(jetpunchId, {
        /** 水柱威力：60 +（物攻 − 55）× 0.26 [−10,28] +（速度 − 55）× 0.18 [−5,18]；水锤 ×0.9；夹 34..112。 */
        torrent: formula(
            F.base(60)
                .plus(F.stat("attack").minus(55).times(0.26).clamp(-10, 28))
                .plus(F.stat("speed").minus(55).times(0.18).clamp(-5, 18))
                .times(F.when(F.pref("hammer", text("worldcombat.skill.jetpunch.preference.hammer")), F.const(0.9), F.const(1)))
                .clamp(34, 112).round(1),
            "水柱威力", {
                base: 60, unit: "威力",
                description: "裹着水柱的一拳打实的威力；物攻给拳力、速度给水压。水锤式每一下更轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 拳程：2.8 +（身高 − 1.4）× 0.30 [−0.15,0.8] +（物攻 − 55）× 0.004 [−0.1,0.25] − 水锤 0.4；夹 2.6..4.6。 */
        reach: formula(
            F.base(2.8).plus(F.body("height").minus(1.4).times(0.30).clamp(-0.15, 0.8))
                .plus(F.stat("attack").minus(55).times(0.004).clamp(-0.1, 0.25))
                .minus(F.when(F.pref("hammer", text("worldcombat.skill.jetpunch.preference.hammer")), F.const(0.4), F.const(0)))
                .clamp(2.6, 4.6).round(2),
            "拳程", {
                base: 2.8, unit: "格",
                description: "水柱把拳推出身外多远，也是本招的实际射程来源；臂长、力大的个体打得更前，水锤式略短。它比音速拳长。"
            }),
        /** 判定半径：0.42 +（身高 − 1.4）× 0.10 [−0.06,0.26]；水锤 ×1.25；夹 0.38..0.95。 */
        burst: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.10).clamp(-0.06, 0.26))
                .times(F.when(F.pref("hammer", text("worldcombat.skill.jetpunch.preference.hammer")), F.const(1.25), F.const(1)))
                .clamp(0.38, 0.95).round(2),
            "判定半径", { base: 0.42, unit: "格", description: "水花拳面扫过活体的横向半径；身板越大越宽，水锤式再宽四分之一。" }),
        /** 顶开距离：0.5 +（物攻 − 55）× 0.006 [−0.1,0.4]；水锤 ×1.7；夹 0.3..1.4。 */
        drive: formula(
            F.base(0.5).plus(F.stat("attack").minus(55).times(0.006).clamp(-0.1, 0.4))
                .times(F.when(F.pref("hammer", text("worldcombat.skill.jetpunch.preference.hammer")), F.const(1.7), F.const(1)))
                .clamp(0.3, 1.4).round(2),
            "顶开距离", { base: 0.5, unit: "格", description: "水柱把目标沿出拳方向冲退多远；物攻越高越远，水锤式冲得最狠。" }),
        /** 浇透时长：40 +（等级 − 20）× 0.8 [0,40] +（体重 − 100）× 0.05 [−6,20]；水锤 ×0.7；夹 30..120 刻。 */
        drench: seconds(
            F.base(40).plus(F.level().minus(20).times(0.8).clamp(0, 40))
                .plus(F.body("weight").minus(100).times(0.05).clamp(-6, 20))
                .times(F.when(F.pref("hammer", text("worldcombat.skill.jetpunch.preference.hammer")), F.const(0.7), F.const(1)))
                .clamp(30, 120).round(0),
            "浇透时长", "被一拳的水浇透后湿身（共享身份 soaked）挂多久；等级与体重越高挂得越久，水锤式的水炸散、湿得短。"),
        /** 水花数量：18 +（速度 − 55）× 0.30 [−3,14] +（体重 − 100）× 0.03 [−2,8]；夹 16..44。 */
        spray: formula(
            F.base(18).plus(F.stat("speed").minus(55).times(0.30).clamp(-3, 14))
                .plus(F.body("weight").minus(100).times(0.03).clamp(-2, 8)).clamp(16, 44).round(0),
            "水花数量", {
                base: 18, unit: "点",
                description: "水柱与命中时激起的水花数量，也直接驱动画面的发射量；速度与体重越高水花越密。"
            }),
        /** 起手：1 −（速度 − 55）× 0.02 [−0.6,1.2]；夹 0..3 刻。 */
        tempo: seconds(
            F.base(1).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.6, 1.2)).clamp(0, 3).round(0),
            "起手", "水在拳上聚成一股的时间；它快到几乎瞬发，先制招里最短之一。"),
        /** 收招：6 −（速度 − 55）× 0.02 [−0.8,1.5] + 水锤 2；夹 3..10 刻。 */
        settle: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.5))
                .plus(F.when(F.pref("hammer", text("worldcombat.skill.jetpunch.preference.hammer")), F.const(2), F.const(0)))
                .clamp(3, 10).round(0),
            "收招", "收拳站定的时间；它不位移，所以收得干脆，水锤式多带回一点余势。"),
        /** 冷却：16 −（速度 − 55）× 0.06 [−1.5,2.5] + 水锤 6；夹 10..28 刻。 */
        recharge: seconds(
            F.base(16).minus(F.stat("speed").minus(55).times(0.06).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("hammer", text("worldcombat.skill.jetpunch.preference.hammer")), F.const(6), F.const(0)))
                .clamp(10, 28).round(0),
            "冷却", "两次出拳之间的等待；直拳式回得最快，水锤式要重新压一股水。")
    });

    defineDamage(jetpunchId, "torrent", {}, { contact: true, punch: true });

    stages(jetpunchId, [
        { level: 28, values: { torrent: 70 } },
        { level: 44, values: { torrent: 82, reach: 3.2 } }
    ]);

    describe(jetpunchId, [
        { key: "description.0", values: ["torrent", "burst"] },
        { key: "description.1", values: ["reach", "drive"] },
        { key: "description.2", values: ["drench"] },
        { key: "hammer.on", values: [], when: function (context) { return read(context.detail.values, ["hammer"]) === true; } },
        { key: "hammer.off", values: [], when: function (context) { return read(context.detail.values, ["hammer"]) !== true; } },
        { key: "timing", values: ["reach", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.torrent"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.torrent", "tier.1.reach"] }
    ]);
}
