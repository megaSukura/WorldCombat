/**
 * 祈愿 的伙伴 AI：愿星延迟兑现，所以要在还撑得住的时候提前许下，并替队友选一块站得住的落点。
 *
 * 何时考虑：自身或可帮助的队友生命低于 ai.healBelow（默认 0.7）时，比睡觉与回复指令更早动用。
 * 落在哪：把落点放在需要救助者脚下那块地面上，队友留在原地就能接到；共享接近会把身位收到施放距离以内。
 * 危亡例外：目标生命低于 ai.emergencyBelow（默认 0.25）时把这招优先级压到最低，让更直接的治疗先出手——
 *   愿星太慢，救不了马上就要倒下的人。
 * 配置：share 与 helpFriends 决定兑现时是否治疗圈内伙伴；施法者自己始终是圈内候选之一。
 */
namespace CompanionBehavior {
    const wishHealBelow = PokemonSkills.number("ai.healBelow", "祈愿阈值", 0.3, 0.9, 0.05);
    wishHealBelow.help = "伙伴自身或目标生命低于该比例时就提前许愿；调低更倾向硬撑，调高则一受伤就兑现一张延迟治疗。";
    const wishEmergencyBelow = PokemonSkills.number("ai.emergencyBelow", "危亡阈值", 0.05, 0.4, 0.05);
    wishEmergencyBelow.help = "目标生命低于该比例时不再优先祈愿，把机会让给更直接的治疗；调高会让这招在残血时更早退出。";

    PokemonSkills.addPreferences("wish", { share: true, helpFriends: true, ai: { healBelow: 0.7, emergencyBelow: 0.25 } }, [wishHealBelow, wishEmergencyBelow]);

    /** 队友脚下那块可站的地面；找不到就放弃这次落点。 */
    function wishLanding(context: WorldBehavior.Context, target: Entity): number[] | null {
        var world = CompanionBehavior.world(context);
        var spot = PokemonSkills.wishSpot(world, CompanionBehavior.point(target.point));
        return spot === null ? null : [spot.x(), spot.y(), spot.z()];
    }

    registerUse("wish", {
        protocols: ["world_combat:heal"],
        reach: function (_context, item) { return item.data.range; },
        ready: function () { return true; },
        available: function (context, item, _purpose, target) {
            var patient = target || source(context);
            return ratio(patient) < ai<number>(item, "healBelow", 0.7);
        },
        priority: function (context, item, target) {
            var patient = target || source(context);
            return ratio(patient) < ai<number>(item, "emergencyBelow", 0.25) ? -10 : 20;
        },
        accepts: function (_context, _item, target) { return !!target && target.health > 0; },
        target: function (context, _item, target) {
            var landing = wishLanding(context, target || source(context));
            if (!landing) return null;
            var copy: Entity = JSON.parse(JSON.stringify(target || source(context)));
            copy.point = landing;
            return copy;
        }
    });
}
