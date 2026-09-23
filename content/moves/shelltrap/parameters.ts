/**
 * 陷阱甲壳 / shelltrap 的参数、待爆账本与触发监听。
 *
 * 原生事实：Fire／特殊／威力 150／命中 100／PP 5／优先度 −3／flags failmefirst 等／
 *   target allAdjacentFoes；条件 duration 1：这一回合里**被对手的物理招式打中**就把 gotHit 置位，
 *   否则这一招什么都不做；「设下甲壳陷阱。如果对手使出物理招式，陷阱就会爆炸并给予对手伤害」。
 *
 * 翻译：回合制的「设陷阱→被物理打中就爆」在即时战斗里是一段**撑壳待爆**——施法者扎住脚、把壳张成
 *   待爆状态，接下来一小段时间里只要被**敌对来源的物理命中**打中，壳就当场炸开：身周所有非友方各挨一次
 *   `blast` 火焰伤害、被向外震开，并可能被碎片点燃；一直没被物理打中，则壳慢慢冷却、这一招落空。
 *   爆炸伤害是这招自己的火焰威力（150 的对位），**不按挨到的伤害返还**，这是它与双倍奉还／忍耐的分界。
 *   配置 `hairtrigger`（感应壳）把触发条件放宽到「任何敌对命中」，代价是威力与窗口都缩小。
 *   与同族分开：
 *     双倍奉还／镜面反射／忍耐 —— 把挨到的伤害按账本返还（针对打你的人）；
 *     拦堵（obstruct）        —— 挡下来袭并让撞上的人变软；
 *     陷阱甲壳（本招）        —— 不挡不还，只等一记物理把自己点着，然后**对身周整圈**炸出自己的火焰。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   blast        爆炸威力 145 + 特攻偏移 + 等级偏移（壳越厚、火越猛）；感应壳 ×0.75。
 *   blastRadius  爆炸半径 3.6 + 身高偏移 + 等级偏移（身板越大炸得越开）。
 *   window       撑壳时长 60 刻 + 防御偏移 + 等级偏移（壳越硬撑得越久）；感应壳 ×0.8。
 *   shock        向外震开 0.6 格 + 特攻偏移。
 *   burnChance   碎片点燃概率 0.2 + 特攻偏移，夹 0.05..0.45。
 *   burnTicks    点燃停留 220 刻 + 特攻偏移 + 等级偏移。
 *   fragments    碎片量由威力与半径派生（画面密度）。
 *   tempo／settle／recharge 起手／收招／冷却随速度与防御；感应壳冷却更久。
 */
namespace PokemonSkills {
    export const shelltrapEffect = "world_combat:shelltrap_armed";
    /** 待爆壳被点着后挂上的内部记号（同一实体的世界效果），动作的看门循环读它决定引爆。 */
    export const shelltrapLit = "world_combat:shelltrap_lit";
    export const shelltrapScene = "world_combat:move_shelltrap";
    export const shelltrapChargeText = "world_combat.move.shelltrap.text.charge";
    export const shelltrapBlastText = "world_combat.move.shelltrap.text.blast";
    export const shelltrapFizzleText = "world_combat.move.shelltrap.text.fizzle";
    export const shelltrapEmptyText = "world_combat.move.shelltrap.text.empty";

    /** 按共享伤害语义读取物理分类，覆盖招式与已识别的原版伤害。 */
    export function shelltrapPhysical(data: any): boolean {
        return DamageSemantics.read(data).category === "physical";
    }

