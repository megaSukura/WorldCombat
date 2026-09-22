/**
 * 聚气 / Focus Energy —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 0、命中必中、PP 30、优先度 0、目标 self；
 *   volatileStatus focusenergy，`onModifyCritRatio` 返回 critRatio + 2；与 volatileStatus dragoncheer 互斥
 *   （onStart 时若已带龙声鼓舞则施加失败）。
 *
 * 世界化：不是「下一回合开始容易击中要害」，而是**深深地吸一口气，把心神收成一点**：这口气随呼吸越沉越深，
 *   身上留住一段可见的吐纳窗口（共享身份 world_combat:status/focusenergy），期间自己的每一次伤害结算都会
 *   多一点找到破绽的机会；**命中不消耗这口气**，窗口走完才散。它和同族的区别在「越久越深、可反复兑现」——
 *   与磨砺（下一次命中必中要害、用掉即散）相反。原生「+2 要害等级」落成随时间爬升的附加概率。
 *   与龙声鼓舞互斥（原生同一份 volatile 不能并存）：身上已有鼓舞时聚气不成立，由 `ready` 拒绝，不花 PP。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   grasp   吐纳窗口：基础 200 刻 + 亲密度×0.35 + 特防×0.35；深呼 ×1.25／浅呼 ×0.8；夹 150..520；
 *           等级由成长阶梯另加。感情与定力越足，一口气压得越久。
 *   edge    满气附加比例：基础 30% + 速度×0.0005 + 特攻×0.0004；深呼 ×1.15／浅呼 ×0.9；夹 25%..60%。
 *           速度定「抓破绽的手感」，特攻定「读招的眼力」；这是爬满之后每次命中多出的要害概率。
 *   ramp    深化时间：基础 140 刻 − 等级×0.8；深呼 ×0.75／浅呼 ×1.1；夹 45..150。等级越高，越快把这口气沉到底。
 *   ripple  静念半径：基础 0.8 格 + 碰撞箱宽×0.7 + 碰撞箱高×0.15；夹 0.7..2.2。体型越大，静念铺得越开（判定与表现同径）。
 *   motes   静念数量：基础 20 + 特攻×0.08 + 物攻×0.03；夹 16..60。两攻越高，一次静下来浮起的念力微粒越多，粒子按它发射。
 *   breaths 呼吸圈数：基础 2 + 等级÷25；夹 2..4。等级越高，静气多推开几圈。
 *   tempo   起手：基础 7 刻 − 速度×0.02，深呼再 +3；夹 4..13。越快的个体收心越快，深呼更慢。
 *   aftercast 收招：基础 4 刻 + 碰撞箱高×1.1；夹 4..9。
 *   wait    冷却：基础 90 刻 − 等级×0.4，深呼 ×1.25／浅呼 ×0.85；夹 50..140。PP 30 的代价。
 * 配置 deep（深呼吸）双向取舍：深呼＝附加比例 ×1.15、满气来得更快（深化 ×0.75），但起手 +3 刻、冷却 ×1.25，
 *   更适合硬仗前坐稳；浅呼＝附加比例 ×0.9、满气更慢，换来起手与冷却都更低，适合拉锯里反复补。两个方向各有局面。
 */
namespace PokemonSkills {
    export const focusEnergyId = "focusenergy";
    export const focusEnergyScene = "world_combat:move_focusenergy";
    export const focusEnergyEffect = "world_combat:focus_breath";
    export const focusEnergyMark = "world_combat:focusenergy_mark";
    export const focusEnergyStatus = "focusenergy";
    export const focusEnergyReadyText = "world_combat.move.focusenergy.text.ready";
    export const focusEnergyDeepText = "world_combat.move.focusenergy.text.deep";
    export const focusEnergyFadeText = "world_combat.move.focusenergy.text.fade";

