/**
 * 鲜花防守 / flowershield —— 参数与数值来源。
 *
 * 原生事实：Fairy、变化、威力 —、命中必中、PP 10、目标 all；使用神奇的力量，
 *   提高**在场的所有草属性**宝可梦的**防御** 1 级（不分敌我）。
 *
 * 翻译：把回合制的一次全场增益翻成**从施法者身上一圈圈推开的花浪**——花瓣由内向外绽开、扫过一圈，
 *   被扫到的草属性身上落下一层护瓣，防御抬起来；花瓣停一会儿就凋落，这份提升随之收回。
 *   取原生「草属性、防御 +1、PP 10、不分敌我」；放弃「一次结算整个战场」，改成一次**以自身为心的放射花浪**，
 *   对手的草属性也会被护到——这是这招与耕地的分界：耕地管一块地、管双攻；鲜花防守管一圈、管防御、不看站位。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   guard      防御等级：基础 1 级；防御高（≥150）或密瓣各 +1，夹 1..2。原生 +1 的对位。
 *   bloom      花浪半径：基础 3.0 格 + 特攻超出 60 的少量 + 身高×0.6，密瓣 ×0.72、散瓣 ×1.25，夹 2.2..6.5。画面花环同径。
 *   petals     花瓣量：基础 24 + 特攻/8 + 等级×0.2，密瓣 ×1.2、散瓣 ×0.85，夹 20..80。驱动粒子发射量。
 *   guardTicks 护瓣时长：基础 240 刻 + 等级×3 + 特防×0.3，密瓣 ×1.25、散瓣 ×0.9，夹 160..620。等级 30／46 阶梯再抬。
 *   tempo      起手：基础 9 刻 − 速度超出 50 的部分，密瓣 +2，夹 5..14。
 *   aftercast  收招：基础 6 刻 + 身高×1.1，夹 6..10。
 *   wait       冷却：基础 110 刻 − 等级×0.5，密瓣 ×1.12，夹 65..140。PP 10 的代价。
 * 配置 dense（瓣形）双向取舍：密瓣＝防御 +1、窗口 ×1.25、花瓣更密，但花浪只有散瓣的 0.72 宽、起手 +2、冷却 ×1.12；
 *   散瓣＝花浪宽 1.25 倍、起手与冷却都便宜，防御按本体、窗口更短。两向各有局面（点护 vs 铺开）。
 */
namespace PokemonSkills {
    export const flowershieldId = "flowershield";
    /** 共享身份名：草属性被花浪扫到后带的世界状态。 */
    export const flowershieldStatus = "petaled";
    /** 真实 MobEffect 注册 id（startup.ts 的 e.create）。 */
    export const flowershieldEffect = "world_combat:flowershield_guard";
    export const flowershieldScene = "world_combat:move_flowershield";
    export const flowershieldBloomText = "world_combat.move.flowershield.text.bloom";
    export const flowershieldGuardText = "world_combat.move.flowershield.text.guard";
    export const flowershieldFadeText = "world_combat.move.flowershield.text.fade";
    /** 表现里的参考半径：`data.scale = 实际花浪半径 / 这个数`。 */
    export const flowershieldReferenceRadius = 3.0;

    actionParameters.define(flowershieldId, {
        /** 防御等级：防御高或密瓣各 +1。 */
        guard: formula(
            F.base(1)
                .plus(F.stat("defence").minus(150).times(0.02).clamp(0, 1))
                .plus(F.when(F.pref("dense", text("worldcombat.skill.flowershield.preference.dense")), F.const(1), F.const(0)))
                .clamp(1, 2).round(0),
            "防御等级", {
                unit: " 级",
                description: "花浪把草属性的防御抬高多少级；防御高（≥150）或密瓣各多一级。"
            }),
        /** 花浪半径：特攻与体型决定推开多宽。 */
        bloom: formula(
            F.base(3.0).plus(F.stat("specialAttack").minus(60).times(0.012).clamp(0, 1)).plus(F.body("height").times(0.6))
                .times(F.when(F.pref("dense", text("worldcombat.skill.flowershield.preference.dense")), F.const(0.72), F.const(1.25)))
                .clamp(2.2, 6.5).round(2),
            "花浪半径", {
                unit: " 格",
                description: "花瓣从身上推开多大一圈；特攻越高、身板越高越广，密瓣收拢、散瓣铺开。画面里的花环就是这个半径。"
            }),
        /** 花瓣量：特攻与等级决定一次绽开多少。 */
        petals: formula(
            F.base(24).plus(F.stat("specialAttack").div(8)).plus(F.level().times(0.2))
                .times(F.when(F.pref("dense", text("worldcombat.skill.flowershield.preference.dense")), F.const(1.2), F.const(0.85)))
                .clamp(20, 80).round(0),
            "花瓣量", {
                unit: " 片",
                description: "一圈花浪掀出的花瓣数量；特攻与等级越高越密，密瓣更多，粒子按它发射。"
            }),
        /** 护瓣时长：窗口走完防御收回。 */
        guardTicks: seconds(
            F.base(240).plus(F.level().times(3)).plus(F.stat("specialDefence").times(0.3))
                .times(F.when(F.pref("dense", text("worldcombat.skill.flowershield.preference.dense")), F.const(1.25), F.const(0.9)))
                .clamp(160, 620).round(0),
            "护瓣时长", "护瓣在身上停多久；等级与特防让它更耐放，密瓣更久。窗口走完，防御一并收回。"),
        /** 起手：速度决定张臂多快。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(50).times(0.04).clamp(0, 4))
                .plus(F.when(F.pref("dense", text("worldcombat.skill.flowershield.preference.dense")), F.const(2), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "张臂把花瓣推出去需要多久；速度越快越短，密瓣要更久。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(1.1)).clamp(6, 10).round(0),
            "收招", "花浪推出之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(110).minus(F.level().times(0.5))
                .times(F.when(F.pref("dense", text("worldcombat.skill.flowershield.preference.dense")), F.const(1.12), F.const(1)))
                .clamp(65, 140).round(0),
            "冷却", "两次鲜花防守之间的等待；等级越高越短，密瓣更长。PP 10 的代价。")
    });

    stages(flowershieldId, [
        { level: 30, values: { guardTicks: 360, wait: 96 } },
        { level: 46, values: { guardTicks: 440, wait: 86 } }
    ]);

    describe(flowershieldId, [
        { key: "description.0", values: ["bloom", "guardTicks"] },
        { key: "description.1", values: ["guard"] },
        { key: "dense.on", values: [], when: function (context) { return read(context.detail.values, ["dense"]) === 1; } },
        { key: "dense.off", values: [], when: function (context) { return read(context.detail.values, ["dense"]) !== 1; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.guardTicks", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.guardTicks", "tier.1.wait"] }
    ]);
}
