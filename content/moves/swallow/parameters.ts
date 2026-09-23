/**
 * 吞下 / swallow —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 —、命中必中、PP 10、优先度 0、目标 self；
 *   onTry 要求自身有 stockpile；onHit 按层数回复 maxhp 的 [25%, 50%, 100%]，随后移除 stockpile。
 *
 * 核心念头：把攒在身体里的那口力咽下去，化成一波回复。它是这组里唯一的**兑现**：蓄力把力一层层压进身体，
 *   吞下把每层都换成血——而且层数不是线性叠加，攒到第三层才一口回满。等满三层再吞，是收益也是风险：
 *   这段时间壳会被打掉。
 * 翻译：取原生「按层数 25%/50%/100% 回复、消耗蓄力、Normal、目标自己、PP 10」；在即时世界里，
 *   蓄力层数来自共享身份 world_combat:status/stockpile（谁生产的都认，amplifier 就是层数），
 *   吞下时一层不留地消费掉它。放弃回合制里「失败不回复」的判定，改成射程内的 ready 直接拒绝。
 *
 * 与同族分开：水流环是持续小口、扎根是钉地慢回；吞下是**一次性爆发回血，回多少全看攒了几层**。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   worth      总回复：层数 ×（基础 0.24 + 特防×0.0006 + 体重/3000）+ 满三层奖励 0.35；慢咽 ×0.9；夹 0.15..1.0。
 *              层数从共享 stockpile 身份读；三层时一口回满（原生 100% 的对位）。
 *   digestTicks 消化窗口：基础 60 刻 + 体重×0.2；夹 40..120。慢咽把回复分进这段时间。
 *   spread     回光半径：基础 1.0 格 + 碰撞箱高度×0.5；夹 0.9..2.2。身板越高，回波的环越大。
 *   motes      回光点数：基础 16 + 特防×0.08 + 等级×0.2；夹 14..48。特防与等级越高，回光越密。
 *   tempo      起手：基础 5 刻 − 速度×0.02；夹 3..9。吞咽是快的。
 *   aftercast  收招：基础 6 刻 + 碰撞箱高度×0.8；夹 5..10。
 *   wait       冷却：基础 90 刻 − 等级×0.4；慢咽 −15；夹 60..120。PP 10 的代价。
 * 配置 sipping（慢咽）双向取舍：开＝回复分三小口、总量 ×0.9，但冷却 −15，且小口能补上期间新受的伤（不浪费）；
 *   关＝一口吞下、回满总额，但冷却更长，满血时容易溢出浪费。两向各有局面：挨打中用慢咽、安全时一口闷。
 */
namespace PokemonSkills {
    /** 共享蓄力身份的 tag：蓄力层数按它跨单元读取。 */
    export const swallowPowerTag = "world_combat:status/stockpile";

    /** 攒下的层数（0..3）：谁生产的 stockpile 身份都认，amplifier 就是层数。 */
    export function swallowLayers(world: CombatWorld, actor: CombatActor): number {
        if (!world.valid(actor)) return 0;
        const effect = CombatStatus.representative(world, actor, "stockpile");
        return effect === null ? 0 : Math.max(0, Math.min(3, Math.round(effect.amplifier())));
    }

    // `state.layers` 纯事实：公式与说明读到的是这次真正持有的层数（无现场时为未知）。
    defineFacts("swallow", function (context) {
        return { read: function (id) {
            if (id !== "state.layers") return undefined;
            const world = context.world, actor = context.actor;
            if (!world || !actor || !world.valid(actor)) return undefined;
            return swallowLayers(world, actor);
        } };
    });

    const swallowPerLayer = F.base(0.24).plus(F.stat("specialDefence").times(0.0006)).plus(F.body("weight").div(3000))
        .clamp(0.18, 0.32).as(text("worldcombat.skill.swallow.value.perLayer"));
    const swallowStored = F.state("layers", text("worldcombat.skill.swallow.value.layers"));

    actionParameters.define("swallow", {
        /** 总回复：层数越多回得越多，满三层跳一档。 */
        worth: percent(
            swallowStored.times(swallowPerLayer)
                .plus(F.when(swallowStored.gte(3), F.const(0.35).as(text("worldcombat.skill.swallow.value.surge")), F.const(0)))
                .times(F.when(F.pref("sipping", text("worldcombat.skill.swallow.preference.sipping")), F.const(0.9), F.const(1)))
                .clamp(0.15, 1.0),
            "总回复", "吞下回复的最大生命比例：每层一份、满三层再跳一档（原生 25%/50%/100% 的对位）；慢咽 ×0.9。回复量取决于吞下时真正攒着的层数。"),
        /** 消化窗口：慢咽把回复分进这段时间。 */
        digestTicks: seconds(
            F.base(60).plus(F.body("weight").times(0.2)).clamp(40, 120).round(0),
            "消化窗口", "「咽力」标记在身上的时长；慢咽把回复分进这段时间，一口吞则只作短暂标记。"),
        /** 回光半径：身板越高环越大。 */
        spread: formula(
            F.base(1.0).plus(F.body("height").times(0.5)).clamp(0.9, 2.2).round(2),
            "回光半径", {
                unit: " 格",
                description: "回复光从身上荡开的半径；碰撞箱越高大环越大，画面里的光就是这块范围。"
            }),
        /** 回光点数：特防与等级决定回光多密。 */
        motes: formula(
            F.base(16).plus(F.stat("specialDefence").times(0.08)).plus(F.level().times(0.2)).clamp(14, 48).round(0),
            "回光点数", {
                unit: " 点",
                description: "一次吞咽浮起的回光数量；特防与等级越高越多，粒子按它发射。"
            }),
        /** 起手：吞咽是快的。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").times(0.02)).clamp(3, 9).round(0),
            "起手", "把力咽下去需要多久；速度越快越短。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(0.8)).clamp(5, 10).round(0),
            "收招", "咽下之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(90).minus(F.level().times(0.4))
                .minus(F.when(F.pref("sipping", text("worldcombat.skill.swallow.preference.sipping")), F.const(15), F.const(0)))
                .clamp(60, 120).round(0),
            "冷却", "两次吞咽之间的等待；等级越高越短，慢咽再短 15。PP 10 的代价。")
    });

    stages("swallow", [
        { level: 30, values: { wait: 78 } },
        { level: 50, values: { wait: 66 } }
    ]);

    describe("swallow", [
        { key: "description.0", values: ["worth"] },
        { key: "description.layers", values: [] },
        { key: "description.1", values: ["digestTicks"] },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "sip.on", values: [], when: function (context) { return read(context.detail.values, ["sipping"]) === true; } },
        { key: "sip.off", values: [], when: function (context) { return read(context.detail.values, ["sipping"]) !== true; } },
        { key: "timing", values: [] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wait"] }
    ]);
}
