/**
 * 猛推 / armthrust 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown 1.8.0+1.21.1）：**格斗**／物理／威力 15／**命中 100**／PP 20／接触／单体／
 *   连续 2～5 次（`multihit: [2, 5]`），无次要效果。描述「用张开着的双手猛推对手……连续攻击2～5次」。
 *   已实装学习者 7（幕下力士 / 铁掌力士系、暖暖猪系等）。
 *
 * 翻译：把「张开双手猛推」落成**必中的一串推撞**——施法者用两只摊开的手掌一下接一下向前推，每一推把对手
 *   沿推的方向顶开一段。它是本族唯一**不会失手**的一串（原生 100 命中），核心玩法在**把人推向世界**：
 *   被顶到墙、石头、树干上的人，除了推撞伤害还会多挨一记 `slam` 撞墙伤害。推进式让施法者跟着对手走、
 *   把这串吃满；立推式站定不动，一次把人顶得很远，但下一推可能就够不着了。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   thrust    单推威力：物攻定这一推的份量，等级让推得更稳。
 *   thrusts   推数：物攻定收手多快、等级定耐力，决定这一串最多几推（原生 2～5）。
 *   reach     够得到的距离：身高决定臂长，也是本招的实际射程来源。
 *   push      顶开距离：物攻与体重决定每一推把对手推多远——推得越狠越容易把它撞到东西上，也越容易推出射程。
 *   step      追步：速度决定推进式每推向前跟多少。
 *   slam      撞墙伤害：物攻与等级决定目标撞上障碍时额外吃多少（本条依赖世界，不是精灵的六维本身）。
 *   gap       间隔：速度决定推得多密。
 *   knuckles 掌风点数：物攻换算的掌风碎屑量，直接驱动发射数量。
 *   tempo／settle／recharge：速度定节奏，立推式更费冷却。
 *
 * 配置 `drive`（推进式）双向取舍（默认开）：
 *   开（推进式，默认）＝每一推后施法者向前跟 `step` 格，把距离重新压回射程内、整串更容易吃满；代价是单推 ×0.9、
 *     顶开 ×0.75（推得不远，撞墙机会少）。
 *   关（立推式）＝站定不动，单推 ×1.15、顶开 ×1.6，一次把人顶到墙上；代价是推完就拉开距离，这串很可能提前断、冷却 +3。
 *
 * 伤害段 `thrust`（接触，格斗）与 `slam`（撞墙追加）各自与同名参数绑定；对手物防、相性与暴击在每次命中时另算。
 */
namespace PokemonSkills {
    export const armthrustId = "armthrust";
    export const armthrustScene = "world_combat:move_armthrust";
    export const armthrustTallyText = "world_combat.move.armthrust.text.tally";
    export const armthrustOutText = "world_combat.move.armthrust.text.out";
    export const armthrustSlamText = "world_combat.move.armthrust.text.slam";

