/**
 * 逐步击破 / chipaway —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：一般、物理、威力 70、命中 100、PP 20、优先度 0、接触、无追加效果
 *   （49 位学习者）。描述「看准机会稳步攻击。无视对手的能力变化，直接给予伤害。」——
 *   即这一击按目标处于中性能力等级结算：目标涨防（或被削防）都不改变这一击的伤害。
 *
 * 翻译：把「稳步攻击、无视能力变化」落成**贴脸一段有节奏的三拍连击，每一拍落在不同的高度**——
 *   对手把防御架势扎在某条线上，另外两条线照样进得去，所以它涨起来的防御等级挡不住这几拍。
 *   它是本族里唯一的连击：最稳、最省、最贴脸；不追求单发分量。
 *
 * 与同族分开：ＤＤ金勾臂是原地一整圈的横扫、圣剑是一条最长最直的切斩、惩罚是越读越重的一记处刑；
 *   逐步击破凭「贴脸、分高度、接连几拍」认出来，也是本族节奏最快的一招。
 *
 * 「无视能力变化」的落点：`skill.ts` 末尾注册的 `PokemonDamage.metadata` 贡献点，在结算前把目标本段
 *   对应的防御能力等级归零（对宝可梦读原生等级、对任何生物同一副阶梯），因而目标的涨防／削防都不参与这一击；
 *   攻击方自身的能力等级、相性、暴击、护甲与特性道具仍照常结算。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   strike     每拍威力：物攻定拳劲、等级给稳；抢攻式更轻、稳步式更重。
 *   beats      拍数：速度决定能连几拍；抢攻式再补一拍。
 *   reach      臂程：身高给臂长与上半步、速度给前探，也是实际射程。
 *   half       判定半宽：体宽决定拳面多宽。
 *   chips      碎屑量：物攻换算，驱动表现。
 *   tempo／aftercast／recharge：速度定起手与收势、等级让冷却回得更快；抢攻式更快、射程更短。
 *
 * 配置 `rush`（抢攻式，默认关）双向取舍：开启（抢攻）＝多补一拍、起手 −2 刻、冷却 −3 刻、射程 ×0.95，
 *   但每拍 ×0.8——换来更密的压制与更快循环；关闭（稳步）＝每拍 ×1.12、起手与冷却更长，拍数照旧，
 *   单拍更重。两向各有局面：对高血目标堆拍数，对残血或起手慢的目标用重拍。
 *
 * 伤害段 `strike` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算，防御能力等级被本招忽略。
 */
namespace PokemonSkills {
    export const chipawayId = "chipaway";
    const chipawayMoveText = "worldcombat.skill.chipaway.preference.rush";

    /** 宝可梦读原生能力等级，其他生物读共享能力等级；同一副 -6..+6 阶梯。 */
    function chipawayStages(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        if (!world.valid(actor)) return {};
        return NativeEffects.effectiveStages(world, actor);
    }

    /** 目标身上五项防御向能力里正面等级的总和（防与特防）；0 表示此刻没有可被本招无视的涨防。 */
    export function chipawayGuard(world: CombatWorld, actor: CombatActor): number {
        const stages = chipawayStages(world, actor);
        let total = 0;
        ["def", "spd"].forEach(function (stat) { const value = stages[stat] || 0; if (value > 0) total += value; });
        return total;
    }

