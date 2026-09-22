/**
 * 复生祈祷 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：倒下记录里有本阵营伙伴在祈祷范围内、且还在可祈祷窗口内（`PokemonSkills.revivalblessingNear`）。
 *   这招不作为普通战斗手段，只在有人倒下后回应；挂 `world_combat:fortify`（自身向的巩固/仪式），
 *   不需要先有威胁，野生与家养个体都会在满足条件时提出。
 * 对谁出手：不选对象——祈祷以自身为圆心，自动照到最近倒下的同阵营伙伴；`approachTarget` 指回自身，原地施放。
 * 候选之间怎么排：priority 72，把这次祈祷排在普通巩固之前。
 * 够不到怎么办：记录超出祈祷范围时 `available` 直接拒绝，等伙伴倒得更近或先走位。
 * 配置 `ai.combatOnly`：开启后只在有威胁的局面祈祷；关闭（默认）看到伙伴倒下就回应，不管周围有没有敌人。
 * 放完之后：光柱留在倒下处、慈爱与祝福挂在存活者身上，交回共享顺序继续。
 */
namespace CompanionBehavior {
    registerUse("revivalblessing", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            if (ai<boolean>(capability, "combatOnly", false) && !context.senses["world_combat:threat"]) return false;
            const reach = typeof capability.data.range === "number" && capability.data.range > 0 ? capability.data.range : 6;
            return PokemonSkills.revivalblessingNear(source(context).point, reach,
                context.tick, PokemonSkills.revivalblessingWindow);
        },
        accepts: function (context, _capability, target) {
            return String(target.ref) === String(source(context).ref);
        },
        approachTarget: function (context) { return source(context); },
        priority: function () { return 72; }
    });

    const revivalblessingCombat = PokemonSkills.flag("ai.combatOnly", "只在交战中祈祷");
    revivalblessingCombat.help = "开启：只在自己正面对威胁时才会为倒下的伙伴祈祷；关闭（默认）：看到伙伴倒下就回应，哪怕暂时脱战。";

    PokemonSkills.addPreferences("revivalblessing", {}, [revivalblessingCombat]);
}
