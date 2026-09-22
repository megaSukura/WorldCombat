/**
 * 借力摔 / vitalthrow 的 AI 用途。
 *
 * 什么局面下出手：只对已经凑到近处（`ai.maxChase`，默认 6 格）的敌对目标列入候选；够不到交给共享接近逻辑。
 * `ai.counter`（默认开）：目标正朝自己压过来（速度朝向施法者）时抬高 priority——后发摔就是用来接扑击的；
 * 关闭后对任何近身目标都可当普通摔技使用。
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
            var me = CompanionBehavior.source(context).point;
            var closing = false;
            var velocity = CompanionBehavior.velocity(context, target);
            if (velocity) {
                var toMe = [me[0] - target.point[0], me[2] - target.point[2]];
                var speed = Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
                var reach = Math.sqrt(toMe[0] * toMe[0] + toMe[1] * toMe[1]);
                if (speed > 0.02 && reach > 0.01) closing = (velocity[0] * toMe[0] + velocity[2] * toMe[1]) / (speed * reach) > 0.3;
            }
            var base = CompanionBehavior.distance(me, target.point) <= capability.data.range ? 22 : 2;
            if (!CompanionBehavior.ai<boolean>(capability, "counter", true)) return base;
            return closing ? base + 16 : base;
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