    actionParameters.define(chipawayId, {
        /** 每拍威力：20 + 物攻偏移[−3,8] ×0.13 + 等级偏移[−2,4] ×0.1；抢攻 ×0.8 / 稳步 ×1.12；夹 12..42。 */
        strike: formula(
            F.base(20).plus(F.stat("attack").minus(55).times(0.13).clamp(-3, 8))
                .plus(F.level().minus(22).times(0.1).clamp(-2, 4))
                .times(F.when(F.pref("rush", text(chipawayMoveText)), F.const(0.8), F.const(1.12)))
                .clamp(12, 42).round(1),
            "每拍威力", {
                unit: "威力",
                description: "每一拍命中的基础威力；物攻定拳劲、等级给稳。抢攻式每拍更轻、稳步式每拍更重。对手防御、相性与暴击在命中时另算，**目标本段的防御能力等级被这一招忽略**。"
            }),
        /** 拍数：2 + 速度偏移[−0.5,1.4] ×0.018 + 抢攻 +1；夹 2..4。 */
        beats: formula(
            F.base(2).plus(F.stat("speed").minus(55).times(0.018).clamp(-0.5, 1.4))
                .plus(F.when(F.pref("rush", text(chipawayMoveText)), F.const(1), F.const(0)))
                .clamp(2, 4).round(0),
            "拍数", {
                unit: "拍",
                description: "这一招一口气打出几拍；速度越快连得越多，抢攻式再补一拍。每拍单独结算一次。"
            }),
        /** 臂程：1.9 + 身高偏移[−0.25,0.7] ×0.45 + 速度偏移[−0.1,0.25] ×0.003；抢攻 ×0.95；夹 1.7..2.7。 */
        reach: formula(
            F.base(1.9).plus(F.body("height").minus(1.4).times(0.45).clamp(-0.25, 0.7))
                .plus(F.stat("speed").minus(55).times(0.003).clamp(-0.1, 0.25))
                .times(F.when(F.pref("rush", text(chipawayMoveText)), F.const(0.95), F.const(1)))
                .clamp(1.7, 2.7).round(2),
            "臂程", {
                unit: "格",
                description: "拳头能够到多远；身高给臂长与上半步、速度给前探。它也是本招的实际射程来源，是本族最短的一条线。"
            }),
        /** 判定半宽：0.32 + 体宽偏移[−0.04,0.16] ×0.12；夹 0.26..0.55。 */
        half: formula(
            F.base(0.32).plus(F.body("width").minus(0.9).times(0.12).clamp(-0.04, 0.16)).clamp(0.26, 0.55).round(2),
            "判定半宽", {
                unit: "格",
                description: "这条击打线有多宽；身板越宽拳面越开。画面里那道线的宽窄与它一致。"
            }),
        /** 碎屑量：12 + 物攻偏移[−2,8] ×0.12；夹 8..30。 */
        chips: formula(
            F.base(12).plus(F.stat("attack").minus(55).times(0.12).clamp(-2, 8)).clamp(8, 30).round(0),
            "碎屑量", {
                unit: "片",
                description: "每一拍命中时崩出的碎屑数量，由物攻换算；粒子按它发射，画面里的片数与机制一致。"
            }),
        /** 起手：4 − 速度偏移[−1.2,2] ×0.025 + 抢攻 −2 / 稳步 +2；夹 2..10。 */
        tempo: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.025).clamp(-1.2, 2))
                .plus(F.when(F.pref("rush", text(chipawayMoveText)), F.const(-2), F.const(2)))
                .clamp(2, 10).round(0),
            "起手", "压步、把攻势提起来的时间；速度越快越短。抢攻式抬手就上，稳步式多压一拍再起。"),
        /** 收招：5 − 速度偏移[−1,2] ×0.02；夹 3..10。 */
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(3, 10).round(0),
            "收招", "收拳、重新站稳的时间；速度越快越短。"),
        /** 冷却：12 − 等级偏移[0,3] ×0.06 + 抢攻 −3 / 稳步 +3；夹 6..22。 */
        recharge: seconds(
            F.base(12).minus(F.level().minus(22).times(0.06).clamp(0, 3))
                .plus(F.when(F.pref("rush", text(chipawayMoveText)), F.const(-3), F.const(3)))
                .clamp(6, 22).round(0),
            "冷却", "两轮连击之间等多久；等级越高回得越快。抢攻式循环更短，稳步式更费。")
    });

    stages(chipawayId, [
        { level: 30, values: { strike: 26 } },
        { level: 46, values: { strike: 32, beats: 3 } }
    ]);

    defineDamage(chipawayId, "strike", {}, { contact: true });

    describe(chipawayId, [
        { key: "description.0", values: ["strike", "beats"] },
        { key: "description.1", values: ["reach", "half"] },
        { key: "rush.on", values: [], when: function (context) { return read(context.detail.values, ["rush"]) === true; } },
        { key: "rush.off", values: [], when: function (context) { return read(context.detail.values, ["rush"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.strike"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.strike", "tier.1.beats"] }
    ]);
}
