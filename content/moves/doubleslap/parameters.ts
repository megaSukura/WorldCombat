/**
 * 连环巴掌 / doubleslap 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown 1.8.0+1.21.1）：**一般**／物理／威力 15／命中 85／PP 10／接触／单体／
 *   连续 2～5 次（`multihit: [2, 5]`），无次要效果。中英描述都是「用连环巴掌拍打对手……连续攻击２～５次
 *   ／ slapped repeatedly, back and forth」。已实装学习者 45。
 *
 * 翻译：把回合制的「来回连抽」落成**贴身左右开弓的一串掌击**——施法者贴住对手不挪步，一只手掌接一只手掌
 *   地扇，每一掌把对手朝对侧拨一点，掌印在两颊之间来回跳。它是本族射程最短、最黏人的一串：不把人推走，
 *   只把人拨得站不稳，所以对手要么硬吃整串，要么必须在起手时退出贴身距离。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   slap      单掌威力：物攻定这一掌的份量，等级让掌更熟。
 *   slaps     掌数：速度定手有多快、等级定耐力，决定这一串最多几掌（原生 2～5）。
 *   gap       掌与掌的间隔：速度决定抽得多密。
 *   reach     够得到的距离：身高决定臂展，也是本招的实际射程来源。
 *   sway      横向拨动：物攻与身宽决定每掌把对手拨开多远（交叉式才有）。
 *   accuracy  每掌命中率：速度提高它（原生 85%）。
 *   smack     掌风点数：物攻换算的掌风碎屑量，直接驱动发射数量。
 *   tempo／settle／recharge：速度定节奏，交叉式多花一点冷却。
 *
 * 配置 `cross`（交叉式）双向取舍（默认关，即直抽式）：
 *   开＝左右开弓：每掌把对手朝对侧拨开 `sway` 格、掌数上限 5；代价是单掌 ×0.85、够得略近、冷却 +2。
 *     适用：用横向拨动打断对手站位、对低防目标靠次数堆伤害。
 *   关（直抽式，原生式）＝同一侧连续重掴：单掌 ×1.2、够得略远；代价是掌数收在 4、完全不拨动对手。
 *     适用：对高防目标要单掌份量、或不想把对手拨出其他招的准线。
 *
 * 伤害段 `slap` 与参数同名；走共享换算（原始类别 Physical），对手物防、相性与暴击在每掌命中时另算。
 */
namespace PokemonSkills {
    export const doubleslapId = "doubleslap";
    export const doubleslapScene = "world_combat:move_doubleslap";
    export const doubleslapTallyText = "world_combat.move.doubleslap.text.tally";
    export const doubleslapMissText = "world_combat.move.doubleslap.text.miss";
    export const doubleslapAwayText = "world_combat.move.doubleslap.text.away";

