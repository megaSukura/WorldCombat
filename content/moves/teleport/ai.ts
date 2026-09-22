/**
 * 瞬间移动 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：场上有一个看得见、敌对、存活的威胁在 `ai.maxChase`（默认 14）格内。
 * 对谁出手：不选对象——落点由 `target` 钩子算成「背离威胁、距自己一个瞬移距离」的点；选中后原地闪走。
 * 候选之间怎么排：生命比例掉到 `ai.retreatBelow`（默认 0.35）以下时 priority 96（这就是逃生手段），
 *   否则 30（顺势换位、甩掉追兵）。
 * 够不到怎么办：`reach` 就是瞬移距离，但本招以自身为落点参照，不需要先走近谁。
 * 放完之后：落点甩掉了盯着自己的敌人，交回共享顺序继续走位或脱离。
 */
namespace CompanionBehavior {
    registerUse("teleport", {
        protocols: ["world_combat:cover"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const threat = context.senses["world_combat:threat"] as Entity | null;
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            return distance(source(context).point, threat.point) <= ai<number>(capability, "maxChase", 14);
        },
        accepts: function () { return true; },
        approachTarget: function (context) { return source(context); },
        target: function (context, capability, _target) {
            const self = source(context), threat = context.senses["world_combat:threat"] as Entity | null;
            const range = capability.data.range;
            const copy: any = JSON.parse(JSON.stringify(self));
            if (threat) {
                const dx = self.point[0] - threat.point[0], dz = self.point[2] - threat.point[2];
                const length = Math.sqrt(dx * dx + dz * dz) || 1;
                copy.point = [self.point[0] + dx / length * range, self.point[1], self.point[2] + dz / length * range];
            } else {
                copy.point = [self.point[0], self.point[1], self.point[2] + range];
            }
            return copy;
        },
        priority: function (context, capability, _target) {
            return ratio(source(context)) <= ai<number>(capability, "retreatBelow", 0.35) ? 96 : 30;
        }
    });

    const teleportRetreat = PokemonSkills.number("ai.retreatBelow", "远遁血量", 0.1, 0.9, 0.05);
    teleportRetreat.help = "自己生命比例低于这个值时，把瞬间移动排成最优先的逃生；调高更早闪走，调低只在濒危时才用。";
    const teleportChase = PokemonSkills.number("ai.maxChase", "出手距离", 3, 24, 1);
    teleportChase.help = "威胁在这个距离以内才考虑瞬移换位；调小只在贴身时闪，调大更早拉开。";
    const teleportLeave = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    teleportLeave.help = "开启后，收到「驻守」指令时也会瞬移脱离原位。";

    PokemonSkills.addPreferences("teleport", {}, [teleportRetreat, teleportChase, teleportLeave]);
}
