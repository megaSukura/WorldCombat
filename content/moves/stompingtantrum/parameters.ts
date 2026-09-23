/**
 * 跺脚 / stompingtantrum —— 参数、伤害段与「上一次出手落空」的记账。
 *
 * 原生事实：Ground／物理／威力 75／命中 100／PP 10／接触；
 *   「化悔恨为力量进行攻击。如果上一回合招式没有打中，威力就会翻倍」（Cobblemon 1.8）。
 *
 * 翻译：即时战斗没有回合，本实现把「上一回合招式没有打中」落成**一次真实的失手**——施法者上一次
 *   进攻出手没打出伤害时，身上会留下「憋愤」状态（共享身份 world_combat:status/stompingtantrum）；
 *   带着这口气再跺脚，这一脚威力翻倍、裂缝更长、把人掀得更高。任何命中都会把这口气消掉。
 *   记为事件：world_combat:committed 记下一次出手，world_combat:damage_applied 记下它有没有打中。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   tremor    跺地威力：物攻定狠度、体重定砸得实不实、等级补一点；带憋愤时 ×2。
 *   fissure   裂缝长度：身高决定跺开多远、等级补一点；它也是本招的实际射程来源。
 *   halfWidth 裂缝半宽：碰撞箱宽度。
 *   launch    上抛初速：物攻与体重（越沉越能把人掀起来）。
 *   shove     向外推开：物攻。
 *   flows     裂缝颗粒数：物攻与等级，直接驱动画面密度。
 *   shock     憋愤时末端二次崩塌的半径：身高。
 *   rentTicks／rentCells 地面裂痕停留多久、铺多少块：等级与物攻。
 *   tempo／settle／recharge 速度决定起手、收招、冷却。
 *
 * 配置 deep（深跺）：裂缝更宽 ×1.25、上抛 ×1.15、裂痕更久 ×1.3，但威力 ×0.92、裂缝略短 ×0.95、
 *   起手 +3 刻、冷却 +8 刻；关闭＝窄而快、单次更疼。两向各有局面：深跺封住一条路，浅跺点掉一个人。
 */
namespace PokemonSkills {
    export const stompId = "stompingtantrum";
    export const stompScene = "world_combat:move_stompingtantrum";
    /** 共享身份：上一次出手落空后憋着的那口气。 */
    export const stompStatus = "stompingtantrum";
    export const stompEffect = "world_combat:stompingtantrum_frustration";
    export const stompHitText = "world_combat.move.stompingtantrum.text.hit";
    export const stompRageText = "world_combat.move.stompingtantrum.text.rage";
    export const stompMissText = "world_combat.move.stompingtantrum.text.miss";
    /** 憋愤持续：够下一次出手用掉，不至拖太久。 */
    export const stompRageTicks = 110;
    /** 只把「刚出手就落空／早忘了」排除在外的窗口。 */
    var stompSwingWindow = { min: 6, max: 150 };
    /** 每个进攻者最近一次出手：commit 刻，以及之后有没有打出过伤害。 */
    var stompSwings: { [ref: string]: { attempt: number; land: number } } = Object.create(null);

    /** 施法者上一次出手是否打空（供 AI 与表现读同一份事实）。 */
    export function stompWhiffed(world: CombatWorld, actor: CombatActor): boolean {
        const swing = stompSwings[String(actor.ref())];
        if (swing === undefined) return false;
        const now = world.tick();
        return (swing.land || -1000) < swing.attempt
            && now - swing.attempt >= stompSwingWindow.min && now - swing.attempt <= stompSwingWindow.max;
    }

