/**
 * 影子偷袭 / shadowsneak —— 参数与伤害段。
 *
 * 原生事实：幽灵／物理／威力 40／命中 100／PP 30／优先度 +1／接触，无次要效果（Cobblemon 1.8，39 位学习者）。
 *   描述「伸长影子，从对手的背后进行攻击。必定能够先制攻击」。
 *
 * 翻译：把「先制」翻成一记**贴地窜出的影子**：施法者本人不动，影子从自己脚下钻出去，从对手**背后**立起一刀。
 *   它不需要视线——影子走地面，绕过墙角与遮挡；命中从背后推来，把对手顺着手势**拽向施法者**（踉跄一步），
 *   这正是「从背后偷袭」的样子。它是全族最便宜、最快的一记先制起手。
 *   与最像的暗影拳分开：暗影拳从对手**自己的影子**里升起一只拳、从不失手、位置在正面；影子偷袭从**背面**刺，
 *   会把人往前拽。暗影拳是重拳（60），影子偷袭是轻快的一刺（40），专做开局与打断。
 *
 * 数据分散（每个参数各吃不同的精灵数据，落到不同参数上）：
 *   sneak   影刃威力：物攻给刀份量、速度给影子窜出的冲力；裹足式 ×0.88（把力分给控制），背刺式 ×1.15。
 *   reach   影子长度：等级与体型决定影子能伸多远，也是射程来源；裹足式更短。
 *   seep    蔓延速度：速度决定影子沿地面爬多快（决定命中延迟，对手看到它爬过来）。
 *   blade   判定半径：身高决定影刃多宽。
 *   pull    拖拽距离：物攻决定从背后把对手拽向自己多远；裹足式 ×1.6。
 *   grip    缚足级数：裹足式为 1（命中降一级速度），背刺式为 0。
 *   shade   影屑数量：速度与等级驱动，表现按它发射。
 *   tempo/settle/recharge 速度决定起手、收招与冷却；裹足式冷却更久。
 *
 * 配置 `tether`（裹足式）双向取舍：开启＝影子缠住对手的脚、命中降一级速度、拖拽强 60%，影刃更重地把它拉进怀里，
 *   但这一刺轻一成二、影子更短、冷却多 4 刻；关闭（背刺式）＝纯粹的背刺，更长、更重、回得更快，但没有减速。
 *   一个换控制与开团，一个换干净的伤害。
 *
 * 伤害段 `sneak` 与参数同名；接触标记写在 defineDamage 上，对手防御、相性与暴击在命中时统一结算。
 */
namespace PokemonSkills {
    export const shadowsneakId = "shadowsneak";
    export const shadowsneakScene = "world_combat:move_shadowsneak";
    export const shadowsneakHitText = "world_combat.move.shadowsneak.text.hit";
    export const shadowsneakBindText = "world_combat.move.shadowsneak.text.bind";
    export const shadowsneakMissText = "world_combat.move.shadowsneak.text.miss";

