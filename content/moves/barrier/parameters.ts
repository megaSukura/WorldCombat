/**
 * 屏障 / barrier — 参数与数值来源。
 *
 * 原生事实：Psychic、变化、威力 —、命中必中、PP 20、目标 self、boosts { def: +2 }。
 *
 * 翻译：把「制造坚固的壁障」翻成**亲手把一排硬光板立到点选的通道上**——用世界做材料，而不是只改数字。
 *   硬光板以 `world.terrainResult` 租借成真实方块；只有真正放下的格子才挂防御窗口，墙消失时本次防御一起收回。
 *   取原生「防御 +2、PP 20、纯自我强化」；放弃回合制里永久保留的等级 → 即时交战里防御等级写进公共能力阶梯，
 *   随墙体存在，墙到点崩回原方块时等级一起收回。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   gift       防御等级：固定 2，原生「大幅提高防御」的对位，是这招的身份常数。
 *   reach      施放距离：基础 3.5 格 + 速度×0.03；夹 3..7。身法越快，能把墙立到越远的通道上。
 *   span       屏障宽度：基础 2.4 格 + 碰撞箱宽度×1.6；再乘形态系数（壁垒 ×1.35／光屏 ×0.62）；夹 1.6..6。体型越宽，墙越宽。
 *   height     屏障高度：基础 2 +（身高 −1.4）×0.4，光屏再 +1；夹 1..4。高个子的墙更高，光屏比壁垒高一格（挡视线）。
 *   gap        空放距离：基础 1.3 格 + 碰撞箱宽度×0.6，光屏再 +0.8；夹 1.1..3。没有点选落点时，墙自动立在身前这么远。
 *   panels     光板数：基础 6 + 特攻/12 + 等级×0.1；夹 5..20。精神力越强，聚起的光板越多越密，粒子按它发射。
 *   fieldTicks 屏障时长：基础 200 刻 + 等级×3 + 防御×0.6，再乘形态系数（壁垒 ×1.15／光屏 ×0.8）；夹 140..480。等级与防御让板立得久。
 *   tempo      起手：基础 8 刻 − 速度×0.02，壁垒 +2；夹 5..13。越快越早立起。
 *   aftercast  收招：基础 5 刻 + 身高×1.0；夹 5..10。身板越高大收得越慢。
 *   wait       冷却：基础 130 刻 − 等级×0.5；夹 90..150。等级越高越熟练。PP 20 的代价。
 * 配置 tall 双向取舍：关闭＝低而宽的壁垒，更宽、贴得近、拦得住从正面冲来的对手、护得更久，但不挡视线与远程，起手更慢；
 *   开启＝高而窄的光屏，更高、立得更远、挡得住视线与远程、起手更快，但窄得能被绕过、护得更短。两侧各有适用局面。
 */
namespace PokemonSkills {
    actionParameters.define("barrier", {
        /** 防御等级：原生 +2，本招的身份常数。 */
        gift: formula(F.const(2), "防御等级", {
            unit: " 级",
            description: "壁立着的时候把防御抬高多少级；原生「大幅提高防御」的对位。"
        }),
        /** 施放距离：速度决定能点多远。 */
        reach: formula(
            F.base(3.5).plus(F.stat("speed").times(0.03)).clamp(3.0, 7.0).round(1),
            "施放距离", {
                unit: " 格",
                description: "能点选多远的落点立墙；速度越快越远。AI 也在这个距离内挑落点。"
            }),
        /** 屏障宽度：体型越宽墙越宽，光屏更窄。 */
        span: formula(
            F.base(2.4).plus(F.body("width").times(1.6))
                .times(F.when(F.pref("tall", text("worldcombat.skill.barrier.preference.tall")), F.const(0.62), F.const(1.35)))
                .clamp(1.6, 6.0).round(2),
            "屏障宽度", {
                unit: " 格",
                description: "硬光板拼成的墙有多宽；碰撞箱越宽越宽，光屏形态更窄。墙的宽度就是它挡住的通道宽度。"
            }),
        /** 屏障高度：光屏更高。 */
        height: formula(
            F.base(2).plus(F.body("height").minus(1.4).times(0.4))
                .plus(F.when(F.pref("tall", text("worldcombat.skill.barrier.preference.tall")), F.const(1), F.const(0)))
                .clamp(1, 4).round(0),
            "屏障高度", {
                unit: " 格",
                description: "墙立起几格高；高个子更高，光屏再高一格。够高才遮得住视线与远程。"
            }),
        /** 空放距离：没有点选落点时墙立在身前多远。 */
        gap: formula(
            F.base(1.3).plus(F.body("width").times(0.6))
                .plus(F.when(F.pref("tall", text("worldcombat.skill.barrier.preference.tall")), F.const(0.8), F.const(0)))
                .clamp(1.1, 3.0).round(2),
            "空放距离", {
                unit: " 格",
                description: "没有点选落点、直接空放时，墙自动立在身前多远；身板越宽立得越远（免得堵住自己），光屏更远。"
            }),
        /** 光板数：精神力越强越多。 */
        panels: formula(
            F.base(6).plus(F.stat("specialAttack").div(12)).plus(F.level().times(0.1)).clamp(5, 20).round(0),
            "光板数", {
                unit: " 块",
                description: "聚起多少块硬光板来撑这面墙；特攻与等级越高越多，粒子按它发射。"
            }),
        /** 屏障时长：防御与等级决定板能立多久。 */
        fieldTicks: seconds(
            F.base(200).plus(F.level().times(3)).plus(F.stat("defence").times(0.6))
                .times(F.when(F.pref("tall", text("worldcombat.skill.barrier.preference.tall")), F.const(0.8), F.const(1.15)))
                .clamp(140, 480).round(0),
            "屏障时长", "硬光板能在世界里立多久；等级与防御越高立得越久，光屏更短。到期原方块回来，这段防护抬起的等级一起收回。"),
        /** 起手：速度决定聚板多快。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").times(0.02))
                .plus(F.when(F.pref("tall", text("worldcombat.skill.barrier.preference.tall")), F.const(1), F.const(2)))
                .clamp(5, 13).round(0),
            "起手", "聚板、点选落点、竖墙需要多久；速度越快越短，壁垒比光屏更慢。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.0)).clamp(5, 10).round(0),
            "收招", "立墙之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(130).minus(F.level().times(0.5)).clamp(90, 150).round(0),
            "冷却", "两次立墙之间的等待；等级越高越短。PP 20 的代价。")
    });

    stages("barrier", [
        { level: 30, values: { fieldTicks: 240, wait: 112 } },
        { level: 50, values: { fieldTicks: 280, wait: 100 } }
    ]);

    describe("barrier", [
        { key: "description.0", values: ["gift", "fieldTicks"] },
        { key: "description.1", values: ["span", "height", "gap"] },
        { key: "description.place", values: ["reach"] },
        { key: "description.3", values: ["tempo", "aftercast", "wait"] },
        { key: "tall.on", values: [], when: function (context) { return read(context.detail.values, ["tall"]) === true; } },
        { key: "tall.off", values: [], when: function (context) { return read(context.detail.values, ["tall"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.fieldTicks", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.fieldTicks", "tier.1.wait"] }
    ]);
}