    actionParameters.define(focusEnergyId, {
        /** 吐纳窗口：亲密度与特防决定一口气压多久，深呼吸更久。 */
        grasp: seconds(
            F.base(200).plus(F.individual("friendship").times(0.35)).plus(F.stat("specialDefence").times(0.35))
                .times(F.when(F.pref("deep", text("worldcombat.skill.focusenergy.preference.deep")), F.const(1.25), F.const(0.8)))
                .clamp(150, 520).round(0),
            "吐纳窗口", "这口气留在身上多久；越亲近、定力越足压得越久，深呼吸明显更长，命中不会消耗它，走完才散。"),
        /** 满气附加比例：每次命中多出的要害概率。 */
        edge: percent(
            F.base(0.3).plus(F.stat("speed").times(0.0005)).plus(F.stat("specialAttack").times(0.0004))
                .times(F.when(F.pref("deep", text("worldcombat.skill.focusenergy.preference.deep")), F.const(1.15), F.const(0.9)))
                .clamp(0.25, 0.6),
            "满气附加比例", "这口气沉到底后，自己每次伤害命中多出的要害概率；速度定抓破绽的手感、特攻定读招的眼力，深呼吸更准。"),
        /** 深化时间：多久把这口气沉到底。 */
        ramp: seconds(
            F.base(140).minus(F.level().times(0.8))
                .times(F.when(F.pref("deep", text("worldcombat.skill.focusenergy.preference.deep")), F.const(0.75), F.const(1.1)))
                .clamp(45, 150).round(0),
            "深化时间", "从张口到满气需要多久；等级越高越快，深呼吸沉得更快、浅呼吸更慢。"),
        /** 静念半径：体型决定静气铺多开。 */
        ripple: formula(
            F.base(0.8).plus(F.body("width").times(0.7)).plus(F.body("height").times(0.15)).clamp(0.7, 2.2).round(2),
            "静念半径", {
                unit: " 格",
                description: "静气从身上铺开的半径，也是表现里静环的范围；体型越大铺得越开。"
            }),
        /** 静念数量：两攻越高越多。 */
        motes: formula(
            F.base(20).plus(F.stat("specialAttack").times(0.08)).plus(F.stat("attack").times(0.03)).clamp(16, 60).round(0),
            "静念数量", {
                unit: " 点",
                description: "一次静下来浮起的念力微粒数量；特攻与物攻越高越多，粒子按它发射。"
            }),
        /** 呼吸圈数：等级越高多推几圈。 */
        breaths: formula(
            F.base(2).plus(F.level().div(25)).clamp(2, 4).round(0),
            "呼吸圈数", {
                unit: " 圈",
                description: "静气推开几圈；等级越高越多，画面按它一圈圈散开。"
            }),
        /** 起手：速度决定收心多快，深呼吸更慢。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").times(0.02))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.focusenergy.preference.deep")), F.const(3), F.const(0)))
                .clamp(4, 13).round(0),
            "起手", "深深吸一口气需要多久；速度越快越短，深呼吸更慢（也更容易被打断）。"),
        /** 收招：身板越高大收得越慢。 */
        aftercast: seconds(
            F.base(4).plus(F.body("height").times(1.1)).clamp(4, 9).round(0),
            "收招", "收心之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级由成长阶梯缩短，深呼吸更长。 */
        wait: seconds(
            F.base(90).minus(F.level().times(0.4))
                .times(F.when(F.pref("deep", text("worldcombat.skill.focusenergy.preference.deep")), F.const(1.25), F.const(0.85)))
                .clamp(50, 140).round(0),
            "冷却", "两次聚气之间的等待；等级越高越短，深呼吸更长。PP 30 的代价。")
    });

    stages(focusEnergyId, [
        { level: 25, values: { grasp: 220 } },
        { level: 45, values: { grasp: 290 } },
        { level: 65, values: { grasp: 360 } }
    ]);

    describe(focusEnergyId, [
        { key: "description.0", values: ["edge", "grasp"] },
        { key: "deep.on", values: ["tempo", "wait"], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "description.1", values: ["ramp", "ripple"] },
        { key: "description.2", values: ["motes", "breaths"] },
        { key: "description.3", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.grasp"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.grasp"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.grasp"] }
    ]);
}