    actionParameters.define(armthrustId, {
        /** 单推威力：15 + 物攻偏移[−4,14]×0.16 + 等级(≥22)偏移[0,8]×0.3；推进 ×0.9 / 立推 ×1.15；夹 8..30。 */
        thrust: formula(
            F.base(15).plus(F.stat("attack").minus(55).times(0.16).clamp(-4, 14))
                .plus(F.level().minus(22).times(0.3).clamp(0, 8))
                .times(F.when(F.pref("drive"), F.const(0.9), F.const(1.15)))
                .clamp(8, 30).round(1),
            "单推威力", {
                unit: "威力",
                description: "每一推各自结算的威力；物攻越高推得越沉。立推式更重、推进式略轻。对手物防、相性与暴击在每次命中时另算。"
            }),
        /** 推数：2 + 物攻偏移[0,2.0]×0.022 + 等级(≥22)偏移[0,1.2]×0.025；向下取整；推进上限 5 / 立推上限 4；夹 2..上限。 */
        thrusts: formula(
            F.base(2)
                .plus(F.stat("attack").minus(55).times(0.022).clamp(0, 2.0))
                .plus(F.level().minus(22).times(0.025).clamp(0, 1.2))
                .floor().clamp(2, F.when(F.pref("drive"), F.const(5), F.const(4))),
            "推数", {
                unit: "推",
                description: "这一串最多推几下（原生 2～5）；物攻定收手速度、等级定耐力。推进式可到 5 推，立推式收在 4 推。"
            }),
        /** 够得到的距离：2.5 + 身高偏移[−0.2,0.7]×0.65；夹 2.0..3.4。 */
        reach: formula(
            F.base(2.5).plus(F.body("height").minus(1.4).times(0.65).clamp(-0.2, 0.7)).clamp(2.0, 3.4).round(2),
            "够得到的距离", {
                unit: "格",
                description: "双手能够到多远的对手；身高越高的个体臂展越长，也是本招的实际射程来源。"
            }),
        /** 顶开距离：0.4 + 物攻偏移[−0.06,0.5]×0.004 + 体重(≥60)偏移[−0.05,0.35]×0.002；推进 ×0.75 / 立推 ×1.6；夹 0.15..1.4。 */
        push: formula(
            F.base(0.4).plus(F.stat("attack").minus(55).times(0.004).clamp(-0.06, 0.5))
                .plus(F.body("weight").minus(60).times(0.002).clamp(-0.05, 0.35))
                .times(F.when(F.pref("drive"), F.const(0.75), F.const(1.6)))
                .clamp(0.15, 1.4).round(2),
            "顶开距离", {
                unit: "格",
                description: "每一推把对手沿推的方向顶开多远；物攻与体重越大推得越远。推得远既容易把对手撞到世界上，也容易把它推出射程。"
            }),
        /** 追步：推进式 0.4 + 速度偏移[−0.1,0.5]×0.006，夹 0..0.9；立推式为 0。 */
        step: formula(
            F.when(F.pref("drive"),
                F.base(0.4).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.1, 0.5)).clamp(0, 0.9).round(2),
                F.const(0)),
            "追步", {
                unit: "格",
                description: "推进式每一推后施法者向前跟多远，把距离重新压回射程内；速度越快跟得越紧。立推式站定不动，这一项为 0。"
            }),
        /** 撞墙伤害：9 + 物攻偏移[−3,12]×0.14 + 等级(≥22)偏移[0,5]×0.2；夹 4..24。 */
        slam: formula(
            F.base(9).plus(F.stat("attack").minus(55).times(0.14).clamp(-3, 12))
                .plus(F.level().minus(22).times(0.2).clamp(0, 5))
                .clamp(4, 24).round(1),
            "撞墙伤害", {
                unit: "威力",
                description: "目标被推得撞上墙、方块或树干时额外结算的威力；物攻与等级越高撞得越狠。这是本招把世界当材料的那一下。"
            }),
        /** 间隔：3 − 速度偏移[−0.7,1.0]×0.02；夹 2..6。 */
        gap: seconds(
            F.base(3).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.7, 1.0)).clamp(2, 6).round(0),
            "间隔", "两推之间隔多久；速度越快推得越密。"),
        /** 掌风点数：14 + 物攻偏移[−3,12]×0.13；夹 10..30。 */
        knuckles: formula(
            F.base(14).plus(F.stat("attack").minus(55).times(0.13).clamp(-3, 12)).clamp(10, 30).round(0),
            "掌风点数", {
                unit: "点",
                description: "每一推带起的掌风碎屑数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：5 − 速度偏移[−0.7,1.3]×0.02；夹 3..8。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.7, 1.3)).clamp(3, 8).round(0),
            "起手", "张手到第一推推出的时间；速度越快越短。"),
        /** 收招：7 − 速度偏移[−0.6,1.2]×0.015；夹 3..9。 */
        settle: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.015).clamp(-0.6, 1.2)).clamp(3, 9).round(0),
            "收招", "这一串推完收手的时间；速度越快收得越快。"),
        /** 冷却：23 − 速度偏移[−3,4]×0.05 + 立推 3 / 推进 0；夹 14..34。 */
        recharge: seconds(
            F.base(23).minus(F.stat("speed").minus(55).times(0.05).clamp(-3, 4))
                .plus(F.when(F.pref("drive"), F.const(0), F.const(3)))
                .clamp(14, 34).round(0),
            "冷却", "再起一串前等待多久；速度越快回得越快，立推式更费一点。")
    });

    stages(armthrustId, [
        { level: 22, values: { thrust: 18, thrusts: 3 } },
        { level: 38, values: { thrust: 23, slam: 13 } },
        { level: 54, values: { thrust: 27, push: 0.7 } }
    ]);

    defineDamage(armthrustId, "thrust", {}, { contact: true });
    defineDamage(armthrustId, "slam", {});

    describe(armthrustId, [
        { key: "description.0", values: ["thrust", "thrusts"] },
        { key: "description.1", values: ["reach", "push", "gap"] },
        { key: "description.2", values: ["slam", "step"] },
        { key: "drive.on", values: [], when: function (context) { return read(context.detail.values, ["drive"]) === true; } },
        { key: "drive.off", values: [], when: function (context) { return read(context.detail.values, ["drive"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.thrust", "tier.0.thrusts"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.thrust", "tier.1.slam"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.thrust", "tier.2.push"] }
    ]);
}