    actionParameters.define(stompId, {
        /** 跺地威力：基础 75，物攻每比 60 多 1 加 0.3（夹 −14..32），体重每比 50 重 1 加 0.08（夹 −6..18），等级每比 30 高 1 加 0.4（夹 −4..10）；带憋愤 ×2、深跺 ×0.92；夹 38..190。 */
        tremor: formula(
            F.base(75)
                .plus(F.stat("attack").minus(60).times(0.3).clamp(-14, 32))
                .plus(F.body("weight").minus(50).times(0.08).clamp(-6, 18))
                .plus(F.level().minus(30).times(0.4).clamp(-4, 10))
                .times(F.when(F.status(stompStatus).gt(0), F.const(2), F.const(1)).as(text("worldcombat.skill.stompingtantrum.value.rage")))
                .times(F.when(F.pref("deep"), F.const(0.92), F.const(1)))
                .clamp(38, 190).round(1),
            "跺地威力", {
                unit: "威力",
                description: "这一脚跺进地面、沿裂缝传开的基础威力；物攻越高越狠，身体越沉砸得越实。上一次出手落空、身上还憋着那口气时翻倍。对手防御、相性与暴击在命中时另算。"
            }),
        /** 裂缝长度：基础 6.0 格，碰撞箱每比 1.4 高 1 格加 0.5 格（夹 −0.3..1.0），等级每比 30 高 1 加 0.03（夹 −0.2..0.6）；深跺 ×0.95；夹 5.2..6.4。 */
        fissure: formula(
            F.base(6.0)
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 1.0))
                .plus(F.level().minus(30).times(0.03).clamp(-0.2, 0.6))
                .times(F.when(F.pref("deep"), F.const(0.95), F.const(1)))
                .clamp(5.2, 6.4).round(2),
            "裂缝长度", {
                unit: "格",
                description: "裂缝从脚下朝目标裂开多远；个子高的个体跺得更远。它也是本招的实际射程来源。"
            }),
        /** 裂缝半宽：基础 0.7 格，碰撞箱每比 0.9 宽 1 格加 0.5 格（夹 −0.15..0.7）；深跺 ×1.25；夹 0.5..1.5。 */
        halfWidth: formula(
            F.base(0.7)
                .plus(F.body("width").minus(0.9).times(0.5).clamp(-0.15, 0.7))
                .times(F.when(F.pref("deep"), F.const(1.25), F.const(1)))
                .clamp(0.5, 1.5).round(2),
            "裂缝半宽", {
                unit: "格",
                description: "裂缝两侧各能扫到多宽；体型宽的个体跺开的缝更宽。"
            }),
        /** 上抛初速：基础 0.34 格/刻，物攻每比 60 多 1 加 0.004（夹 −0.08..0.22），体重每比 50 重 1 加 0.0012（夹 −0.03..0.1）；深跺 ×1.15；夹 0.18..0.82。 */
        launch: formula(
            F.base(0.34)
                .plus(F.stat("attack").minus(60).times(0.004).clamp(-0.08, 0.22))
                .plus(F.body("weight").minus(50).times(0.0012).clamp(-0.03, 0.1))
                .times(F.when(F.pref("deep"), F.const(1.15), F.const(1)))
                .clamp(0.18, 0.82).round(3),
            "上抛初速", {
                unit: "格/刻",
                description: "站在裂缝上的人被向上掀起的初速；物攻高、身体沉的个体把人掀得更高。它决定目标离地的时长。"
            }),
        /** 向外推开：基础 0.3 格，物攻每比 60 多 1 加 0.003（夹 −0.06..0.32）；夹 0.12..0.75。 */
        shove: formula(
            F.base(0.3).plus(F.stat("attack").minus(60).times(0.003).clamp(-0.06, 0.32)).clamp(0.12, 0.75).round(2),
            "向外推开", {
                unit: "格",
                description: "被裂缝掀中的人沿离中心的方向被推开的水平距离；力量越大推得越远。"
            }),
        /** 裂缝颗粒数：基础 18，物攻每比 60 多 1 加 0.2（夹 −4..26），等级每比 30 高 1 加 0.3（夹 −3..9）；夹 12..56。 */
        flows: formula(
            F.base(18).plus(F.stat("attack").minus(60).times(0.2).clamp(-4, 26))
                .plus(F.level().minus(30).times(0.3).clamp(-3, 9)).clamp(12, 56).round(0),
            "裂缝颗粒数", {
                unit: "个",
                description: "沿裂缝迸出的土石数量；物攻与等级越高越密，直接驱动画面的发射量。"
            }),
        /** 末端崩塌半径：基础 1.3 格，碰撞箱每比 1.4 高 1 格加 0.4（夹 −0.1..0.8）；夹 1.0..2.4。 */
        shock: formula(
            F.base(1.3).plus(F.body("height").minus(1.4).times(0.4).clamp(-0.1, 0.8)).clamp(1.0, 2.4).round(2),
            "末端崩塌半径", {
                unit: "格",
                description: "带着憋愤跺下时，裂缝尽头二次崩塌的范围；大个子跺出的坑更大。"
            }),
        /** 裂痕停留：基础 120 刻 + 等级 ×0.8；深跺 ×1.3；夹 80..300。 */
        rentTicks: seconds(
            F.base(120).plus(F.level().times(0.8))
                .times(F.when(F.pref("deep"), F.const(1.3), F.const(1))).clamp(80, 300).round(0),
            "裂痕停留", "跺开的地面留在地上的裂痕停留多久；到期原方块回来。"),
        /** 裂痕块数：基础 18 + 物攻 ×0.2；夹 14..48。同时驱动表现密度。 */
        rentCells: formula(
            F.base(18).plus(F.stat("attack").times(0.2)).clamp(14, 48).round(0),
            "裂痕块数", {
                unit: "块",
                description: "地面被跺裂的块数；随物攻增长，也决定画面的密度。"
            }),
        /** 起手：基础 9 刻，速度每比 55 快 1 减 0.03 刻（夹 −1.5..3），深跺 +3；夹 5..16。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 3))
                .plus(F.when(F.pref("deep"), F.const(3), F.const(0))).clamp(5, 16).round(0),
            "起手", "抬脚、沉身到跺下去之间的时间；速度快的个体跺得更快，深跺先站稳。"),
        /** 收招：基础 8 刻；夹 4..14。 */
        settle: seconds(F.base(8).clamp(4, 14).round(0), "收招", "跺完收脚、站稳的时间。"),
        /** 冷却：基础 30 刻，速度每比 55 快 1 减 0.12 刻（夹 −4..6），深跺 +8；夹 18..46。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(55).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("deep"), F.const(8), F.const(0))).clamp(18, 46).round(0),
            "冷却", "这一脚之后多久能再跺一次；速度快的个体回得更快，深跺更费。")
    });

    defineDamage(stompId, "tremor", {}, { contact: true });

    stages(stompId, [
        { level: 34, values: { tremor: 92 } },
        { level: 52, values: { tremor: 112, launch: 0.5 } }
    ]);

    describe(stompId, [
        { key: "description.0", values: ["tremor"] },
        { key: "description.rage", values: [] },
        { key: "description.1", values: ["fissure", "halfWidth", "launch", "shove"] },
        { key: "description.2", values: ["rentTicks", "rentCells"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.tremor"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.tremor", "tier.1.launch"] }
    ]);

    // ---- 记账：把「上一次出手落空」落成身上的 reality（憋愤）----
    // 每一次进攻出手（targetKind = enemy）提交时，看上一次进攻出手到这一刻有没有打出过伤害；
    // 没有则说明上一招打空了，施加/续上共享身份。任何命中都会消掉这口气，不靠回合。
    WorldCombat.on("world_combat:stompingtantrum/swing", "world_combat:committed", "", function (event) {
        const action = event.action();
        if (action === null || action.targetKind() !== "enemy") return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.observe(actor) === null) return;
        const ref = String(actor.ref()), now = world.tick(), previous = stompSwings[ref];
        const spent = previous !== undefined && (previous.land || -1000) < previous.attempt
            && now - previous.attempt >= stompSwingWindow.min && now - previous.attempt <= stompSwingWindow.max;
        if (spent) CombatStatus.apply(world, actor, stompStatus, stompEffect, stompRageTicks, 0, { unique: true });
        stompSwings[ref] = { attempt: now, land: previous === undefined ? -1000 : previous.land };
    });
    WorldCombat.on("world_combat:stompingtantrum/land", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (data.kind !== "move" || !(data.actual > 0)) return;
        const world = event.world(), actor = event.actor(), swing = stompSwings[String(actor.ref())];
        if (swing !== undefined) swing.land = world.tick();
        CombatStatus.cure(world, actor, stompStatus);
    });
}