    actionParameters.define(doubleslapId, {
        /** 单掌威力：15 + 物攻偏移[−4,15]×0.16 + 等级(≥25)偏移[0,8]×0.3；交叉 ×0.85 / 直抽 ×1.2；夹 8..32。 */
        slap: formula(
            F.base(15).plus(F.stat("attack").minus(55).times(0.16).clamp(-4, 15))
                .plus(F.level().minus(25).times(0.3).clamp(0, 8))
                .times(F.when(F.pref("cross"), F.const(0.85), F.const(1.2)))
                .clamp(8, 32).round(1),
            "单掌威力", {
                unit: "威力",
                description: "每一掌各自结算的威力；物攻越高扇得越沉。直抽式更重、交叉式更轻。对手物防、相性与暴击在每掌命中时另算。"
            }),
        /** 掌数：2 + 速度偏移[0,1.8]×0.02 + 等级(≥25)偏移[0,1]×0.02；向下取整；交叉上限 5 / 直抽上限 4；夹 2..上限。 */
        slaps: formula(
            F.base(2)
                .plus(F.stat("speed").minus(55).times(0.02).clamp(0, 1.8))
                .plus(F.level().minus(25).times(0.02).clamp(0, 1))
                .floor().clamp(2, F.when(F.pref("cross"), F.const(5), F.const(4))),
            "掌数", {
                unit: "掌",
                description: "这一串最多抽几掌（原生 2～5）；速度定手有多快、等级定耐力。交叉式可到 5 掌，直抽式收在 4 掌。"
            }),
        /** 间隔：3 − 速度偏移[−0.7,1.0]×0.02；夹 2..5。 */
        gap: seconds(
            F.base(3).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.7, 1.0)).clamp(2, 5).round(0),
            "间隔", "两掌之间隔多久；速度越快抽得越密。"),
        /** 够得到的距离：2.4 + 身高偏移[−0.2,0.7]×0.7；交叉 ×0.95 / 直抽 ×1.05；夹 2.0..3.2。 */
        reach: formula(
            F.base(2.4).plus(F.body("height").minus(1.4).times(0.7).clamp(-0.2, 0.7))
                .times(F.when(F.pref("cross"), F.const(0.95), F.const(1.05)))
                .clamp(2.0, 3.2).round(2),
            "够得到的距离", {
                unit: "格",
                description: "手掌能够到多远的对手；身高越高的个体臂展越长，也是本招的实际射程来源。直抽式略远一点。"
            }),
        /** 横向拨动：交叉式 0.18 + 物攻偏移[0,0.35]×0.003 + 身宽偏移[0,0.2]×0.2，夹 0..0.6；直抽式为 0。 */
        sway: formula(
            F.when(F.pref("cross"),
                F.base(0.18).plus(F.stat("attack").minus(55).times(0.003).clamp(0, 0.35))
                    .plus(F.body("width").minus(0.9).times(0.2).clamp(0, 0.2)).clamp(0, 0.6).round(2),
                F.const(0)),
            "横向拨动", {
                unit: "格",
                description: "交叉式每一掌把对手朝对侧拨开多远；物攻与身宽越大拨得越明显。直抽式为 0，不拨动对手。"
            }),
        /** 每掌命中率：0.85 + 速度偏移[−0.03,0.06]×0.001；夹 0.72..0.95。 */
        accuracy: percent(
            F.base(0.85).plus(F.stat("speed").minus(55).times(0.001).clamp(-0.03, 0.06)).clamp(0.72, 0.95).round(3),
            "每掌命中率", "每一掌独立掷的命中率（原生 85% 起）；速度提高它。擦空一掌这串就断。"),
        /** 掌风点数：12 + 物攻偏移[−3,10]×0.12；夹 8..28。 */
        smack: formula(
            F.base(12).plus(F.stat("attack").minus(55).times(0.12).clamp(-3, 10)).clamp(8, 28).round(0),
            "掌风点数", {
                unit: "点",
                description: "每一掌带起的掌风碎屑数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：4 − 速度偏移[−0.6,1.2]×0.02；夹 3..7。 */
        tempo: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.6, 1.2)).clamp(3, 7).round(0),
            "起手", "抬手到第一掌扇出的时间；速度越快越短。"),
        /** 收招：6 − 速度偏移[−0.6,1.2]×0.015；夹 3..9。 */
        settle: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.015).clamp(-0.6, 1.2)).clamp(3, 9).round(0),
            "收招", "这一串扇完收回手的时间；速度越快收得越快。"),
        /** 冷却：22 − 速度偏移[−3,4]×0.05 + 交叉 2 / 直抽 0；夹 14..32。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(55).times(0.05).clamp(-3, 4))
                .plus(F.when(F.pref("cross"), F.const(2), F.const(0)))
                .clamp(14, 32).round(0),
            "冷却", "再起一串巴掌前等待多久；速度越快回得越快，交叉式多花一点。")
    });

    stages(doubleslapId, [
        { level: 22, values: { slap: 18, slaps: 3 } },
        { level: 40, values: { slap: 22, reach: 2.9 } }
    ]);

    defineDamage(doubleslapId, "slap", {}, { contact: true });

    describe(doubleslapId, [
        { key: "description.0", values: ["slap","slaps"] },
        { key: "description.1", values: ["gap","reach","accuracy"] },
        { key: "description.2", values: ["sway"] },
        { key: "cross.on", values: [], when: function (context) { return read(context.detail.values, ["cross"]) === true; } },
        { key: "cross.off", values: [], when: function (context) { return read(context.detail.values, ["cross"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slap", "tier.0.slaps"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slap", "tier.1.reach"] }
    ]);
}