    // 内部记号载体：只用来把「壳已被点着」传给动作的看门循环，不显示、不附带行为。
    WorldCombat.effect(shelltrapLit, 1, 200, "actor", function (json) { return json; }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(shelltrapLit, "start", function () { });
    WorldCombat.effectHandler(shelltrapLit, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 触发点：撑壳者被敌对命中时点亮。感应壳（amplifier 1）放宽到任何命中；否则只认物理。
    WorldCombat.on("world_combat:move_shelltrap/trigger", "world_combat:damage_applied", "", function (event: CombatWorldEvent) {
        var victim = event.target();
        if (victim === null) return;
        var world = event.world();
        if (!world.valid(victim)) return;
        var armed = MobEffects.read(world, victim, shelltrapEffect);
        if (armed === null) return;
        var data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        var source = event.actor();
        // 自身来源（灼伤、摔落等）不点着壳；友伤也不算（event.world() 的来源是来袭者，所以要问 victim 是否与它同盟）。
        if (source !== null && String(source.key()) === String(victim.key())) return;
        if (source !== null && world.friendly(victim)) return;
        if (armed.amplifier() < 1 && !shelltrapPhysical(data)) return;
        if (world.effects(victim, shelltrapLit).length) return;
        world.effect(shelltrapLit, victim, "{}", 60);
    });

    actionParameters.define("shelltrap", {
        /** 爆炸威力：145 + 特攻偏移[−30,80] + 等级(≥30)偏移[0,16]；感应壳 ×0.75；夹 90..260。 */
        blast: formula(
            F.base(145)
                .plus(F.stat("specialAttack").minus(70).times(0.5).clamp(-30, 80))
                .plus(F.level().minus(30).times(0.25).clamp(0, 16))
                .times(F.when(F.pref("hairtrigger"), F.const(0.75), F.const(1.0)))
                .clamp(90, 260).round(1),
            "爆炸威力", {
                unit: "威力",
                description: "壳被点着时对身周每个敌人的基础威力；特攻越高、等级越高爆得越猛，感应壳把这一炸换成了更宽的触发条件。对手特防、相性与暴击在命中时另算。"
            }),
        /** 爆炸半径：3.6 + 身高偏移[−0.6,1.6] + 等级(≥30)偏移[0,1.0]；夹 2.5..6.0。 */
        blastRadius: formula(
            F.base(3.6)
                .plus(F.body("height").minus(1.4).times(0.7).clamp(-0.6, 1.6))
                .plus(F.level().minus(30).times(0.04).clamp(0, 1.0))
                .clamp(2.5, 6.0).round(2),
            "爆炸半径", {
                unit: "格",
                description: "壳炸开时罩住身周多大一圈；身板高、等级高的个体炸得更开。它也是本招的指示圈半径。"
            }),
        /** 撑壳时长：60 刻 + 防御偏移[−10,30] + 等级(≥30)偏移[0,20]；感应壳 ×0.8；夹 30..120。 */
        window: seconds(
            F.base(60).plus(F.stat("defence").minus(60).times(0.3).clamp(-10, 30))
                .plus(F.level().minus(30).times(0.5).clamp(0, 20))
                .times(F.when(F.pref("hairtrigger"), F.const(0.8), F.const(1.0))).clamp(30, 120).round(0),
            "撑壳时长", "把壳张成待爆状态能撑多久；防御越高、等级越高撑得越久，感应壳更短。这段时间里你得站定等一记命中。"),
        /** 向外震开：0.6 + 特攻偏移[−0.15,0.7]；夹 0.3..1.5。 */
        shock: formula(
            F.base(0.6).plus(F.stat("specialAttack").minus(70).times(0.006).clamp(-0.15, 0.7)).clamp(0.3, 1.5).round(2),
            "向外震开", {
                unit: "格",
                description: "被炸中的人沿离爆心方向被震开的距离；特攻越高震得越远。"
            }),
        /** 点燃概率：0.2 + 特攻偏移[−0.06,0.2]；夹 0.05..0.45。 */
        burnChance: percent(
            F.base(0.2).plus(F.stat("specialAttack").minus(70).times(0.0015).clamp(-0.06, 0.2)).clamp(0.05, 0.45).round(3),
            "点燃概率", "被炸中的人被燃烧的碎片点着的概率；特攻越高越容易点着。灼伤走共享状态，宝可梦那一层同步成原生异常。"),
        /** 点燃停留：220 刻 + 特攻偏移[−40,100] + 等级(≥30)偏移[0,30]；夹 120..380。 */
        burnTicks: seconds(
            F.base(220).plus(F.stat("specialAttack").minus(70).times(1.0).clamp(-40, 100))
                .plus(F.level().minus(30).times(0.6).clamp(0, 30)).clamp(120, 380).round(0),
            "点燃停留", "被点着的人身上的灼伤停留多久；特攻越高、等级越高烧得越久。"),
        /** 起手：8 刻 − 速度偏移[−2,4]；夹 5..12。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.05).clamp(-2, 4)).clamp(5, 12).round(0),
            "起手", "把壳撑成待爆状态所需的时间；速度快的个体收得更快。"),
        /** 收招：10 刻；夹 6..16。 */
        settle: seconds(
            F.base(10).plus(F.body("height").minus(1.4).times(0.6).clamp(-2, 4)).clamp(6, 16).round(0),
            "收招", "炸完（或收壳）之后站定收势的时间；身板大的个体收得稍慢。"),
        /** 冷却：56 刻 − 速度偏移[−8,10] + 感应壳 6 刻；夹 34..80。 */
        recharge: seconds(
            F.base(56).minus(F.stat("speed").minus(60).times(0.16).clamp(-8, 10))
                .plus(F.when(F.pref("hairtrigger"), F.const(6), F.const(0))).clamp(34, 80).round(0),
            "冷却", "两次撑壳之间的等待；速度快的个体回得更快，感应壳更费。"),
        maxTargets: hidden(8)
    });

    defineDamage("shelltrap", "blast", {});

    stages("shelltrap", [
        { level: 50, values: { blast: 190, blastRadius: 4.4, window: 78 } }
    ]);

    describe("shelltrap", [
        { key: "description.0", values: ["blast","window"] },
        { key: "description.1", values: ["blastRadius","maxTargets","shock"] },
        { key: "description.2", values: ["burnChance","burnTicks"] },
        { key: "hairtrigger.on", values: [], when: function (context) { return read(context.detail.values, ["hairtrigger"]) === true; } },
        { key: "hairtrigger.off", values: [], when: function (context) { return read(context.detail.values, ["hairtrigger"]) !== true; } },
        { key: "timing", values: ["blastRadius","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blast", "tier.0.blastRadius", "tier.0.window"] }
    ]);
}