    actionParameters.define(shadowsneakId, {
        /** 影刃威力：40 +（物攻 − 55）× 0.22 [−8,22] +（速度 − 55）× 0.10 [−3,12]；裹足 ×0.88／背刺 ×1.15；夹 24..92。 */
        sneak: formula(
            F.base(40)
                .plus(F.stat("attack").minus(55).times(0.22).clamp(-8, 22))
                .plus(F.stat("speed").minus(55).times(0.10).clamp(-3, 12))
                .times(F.when(F.pref("tether", text("worldcombat.skill.shadowsneak.preference.tether")), F.const(0.88), F.const(1.15)))
                .clamp(24, 92).round(1),
            "影刃威力", {
                base: 40, unit: "威力",
                description: "影子从背后刺出的那一刀；物攻给刀的份量、速度给影子窜出的冲力。对手防御、相性与暴击在命中时另算。"
            }),
        /** 影子长度：6.2 +（等级 − 30）× 0.06 [−0.6,0.9] +（身高 − 1.4）× 0.5 [−0.2,0.8] − 裹足 0.6；夹 4..11。 */
        reach: formula(
            F.base(6.2)
                .plus(F.level().minus(30).times(0.06).clamp(-0.6, 0.9))
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.2, 0.8))
                .minus(F.when(F.pref("tether", text("worldcombat.skill.shadowsneak.preference.tether")), F.const(0.6), F.const(0)))
                .clamp(4, 11).round(2),
            "影子长度", {
                base: 6.2, unit: "格",
                description: "影子能从脚下伸到多远处的人背后，也是本招的实际射程来源；等级越高、身形越大伸得越远，裹足式略短。"
            }),
        /** 蔓延速度：1.7 +（速度 − 55）× 0.008 [−0.3,0.6]；夹 1.2..2.6。 */
        seep: formula(
            F.base(1.7).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.3, 0.6)).clamp(1.2, 2.6).round(2),
            "蔓延速度", {
                base: 1.7, unit: "格/刻",
                description: "影子沿地面爬向对手的速度；速度快的个体刀来得更早，对手更少时间挪开。"
            }),
        /** 判定半径：0.38 +（身高 − 1.4）× 0.09 [−0.06,0.22]；夹 0.30..0.68。 */
        blade: formula(
            F.base(0.38).plus(F.body("height").minus(1.4).times(0.09).clamp(-0.06, 0.22)).clamp(0.30, 0.68).round(2),
            "判定半径", {
                base: 0.38, unit: "格",
                description: "影刃扫过活体的横向半径；身板越大凝出的刃越宽。表现与判定共用它。"
            }),
        /** 拖拽距离：0.7 +（物攻 − 55）× 0.004 [−0.08,0.3]；裹足 ×1.6；夹 0.4..1.9。 */
        pull: formula(
            F.base(0.7).plus(F.stat("attack").minus(55).times(0.004).clamp(-0.08, 0.3))
                .times(F.when(F.pref("tether", text("worldcombat.skill.shadowsneak.preference.tether")), F.const(1.6), F.const(1)))
                .clamp(0.4, 1.9).round(2),
            "拖拽距离", {
                base: 0.7, unit: "格",
                description: "从背后命中后把对手朝施法者拽多远；物攻越高拽得越远，裹足式拽得更狠。"
            }),
        /** 缚足级数：裹足式 1，背刺式 0。 */
        grip: formula(
            F.when(F.pref("tether", text("worldcombat.skill.shadowsneak.preference.tether")), F.const(1), F.const(0)).round(0),
            "缚足级数", {
                base: 0, unit: "级",
                description: "裹足式命中时对手的速度降低几级（对所有战斗者一致）；背刺式不降速。"
            }),
        /** 影屑数量：16 +（速度 − 55）× 0.28 [−3,12] +（等级 − 30）× 0.15 [−1,4]；夹 12..40。 */
        shade: formula(
            F.base(16).plus(F.stat("speed").minus(55).times(0.28).clamp(-3, 12))
                .plus(F.level().minus(30).times(0.15).clamp(-1, 4)).clamp(12, 40).round(0),
            "影屑数量", {
                base: 16, unit: "点",
                description: "影子爬行与刺出时带起的影屑数量，也直接驱动画面的发射量；速度与等级越高越密。"
            }),
        /** 起手：3 −（速度 − 55）× 0.02 [−0.8,1.6]；夹 1..5 刻。 */
        tempo: seconds(
            F.base(3).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.6)).clamp(1, 5).round(0),
            "起手", "影子在脚下攒起来的时间；它是先制招，几乎一眨眼就窜出去。"),
        /** 收招：5 −（速度 − 55）× 0.02 [−0.8,1.6]；夹 3..8 刻。 */
        settle: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.6)).clamp(3, 8).round(0),
            "收招", "影子收回脚下、人站定的时间。"),
        /** 冷却：16 −（速度 − 55）× 0.06 [−1.5,2.5] + 裹足 4；夹 10..28 刻。 */
        recharge: seconds(
            F.base(16).minus(F.stat("speed").minus(55).times(0.06).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("tether", text("worldcombat.skill.shadowsneak.preference.tether")), F.const(4), F.const(0)))
                .clamp(10, 28).round(0),
            "冷却", "两次偷袭之间的等待；背刺式回得最快，裹足式要重新缠一次脚。")
    });

    defineDamage(shadowsneakId, "sneak", {}, { contact: true });

    stages(shadowsneakId, [
        { level: 20, values: { sneak: 50 } },
        { level: 36, values: { sneak: 60, reach: 7.0 } }
    ]);

    describe(shadowsneakId, [
        { key: "description.0", values: ["sneak"] },
        { key: "description.1", values: ["reach","seep"] },
        { key: "description.2", values: ["pull"] },
        { key: "tether.on", values: ["grip"], when: function (context) { return read(context.detail.values, ["tether"]) === true; } },
        { key: "tether.off", values: [], when: function (context) { return read(context.detail.values, ["tether"]) !== true; } },
        { key: "timing", values: ["reach", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sneak"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.sneak", "tier.1.reach"] }
    ]);
}
