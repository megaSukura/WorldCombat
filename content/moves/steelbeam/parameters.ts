/**
 * 铁蹄光线 / steelbeam 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：钢、特殊、威力 140、命中 95、PP 5、优先度 0、非接触；
 * 使用后自身损失最大生命的 1/2（Mind Blown 式固定自损，打空也照付）。
 *
 * 翻译：保留「把全身的钢铁化为光束激烈地发射出去」，但把它做成**重而短的一根钢梁**——
 * 从身上剥下的金属在身前铸成一束，沿准线砸出去，把走廊里第一个活体钉住并撞飞；施法者付出的是身上
 * 那层钢本身：**固定比例的最大生命，一次结清，与打没打中无关**。这和三族里其余三招分开：
 *   破坏光线是细长贯穿、代价是熄火；破灭之光是粗重贯穿、代价随造成的伤害走；
 *   叶绿爆震是扇形放光、代价随放出的力量走。铁蹄光线只有一只目标，代价却是**身体本身**，最重也最不可躲。
 *
 * 数值来源（每项读不同精灵数据，配置再各自乘一档）：
 *   lance  钢梁威力：特攻定钢的密度，等级定铸得顺不顺，体重把更多金属压进这一束。
 *   reach  钢梁长度：速度决定甩得多远，体重拖累射程；同时是本招实际射程基准。
 *   width  钢梁半宽：身板越高，剥下的钢面越宽。
 *   cost   自损比例：防御越硬越扛得住剥落、体重越大失血越多；淬火式只剥外层。
 *   knock  钉退距离：体重与特攻决定把目标顶开多远。
 *   shards 钢屑数量：体重与身高派生，表现按它发射。
 *   tempo／aftercast／recharge：速度决定节奏，淬火式多花一点起手。
 *
 * 配置 `temper`（淬火式）双向取舍：开启＝只剥外层，自损 ×0.65，但钢梁更轻——威力 ×0.9、射程 ×0.82、
 * 半宽 ×0.8；关闭（全抛式）＝把整层钢压进这一束，威力 ×1.1、射程 ×1.12、半宽 ×1.12，代价是全额自损。
 * 保命 vs 一击，两个方向各有局面。
 *
 * 伤害段 `lance`：这一束随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    export const steelbeamId = "steelbeam";
    export const steelbeamScene = "world_combat:move_steelbeam";
    export const steelbeamHitText = "world_combat.move.steelbeam.text.hit";
    export const steelbeamMissText = "world_combat.move.steelbeam.text.miss";
    export const steelbeamShedText = "world_combat.move.steelbeam.text.shed";

    actionParameters.define(steelbeamId, {
        /** 钢梁威力：基础 140，特攻每比 60 多 1 加 1.05（夹 -30..85），等级每比 20 多 1 加 0.4（夹 0..30），体重每比 60 多 1 加 0.12（夹 -10..30）；淬火 ×0.9 / 全抛 ×1.1；夹在 95..260。 */
        lance: formula(
            F.base(140)
                .plus(F.stat("specialAttack").minus(60).times(1.05).clamp(-30, 85))
                .plus(F.level().minus(20).times(0.4).clamp(0, 30))
                .plus(F.body("weight").minus(60).times(0.12).clamp(-10, 30))
                .times(F.when(F.pref("temper", text("worldcombat.skill.steelbeam.preference.temper")), F.const(0.9), F.const(1.1)))
                .clamp(95, 260).round(1),
            "钢梁威力", {
                unit: "威力",
                description: "这一束钢梁砸在第一个目标身上的基础威力；特攻越高、金属越重越狠，淬火式略收。对手防御、相性与暴击在命中时由共享结算另算。"
            }),
        /** 钢梁长度：基础 8.5 格，速度每比 60 快 1 加 0.04（夹 -2..3.5），体重每比 60 多 1 减 0.008（夹 -1.2..1.6）；淬火 ×0.82 / 全抛 ×1.12；夹在 5..14。 */
        reach: formula(
            F.base(8.5)
                .plus(F.stat("speed").minus(60).times(0.04).clamp(-2, 3.5))
                .minus(F.body("weight").minus(60).times(0.008).clamp(-1.2, 1.6))
                .times(F.when(F.pref("temper", text("worldcombat.skill.steelbeam.preference.temper")), F.const(0.82), F.const(1.12)))
                .clamp(5, 14).round(2),
            "钢梁长度", {
                unit: "格",
                description: "钢梁从身前一直砸到多远，也是本招实际的目标接受范围；腿快甩得远，身子越沉越拖累，全抛式更长。"
            }),
        /** 钢梁半宽：基础 0.85，碰撞箱每比 1.4 高 1 格加 0.3；淬火 ×0.8 / 全抛 ×1.12；夹在 0.5..1.6。 */
        width: formula(
            F.base(0.85).plus(F.body("height").minus(1.4).times(0.3))
                .times(F.when(F.pref("temper", text("worldcombat.skill.steelbeam.preference.temper")), F.const(0.8), F.const(1.12)))
                .clamp(0.5, 1.6).round(2),
            "钢梁半宽", {
                unit: "格",
                description: "走廊的横向半宽，也是玩家看到的那根钢梁有多粗；身板越高剥下的钢面越宽，全抛式更粗。"
            }),
        /** 自损比例：基础 0.5，防御每比 60 多 1 减 0.0007（夹 0..0.12），体重每比 60 多 1 加 0.0006（夹 -0.04..0.1）；淬火 ×0.65；夹在 0.15..0.6。 */
        cost: formula(
            F.base(0.5)
                .minus(F.stat("defence").minus(60).times(0.0007).clamp(0, 0.12))
                .plus(F.body("weight").minus(60).times(0.0006).clamp(-0.04, 0.1))
                .times(F.when(F.pref("temper", text("worldcombat.skill.steelbeam.preference.temper")), F.const(0.65), F.const(1)))
                .clamp(0.15, 0.6).round(3),
            "自损比例", {
                presentation: "percent",
                description: "把身上的钢剥下来要付出的最大生命比例，固定结清、和打没打中无关；防御越硬越扛得住，体重越大失血越多，淬火式只剥外层。"
            }),
        /** 钉退距离：基础 0.9 格，体重每比 60 多 1 加 0.004（夹 -0.3..0.9），特攻每比 60 多 1 加 0.004（夹 -0.2..0.6）；夹在 0.4..2.8。 */
        knock: formula(
            F.base(0.9)
                .plus(F.body("weight").minus(60).times(0.004).clamp(-0.3, 0.9))
                .plus(F.stat("specialAttack").minus(60).times(0.004).clamp(-0.2, 0.6))
                .clamp(0.4, 2.8).round(2),
            "钉退距离", {
                unit: "格",
                description: "命中后把第一个目标沿钢梁方向撞开多远；越重、特攻越高顶得越远。"
            }),
        /** 钢屑数量：基础 26，体重每比 60 多 1 加 0.3（夹 -8..18），身高每比 1.4 多 1 加 10（夹 -4..14）；夹在 18..70。 */
        shards: formula(
            F.base(26)
                .plus(F.body("weight").minus(60).times(0.3).clamp(-8, 18))
                .plus(F.body("height").minus(1.4).times(10).clamp(-4, 14))
                .clamp(18, 70).round(0),
            "钢屑数量", {
                unit: "个",
                description: "剥落与命中时崩出的钢屑数量，随体重与身高增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 12 刻，速度每比 60 快 1 减 0.03 刻（夹 -3..4），淬火 +2 刻；夹在 7..20。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 4))
                .plus(F.when(F.pref("temper", text("worldcombat.skill.steelbeam.preference.temper")), F.const(2), F.const(0)))
                .clamp(7, 20).round(0),
            "起手", "剥下全身的钢、在身前铸成一束的时长；速度越快越干脆，淬火式要先稳住表层。"),
        /** 收招：基础 10 刻，速度每比 60 快 1 减 0.02 刻（夹 -2..3）；夹在 6..16。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(6, 16).round(0),
            "收招", "钢梁出手后站定的时长；越快恢复得越干脆。"),
        /** 冷却：基础 46 刻，速度每比 60 快 1 减 0.05 刻（夹 -6..10）；夹在 30..70。 */
        recharge: seconds(
            F.base(46).minus(F.stat("speed").minus(60).times(0.05).clamp(-6, 10)).clamp(30, 70).round(0),
            "冷却", "两次铁蹄光线之间的间隔；速度越快回得越快。")
    });

    stages(steelbeamId, [
        { level: 40, values: { lance: 160 } },
        { level: 60, values: { lance: 178, cost: 0.44 } }
    ]);

    defineDamage(steelbeamId, "lance", { defenceCoefficient: 0.0051,
        rationale: "沉重的钢梁对特殊防御的压制略强，让特攻与体型的差距在场上更明显。" }, {});

    describe(steelbeamId, [
        { key: "description.0", values: ["lance","reach","width"] },
        { key: "description.1", values: ["knock","cost"] },
        { key: "temper.on", values: [], when: function (context) { return read(context.detail.values, ["temper"]) === true; } },
        { key: "temper.off", values: [], when: function (context) { return read(context.detail.values, ["temper"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.lance"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.lance", "tier.1.cost"] }
    ]);
}
