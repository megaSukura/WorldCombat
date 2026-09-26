/**
 * 掀榻榻米 的伙伴 AI 用途：这是这招自己的一套出手计划——把整张席子掀到最该挡的那一轮伤害招式前面。
 *
 * 什么局面有意义：有看得见的威胁、进入 ai.trigger 距离、自己身上还没有同一张席子；ai.cover 开启时还要身边
 *   有别的伙伴可护（不为一发单体伤害空放）。
 * 什么时候最想出手：对手正打自己、或自己刚被打过时 priority 100——抢在重击落下前把席子先掀起来；
 *   只是远处对峙时 62，作为一轮防御预备。
 * 对谁出手：以自身为锚掀席，身边同伴顺势被罩住；不追人、不换位（掀席时定身）。
 * 放完之后：席子只立一瞬，吃满或到时自动落；席还在时不重复掀。
 */
namespace CompanionBehavior {
    const matBlockTrigger = PokemonSkills.number("ai.trigger", "反应距离", 2, 18, 1);
    matBlockTrigger.help = "威胁进入这个距离就考虑掀席；越大越早预判，也越可能白掀。";
    const matBlockCover = PokemonSkills.flag("ai.cover", "留到有伙伴才掀席");
    matBlockCover.help = "开启后，只有警戒范围内还有别的友方才掀席；关闭则自己受压就掀。";

    PokemonSkills.addPreferences("matblock", { fold: 1, ai: { trigger: 9, cover: false } },
        [matBlockTrigger, matBlockCover]);

    function matBlockAllyNear(context: WorldBehavior.Context, radius: number): boolean {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly && other.health > 0 && other.ref !== self.ref
                && CompanionBehavior.distance(other.point, self.point) <= radius) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("matblock", {
        protocols: ["world_combat:survive"],
        target: function (context, _item, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return target;
            const facing = JSON.parse(JSON.stringify(target)); facing.point = threat.point.slice(); return facing;
        },
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.guarded(context, self, "world_combat:move_matblock")) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(capability, "trigger", 9)) return false;
            if (CompanionBehavior.ai<boolean>(capability, "cover", false) && !matBlockAllyNear(context, 5)) return false;
            return true;
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"], self = CompanionBehavior.source(context);
            if (!threat) return 0;
            return self.hurtAgo < 60 || threat.attacking === self.ref ? 100 : 62;
        }
    });
}
