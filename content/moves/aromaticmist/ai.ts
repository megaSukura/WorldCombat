/**
 * 芳香薄雾 的伙伴 AI 用途：这是这招自己的一套出手计划——把一片香云铺在正要硬吃特攻的伙伴脚下。
 *
 * 什么局面有意义：有看得见的威胁、在 ai.maxChase 以内；有一个还没被香裹住的伙伴，且它脚下还没别的香云。
 * 对谁出手：当前照顾的伙伴；以它的位置为落点把香云铺开，罩住它和身边一圈人。
 * 候选之间怎么排：伙伴正在打威胁或刚受伤时 priority 70，否则 45。
 * 够不到怎么办：reach 就是送香距离，超出就先走近；ai.leaveStation 决定驻守时是否离位。
 * 放完之后：云留在原地，雾里的友方陆续被裹上；伙伴已经带着同一身份、或脚下已有香云时不再重复。
 */
namespace CompanionBehavior {
    const aromaticChase = PokemonSkills.number("ai.maxChase", "送香距离", 3, 20, 1);
    aromaticChase.help = "威胁与伙伴都要在这个距离以内才考虑送香；越大越愿意跑远一点去铺云。";
    const aromaticStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    aromaticStation.help = "开启后，收到「驻守」指令时也会离开原位去铺香云。";

    PokemonSkills.addPreferences("aromaticmist", { bouquet: 1, ai: { maxChase: 9, leaveStation: false } },
        [aromaticChase, aromaticStation]);

    function aromaticOnPatch(context: WorldBehavior.Context, target: Entity, radius: number): boolean {
        const areas = WorldEffects.areas(world(context), "world_combat:field/aromaticmist");
        for (let i = 0; i < areas.length; i++) {
            const dx = areas[i].position[0] - target.point[0], dz = areas[i].position[2] - target.point[2];
            if (Math.sqrt(dx * dx + dz * dz) <= areas[i].radius + radius * 0.5) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("aromaticmist", {
        protocols: ["world_combat:bolster"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(capability, "leaveStation", false)) return false;
            if (!target || target.health <= 0 || !target.visible) return false;
            const self = CompanionBehavior.source(context);
            if (!target.friendly || target.ref === self.ref) return false;
            if (CompanionBehavior.status(context, target, "aromaticmist")) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            const chase = CompanionBehavior.ai<number>(capability, "maxChase", 9);
            if (CompanionBehavior.distance(self.point, threat.point) > chase) return false;
            if (aromaticOnPatch(context, target, 3.6)) return false;
            return true;
        },
        accepts: function (context, _capability, target) {
            return target.friendly && target.ref !== CompanionBehavior.source(context).ref && target.health > 0 && target.visible;
        },
        priority: function (context, _capability, target) {
            if (!target || !target.friendly || target.health <= 0) return 0;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            return target.attacking === threat.ref || (typeof target.hurtAgo === "number" && target.hurtAgo < 60) ? 70 : 45;
        }
    });
}
