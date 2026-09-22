/**
 * 掷锚 / anchorshot —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Steel／物理／威力 80／命中 100／PP 20／优先度 0／单体，
 *   接触（contact），次要效果 100%：命中即给目标挂 volatile `trapped`（无法逃走、无法换人）。
 *   描述「将锚缠住对手进行攻击。 使对手无法逃走。」唯一已实装学习者：Dhelmise。
 *
 * 翻译：把「将锚缠住对手」落成**把锚连同铁链甩出去、钉在对手脚下的地面**——锚头砸中就是重而硬的一记，
 *   锚在它脚下的地上扎住，链子绷直把对手**拴在锚点上**：它走不出链长，想逃就被链一节节拽回来。
 *   与绑紧不同的是：链拴在**地面**而不是术者身上，所以术者可以走开，被拴住的一方自己挣不开；
 *   被拖得超过 `snap` 或链走完时间，链就松开（绷断/收回），锚点的世界痕迹随链一起归还。
 *   原生 100% 命中的「缠住」落成链必中；contact 保留，让接触类特性/反馈照常参与。
 *
 * 与同族分开：绑紧把目标拴在术者身边、术者也被拖慢；紧束把目标裹在原地、与术者无关；挡路立一堵墙；
 *   黑色目光靠术者凝视维持。只有掷锚是**一根链把目标钉在一个固定的地面锚点上、术者可以走开**。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   shot        锚击威力：物攻定锚的重量与冲击；重锚式 ×1.25。
 *   reach       掷出距离：物攻与体重决定。它也是本招实际射程。
 *   flight      锚飞行速度：体重越大越沉、越快落下。
 *   chainTicks  链的维持时长：防御与等级决定链能撑多久；重锚式 ×1.25。
 *   leash       链长半径：物攻决定链能放多长；重锚式收短。
 *   snap        绷断距离：锚链能承受的拉扯极限；重锚式 ×1.15。
 *   reel        每步回拽：物攻决定链把逃出去的目标拽回多快。
 *   linkRadius  锚头判定：碰撞箱高度。
 *   links       链节量：体重换算，驱动画面里的链节数。
 *   tempo／aftercast／recharge：体重与速度定节奏；重锚式更慢更久。
 *
 * 配置 `heavy`（重锚式）双向取舍（默认关，快掷式）：
 *   开（重锚式）：威力 ×1.25、链长时长 ×1.25、leash ×0.85、绷断距离 ×1.15，但起手 +3 刻、射程 ×0.9、冷却 +12 刻——钉得更死更久。
 *   关（快掷式）：出手快、射程远、冷却短，但威力轻、链短、leash 更长、更容易被拽脱。
 *
 * 伤害段 `shot` 与参数同名，走共享换算（原生类别 Physical，Steel 属性，接触）。
 */
namespace PokemonSkills {
    export const anchorshotId = "anchorshot";
    export const anchorshotScene = "world_combat:move_anchorshot";
    export const anchorshotBoundText = "world_combat.move.anchorshot.text.bound";
    export const anchorshotSnapText = "world_combat.move.anchorshot.text.snap";
    export const anchorshotReleaseText = "world_combat.move.anchorshot.text.release";
    export const anchorshotMissText = "world_combat.move.anchorshot.text.miss";
    export const anchorshotAnchorBlock = "minecraft:chain";
    /** 表现里锚头判定的参考值（格）；服务端传 scale = 实际判定 / 这个值。 */
    export const anchorshotReference = 0.28;

