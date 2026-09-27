/**
 * 祈愿 的伙伴 AI：愿星延迟兑现，所以要在还撑得住的时候提前许下，并替队友选一块站得住的落点。
 *
 * 何时考虑：自身或可帮助的队友生命低于 ai.healBelow（默认 0.7）时，比睡觉与回复指令更早动用。
 * 落在哪：把落点放在需要救助者脚下那块真实地面上，队友留在原地就能接到；共享接近会把身位收到施放距离以内。
 * 分享关闭时只服务本人：即使候选里有残血伙伴也不替他落点（分享关闭时那颗愿星不会治疗伙伴）。
 * 评分：按 delay 内预计停留给分——跑动的目标可能走出落点圈，扣分；站定的目标更可能接到，加分。
 *   同一片落点已经有自己一颗待落愿星时不重复堆叠；危亡（ai.emergencyBelow）时把优先级压到最低，让即时治疗先出手。
 * 配置：share 与 helpFriends 决定兑现时是否治疗圈内伙伴；施法者自己始终是圈内候选之一。
 */
namespace CompanionBehavior {
    const wishHealBelow = PokemonSkills.number("ai.healBelow", "祈愿阈值", 0.3, 0.9, 0.05);
    wishHealBelow.help = "伙伴自身或目标生命低于该比例时就提前许愿；调低更倾向硬撑，调高则一受伤就兑现一张延迟治疗。";
    const wishEmergencyBelow = PokemonSkills.number("ai.emergencyBelow", "危亡阈值", 0.05, 0.4, 0.05);
    wishEmergencyBelow.help = "目标生命低于该比例时不再优先祈愿，把机会让给更直接的治疗；调高会让这招在残血时更早退出。";

    PokemonSkills.addPreferences("wish", { share: true, helpFriends: true, ai: { healBelow: 0.7, emergencyBelow: 0.25 } }, [wishHealBelow, wishEmergencyBelow]);

    function wishShares(item: WorldBehavior.Capability): boolean {
        var config = item.data && item.data.config;
        return !!(config && config.share === true);
    }
    function wishSelf(context: WorldBehavior.Context): Entity { return source(context); }
    function wishSame(first: Entity, second: Entity): boolean { return String(first.ref) === String(second.ref); }

    /** 队友脚下那块可站的地面；找不到就放弃这次落点。 */
    function wishLanding(context: WorldBehavior.Context, target: Entity): number[] | null {
        var world = CompanionBehavior.world(context);
        var spot = PokemonSkills.wishSpot(world, CompanionBehavior.point(target.point));
        return spot === null ? null : [spot.x(), spot.y(), spot.z()];
    }

    /** delay 内是否大概率还留在落点：水平几乎不动才算站得住。 */
    function wishStays(context: WorldBehavior.Context, target: Entity): boolean {
        var velocity = target.velocity;
        if (!velocity) return true;
        var vx = Number(velocity[0] || 0), vz = Number(velocity[2] || 0);
        return Math.sqrt(vx * vx + vz * vz) < 0.04;
    }

    /** 同一片落点附近是否已经有自己一颗待落愿星：有就不再堆叠。 */
    function wishPending(context: WorldBehavior.Context, landing: number[]): boolean {
        var world = CompanionBehavior.world(context), own = String(wishSelf(context).ref);
        var views: readonly CombatEffectView[];
        try { views = world.effectsOfType(PokemonSkills.wishStarBrain); } catch (error) { return false; }
        for (var index = 0; index < views.length; index++) {
            var state: any;
            try { state = JSON.parse(String(views[index].data())); } catch (error) { continue; }
            if (String(state.owner) !== own || !Array.isArray(state.ground)) continue;
            if (CompanionBehavior.distance(state.ground, landing) <= 2.0) return true;
        }
        return false;
    }

    registerUse("wish", {
        protocols: ["world_combat:heal"],
        reach: function (_context, item) { return item.data.range; },
        ready: function () { return true; },
        available: function (context, item, _purpose, target) {
            var self = wishSelf(context), patient = target || self;
            if (!wishShares(item) && !wishSame(patient, self)) return false;
            return ratio(patient) < ai<number>(item, "healBelow", 0.7);
        },
        priority: function (context, item, target) {
            var self = wishSelf(context), patient = target || self;
            if (ratio(patient) < ai<number>(item, "emergencyBelow", 0.25)) return -10;
            var value = 20, landing = wishLanding(context, patient);
            if (landing !== null) {
                value += wishStays(context, patient) ? 6 : -4;
                if (wishPending(context, landing)) value -= 14;
            }
            return value;
        },
        accepts: function (_context, _item, target) { return !!target && target.health > 0; },
        target: function (context, item, target) {
            var self = wishSelf(context), patient = wishShares(item) ? (target || self) : self;
            var landing = wishLanding(context, patient);
            if (!landing) return null;
            var copy: Entity = JSON.parse(JSON.stringify(patient));
            copy.point = landing;
            return copy;
        }
    });
}
