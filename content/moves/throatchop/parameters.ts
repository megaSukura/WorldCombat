/**
 * 地狱突刺 / throatchop —— 参数、伤害段与封声门禁。
 *
 * 原生事实：Dark／物理／威力 80／命中 100／PP 15／接触；命中后目标陷入 volatile throatchop
 *   （duration 2），期间所有带 sound 标记的招式被封禁；「在2回合内变得无法使出声音类招式」（Cobblemon 1.8）。
 *
 * 翻译：一记直取咽喉的突刺——命中那一下是物理伤害，之后咽喉被掐住说不出声，任何**声音类招式**在
 *   出手提交的一刻被顶回去。它不是隔空的必定封锁：突刺是近身直线，够不到就落空。
 *   与同族分开：挑衅封的是所有变化招式、且是隔空喊话；地狱突刺是物理命中、只封声音类招式。
 *
 * 数据分散（每个参数各吃不同的精灵数据）：
 *   chop         威力随物攻与等级（越壮越响）。
 *   silenceTicks 封声时长随物攻与等级；锁喉式更长。
 *   reach        突刺距离随体型高度与速度。
 *   radius       判定半径随体型高度。
 *   tempo／settle／recharge 起手／收招／冷却随速度与等级；锁喉式更慢更费。
 */
namespace PokemonSkills {
    export const throatChopId = "throatchop";
    export const throatChopScene = "world_combat:move_throatchop";
    export const throatChopEffect = "world_combat:throat_chop";
    export const throatChopStatus = "throatchop";
    export const throatChopText = "world_combat.move.throatchop.text.silenced";
    export const throatChopFadeText = "world_combat.move.throatchop.text.recovered";
    export const throatChopWhiffText = "world_combat.move.throatchop.text.whiff";

    // 封声门禁：带着本单元咽喉载体的活体，任何带 sound 标记的招式在提交时被顶回去。
    // 走共享动作策略，原生配招与通用动作共用同一个提交闸门；放在原生 skill-policy 之后，才能读到 flags。
    CombatStatus.actions.define({ id: "world_combat:move/throatchop/silence",
        after: ["cobblemon_world_combat:skill-policy"], applies: function (context) { return context.phase !== "damage"; },
        apply: function (context) {
            if (!CombatStatus.has(context.world, context.actor, throatChopStatus)) return;
            if (!context.move) return;
            var flags = context.metadata && context.metadata.flags;
            if (flags && flags.sound) context.blocked.silenced = true;
        } });

    defineDamage(throatChopId, "chop", {}, { contact: true });

    actionParameters.define(throatChopId, {
        chop: formula(
            F.base(80).plus(F.stat("attack").minus(60).times(0.35).clamp(-20, 55))
                .plus(F.level().minus(25).times(0.4).clamp(0, 14))
                .times(F.when(F.pref("choke", text("worldcombat.skill.throatchop.preference.choke")), F.const(0.9), F.const(1.15)))
                .clamp(56, 172).round(1),
            "威力", { unit: "威力", description: "突刺命中的物理威力；物攻越高、等级越高越重。锁喉式略轻，割喉式更重。对手防御、相性与暴击在命中时另算。" }),
        silenceTicks: seconds(
            F.base(120).plus(F.stat("attack").minus(60).times(0.2).clamp(-10, 24))
                .plus(F.level().minus(20).max(0).times(1.2).clamp(0, 36))
                .times(F.when(F.pref("choke", text("worldcombat.skill.throatchop.preference.choke")), F.const(1.25), F.const(0.75)))
                .clamp(90, 260).round(0),
            "封声时长", "目标多久说不出声；物攻越高、等级越高掐得越久。锁喉式更长，割喉式更短。"),
        reach: formula(
            F.base(2.4).plus(F.body("height").minus(1.4).times(0.4).clamp(-0.2, 0.6))
                .plus(F.stat("speed").minus(60).times(0.006).clamp(-0.2, 0.4)).clamp(2, 3.6).round(2),
            "突刺距离", { unit: "格", description: "这一记能递到多远；身形越大、身法越快够得越远。它也是本招的实际射程。" }),
        radius: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.05, 0.2)).clamp(0.38, 0.72).round(2),
            "判定半径", { unit: "格", description: "突刺的横向判定半径；大个子出手更宽。" }),
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.05).clamp(-2.5, 4))
                .plus(F.when(F.pref("choke", text("worldcombat.skill.throatchop.preference.choke")), F.const(2), F.const(-1)))
                .clamp(5, 14).round(0),
            "起手", "蓄力递出这一刺需要多久；快个体更早出手，锁喉式先沉一沉。"),
        settle: seconds(F.base(8).clamp(5, 14).round(0), "收招", "命中或落空之后收势的时间。"),
        recharge: seconds(
            F.base(70).minus(F.level().minus(20).max(0).times(0.5).clamp(0, 25))
                .plus(F.when(F.pref("choke", text("worldcombat.skill.throatchop.preference.choke")), F.const(6), F.const(0)))
                .clamp(45, 100).round(0),
            "冷却", "两次突刺之间的等待；等级越高越熟练，锁喉式更费。")
    });

    stages(throatChopId, [
        { level: 40, values: { chop: 100, silenceTicks: 160 } }
    ]);

    describe(throatChopId, [
        { key: "description.0", values: ["chop"] },
        { key: "description.1", values: ["silenceTicks"] },
        { key: "description.2", values: ["reach", "radius", "tempo", "settle", "recharge"] },
        { key: "choke.on", values: [], when: function (context) { return read(context.detail.values, ["choke"]) === true; } },
        { key: "choke.off", values: [], when: function (context) { return read(context.detail.values, ["choke"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.chop", "tier.0.silenceTicks"] }
    ]);
}