    actionParameters.define(anchorshotId, {
        /** 锚击威力：基础 62，物攻每比 50 多 1 加 0.12（夹 −8..26），等级 30 起每级 +0.2（夹 0..5）；重锚 ×1.25；夹 44..104。 */
        shot: formula(
            F.base(62)
                .plus(F.stat("attack").minus(50).times(0.12).clamp(-8, 26))
                .plus(F.level().minus(30).times(0.2).clamp(0, 5))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.anchorshot.preference.heavy")), F.const(1.25), F.const(1)))
                .clamp(44, 104).round(1),
            "锚击威力", {
                unit: "威力",
                description: "锚头砸在对手身上的威力；物攻给出锚的重量与冲击，等级高也压得更实。对手防御、相性与暴击在命中时另算。"
            }),
        /** 掷出距离：基础 5.5，物攻每比 50 多 1 加 0.02（夹 −1..2），体重每 50 减 0.3（夹 −1..0.6）；重锚 ×0.9；夹 4..8。 */
        reach: formula(
            F.base(5.5)
                .plus(F.stat("attack").minus(50).times(0.02).clamp(-1, 2))
                .minus(F.body("weight").minus(50).div(50).times(0.3).clamp(-0.6, 1))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.anchorshot.preference.heavy")), F.const(0.9), F.const(1)))
                .clamp(4, 8).round(1),
            "掷出距离", {
                unit: "格",
                description: "锚能甩到多远的目标；物攻越高甩得越远，身体越沉甩得越近。它也是本招的实际射程。"
            }),
        /** 锚飞行速度：基础 1.35，体重每 50 减 0.2（夹 −0.3..0.4）；夹 0.9..1.8。 */
        flight: formula(
            F.base(1.35).minus(F.body("weight").minus(50).div(50).times(0.2).clamp(-0.4, 0.3)).clamp(0.9, 1.8).round(2),
            "锚飞行速度", {
                unit: "格/刻",
                description: "锚头飞出去的速度；身体越沉，锚飞得越慢、越沉。"
            }),
        /** 链维持时长：基础 70 刻 + 防御 ×0.5 + 等级 20 起每级 ×1.2（夹 0..60）；重锚 ×1.25；夹 40..200。 */
        chainTicks: seconds(
            F.base(70).plus(F.stat("defence").times(0.5)).plus(F.level().minus(20).times(1.2).clamp(0, 60))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.anchorshot.preference.heavy")), F.const(1.25), F.const(1)))
                .clamp(40, 200).round(0),
            "链维持时长", "链子能拴住目标多久；防御与等级越高撑得越久，重锚式更久。走完这段时间链自动收回。"),
        /** 链长半径：基础 3.2，物攻每比 50 多 1 加 0.01（夹 −0.5..1.2）；重锚 ×0.85；夹 2.2..5.0。 */
        leash: formula(
            F.base(3.2).plus(F.stat("attack").minus(50).times(0.01).clamp(-0.5, 1.2))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.anchorshot.preference.heavy")), F.const(0.85), F.const(1)))
                .clamp(2.2, 5.0).round(2),
            "链长半径", {
                unit: "格",
                description: "目标能离锚点多远；物攻越高链放得越长，重锚式把链收得更短、钉得更死。"
            }),
        /** 绷断距离：基础 7.2，物攻每比 50 多 1 加 0.015（夹 −0.8..1.5）；重锚 ×1.15；夹 4.5..11。 */
        snap: formula(
            F.base(7.2).plus(F.stat("attack").minus(50).times(0.015).clamp(-0.8, 1.5))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.anchorshot.preference.heavy")), F.const(1.15), F.const(1)))
                .clamp(4.5, 11).round(2),
            "绷断距离", {
                unit: "格",
                description: "目标被外力（击退、拉拽、传送）拽离锚点超过这个距离，链就绷断、锁定解除；比链长半径更长，留出回拽的余地。"
            }),
        /** 每步回拽：基础 0.35，物攻每比 50 多 1 加 0.003（夹 −0.1..0.25）；夹 0.15..0.8。 */
        reel: formula(
            F.base(0.35).plus(F.stat("attack").minus(50).times(0.003).clamp(-0.1, 0.25)).clamp(0.15, 0.8).round(2),
            "每步回拽", {
                unit: "格",
                description: "目标想走出链长时，链每 2 刻把它朝锚点拽回多远；物攻越高拽得越有力。"
            }),
        /** 锚头判定：基础 0.28 格，碰撞箱每比 1.4 高 1 加 0.06（夹 −0.03..0.12）；夹 0.18..0.5。 */
        linkRadius: formula(
            F.base(0.28).plus(F.body("height").minus(1.4).times(0.06).clamp(-0.03, 0.12)).clamp(0.18, 0.5).round(2),
            "锚头判定", {
                unit: "格",
                description: "锚头飞行与命中的横向判定；个头越高的个体甩出的锚越大，越不容易被让开。"
            }),
        /** 链节量：基础 6，体重每 20 加 1（夹 −2..6）；夹 5..14。 */
        links: formula(
            F.base(6).plus(F.body("weight").div(20).clamp(-2, 6)).floor().clamp(5, 14),
            "链节量", {
                unit: "节",
                description: "画面里链子的链节数量，由体重换算；它驱动链路表现的密度，不是独立伤害。"
            }),
        /** 起手：基础 8 刻，速度每比 50 快 1 减 0.02（夹 −0.8..1.5）；重锚 +3；夹在 5..14。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(50).times(0.02).clamp(-0.8, 1.5))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.anchorshot.preference.heavy")), F.const(3), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "把锚抡起来、甩出去前的时间；速度越快越短，重锚式要多抡一下。"),
        /** 收招：基础 7 刻，体重每 50 减 0.2（夹 −0.6..1）；夹在 5..11。 */
        aftercast: seconds(
            F.base(7).minus(F.body("weight").minus(50).div(50).times(0.2).clamp(-1, 0.6)).clamp(5, 11).round(0),
            "收招", "甩锚之后的收势；身体越沉收得越慢。"),
        /** 冷却：基础 60 刻，等级 30 起每级减 0.4（夹 −12..0）；重锚 +12；夹在 42..90。 */
        recharge: seconds(
            F.base(60).minus(F.level().minus(30).times(0.4).clamp(0, 12))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.anchorshot.preference.heavy")), F.const(12), F.const(0)))
                .clamp(42, 90).round(0),
            "冷却", "再甩一次锚前的等待；等级越高越熟练，PP 20 与重锚式都更费。")
    });

    defineDamage(anchorshotId, "shot", { rationale: "锚头砸击的物理伤害；与原生一致走物理类别，不改变减伤规则。" }, { contact: true });

    stages(anchorshotId, [
        { level: 45, values: { shot: 92, chainTicks: 150, leash: 4.0 } }
    ]);

    describe(anchorshotId, [
        { key: "description.0", values: ["shot", "reach"] },
        { key: "description.1", values: ["chainTicks", "leash", "snap"] },
        { key: "description.2", values: ["reel", "links", "linkRadius"] },
        { key: "heavy.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "heavy.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "description.3", values: ["tempo", "aftercast", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shot", "tier.0.chainTicks", "tier.0.leash"] }
    ]);
}
