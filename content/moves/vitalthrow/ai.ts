/**
 * 借力摔 / vitalthrow 的 AI 用途。
 *
 * 什么局面下出手：只对已经凑到近处（`ai.maxChase`，默认 6 格）的敌对目标列入候选；够不到交给共享接近逻辑。
 * priority 结合可抓体积（按目标真实碰撞箱最近点算够不够得到）、`ai.counter`（默认开：目标正朝自己压过来时抬高）
 * 与拒控（完全抗击退的目标甩不动，降意愿）；背向自己两格内被墙堵住时也只当压制用。
 *
 * 这招起手很长（「在对手之后出手」），所以 AI 只在对手已经进入抓握圈、或正压上来时才真正起手，避免空等。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("vitalthrow", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            var access = CompanionBehavior.world(context), me = CompanionBehavior.source(context).point, here = CompanionBehavior.point(me);
            var actor = access.actor(target.ref);
            // 可抓体积：按目标真实碰撞箱的最近点判断够不够得到，而不是只看身体中心。
            var closest = actor ? access.closestPoint(actor, here) : null;
            var gap = closest ? closest.minus(here).length() : CompanionBehavior.distance(me, target.point);
            var base = gap <= capability.data.range ? 22 : 2;
            var closing = false;
            var velocity = CompanionBehavior.velocity(context, target);
            if (velocity) {
                var toMe = [me[0] - target.point[0], me[2] - target.point[2]];
                var speed = Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
                var reach = Math.sqrt(toMe[0] * toMe[0] + toMe[1] * toMe[1]);
                if (speed > 0.02 && reach > 0.01) closing = (velocity[0] * toMe[0] + velocity[2] * toMe[1]) / (speed * reach) > 0.3;
            }
            if (CompanionBehavior.ai<boolean>(capability, "counter", true) && closing) base += 16;
            // 拒控：完全抗击退的目标甩不动，只算一记硬摔，降低意愿。
            var resistance = actor ? access.attributeValue(actor, "minecraft:generic.knockback_resistance") : null;
            if (resistance && resistance.value() >= 1) base -= 10;
            // 可投空间：背向使用者约两格内被墙堵住时，只当压制用。
            var away = [target.point[0] - me[0], target.point[2] - me[2]], span = Math.sqrt(away[0] * away[0] + away[1] * away[1]) || 1;
            var laneEnd = CompanionBehavior.point([target.point[0] + away[0] / span * 2, target.point[1], target.point[2] + away[1] / span * 2]);
            if (actor && !access.clear(CompanionBehavior.point(target.point), laneEnd)) base -= 4;
            return Math.max(0, base);
        }
    });

    addPreferences("vitalthrow", {}, [
        field(pathOf("bait"), "引手", "boolean", {
            help: "开启：架势多等 4 刻、抓握距离约 +15%、借力加成约 ×1.3、冷却多 6 刻，专门接扑击；关闭：快抓快摔，架势短、抓得近、加成小，用来处理已经贴脸的对手。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动摆架势，先走近。越大越愿意提前站定等人扑上来。"
        }),
        field(pathOf("ai.counter"), "只接扑击", "boolean", {
            help: "开启后，正朝自己压过来的目标优先（借力摔最值）；关闭则对任何近身目标一视同仁。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为贴近目标离开站位；关闭则只在原地足够近时出手。"
        })
    ]);
}
