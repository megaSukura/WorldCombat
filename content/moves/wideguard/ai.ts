/**
 * 广域防守 的伙伴 AI 用途：这是这招自己的一套出手计划——对准「成片拍过来」的一拍。
 *
 * 什么局面有意义：有看得见的威胁、进入 ai.trigger 距离、自己身上还没有同一面墙；关键的一条是威胁**确实
 *   在打远程／范围**——宽墙只截非接触伤害，贴身的近战本来就能穿过去。判据读已经发生的攻击事实（威胁最近一次
 *   得手是不是非接触、或它正隔着身位打某个伙伴），不为还没见过的 Boss 招式提前立墙。ai.cover 开启时还要身边
 *   有别的伙伴可护（不为一发单体远程空放）。
 * 什么时候最想出手：威胁贴身或自己/身边伙伴刚受伤时 priority 100——抢在共享交战次序前把墙先立起来；
 *   只是远处对峙时 60，作为一轮防御预备。
 * 对谁出手：以自身为锚立墙，身边同伴顺势被罩住；不追人、不换位（立墙时定身）。
 * 放完之后：墙只立一瞬，磨穿或到时自动收；墙还在时不重复立。
 */
namespace CompanionBehavior {
    const wideguardTrigger = PokemonSkills.number("ai.trigger", "反应距离", 2, 16, 1);
    wideguardTrigger.help = "威胁进入这个距离、并且确实在打远程／范围（宽墙能挡的那类）时，才考虑立墙；越大越早预判，也越可能白立。";
    const wideguardCover = PokemonSkills.flag("ai.cover", "留到有伙伴才立墙");
    wideguardCover.help = "开启后，只有警戒范围内还有别的友方才立墙；关闭则自己受压就立。";

    PokemonSkills.addPreferences("wideguard", { brace: 1, ai: { trigger: 8, cover: true } },
        [wideguardTrigger, wideguardCover]);

    function wideguardAllyNear(context: WorldBehavior.Context, radius: number): boolean {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly && other.health > 0 && other.ref !== self.ref
                && CompanionBehavior.distance(other.point, self.point) <= radius) return true;
        }
        return false;
    }

    /**
     * 威胁是否已在打远程／范围：先读它最近一次得手的攻击是不是非接触；刚打到人的贴身近战不算数。
     * 没有足够记忆时读当前画面——它正隔着身位攻击某个伙伴，也算已经发生的远程威胁。
     */
    function wideguardRangedThreat(context: WorldBehavior.Context, threat: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context), source = world.actor(threat.ref);
        if (source !== null) {
            const recent = DamageSemantics.recentAttack(world, source, 200);
            if (recent !== null) {
                if (!recent.contact) return true;
                if (world.tick() - recent.tick <= 40) return false;
            }
        }
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0 || other.ref === self.ref) continue;
            if (CompanionBehavior.distance(threat.point, other.point) <= 3) continue;
            if (threat.attacking === other.ref) return true;
            if (other.lastAttacker === threat.ref && other.hurtAgo < 100) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("wideguard", {
        protocols: ["world_combat:survive"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.guarded(context, self, "world_combat:move_wideguard")) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(capability, "trigger", 8)) return false;
            if (!wideguardRangedThreat(context, threat)) return false;
            if (CompanionBehavior.ai<boolean>(capability, "cover", true) && !wideguardAllyNear(context, 5)) return false;
            return true;
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"], self = CompanionBehavior.source(context);
            if (!threat) return 0;
            const distance = CompanionBehavior.distance(self.point, threat.point);
            return self.hurtAgo < 60 || distance <= 4 ? 100 : 60;
        }
    });
}
