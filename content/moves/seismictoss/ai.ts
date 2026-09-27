/**
 * 地球上投 / seismictoss 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、活着、中间无遮挡，且在 `ai.maxChase` 之内。伤害只认自己的等级、
 * 不看对手防御，所以按"这一记能打掉目标多少条命"排序；`ai.finish`（默认开）在可一击收掉或削去大半时抬到优先，
 * 抢在别的输出前兑现，对高防目标尤其值得。它是接触抓取，会被墙挡住抓不到，accepts 与 priority 都先验身体之间的视线；
 * 够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("seismictoss", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, capability, target) {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            const world = CompanionBehavior.world(context);
            return world.clear(CompanionBehavior.point(CompanionBehavior.source(context).point), CompanionBehavior.point(target.point));
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const world = CompanionBehavior.world(context), self = world.source();
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            if (!world.clear(CompanionBehavior.point(CompanionBehavior.source(context).point), CompanionBehavior.point(target.point))) return 0;
            // Fixed level damage ignores the target's defence, so rank by the actual life this throw would remove.
            const damage = p("seismictoss", "damage", { world: world, actor: self, skill: skills["seismictoss"], detail: { values: capability.data.config } });
            const share = damage / Math.max(1, target.health);
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && share >= 1) return 92;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && share >= 0.5) return 55;
            return 28;
        }
    });

    addPreferences("seismictoss", {}, [
        field(pathOf("slam"), "砸地式", "boolean", {
            help: "开启：甩得更短更陡，落地把对手钉住一会儿；关闭：抛得更远、方向更平，用来把对手扔离掩体，但不钉人。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动抓取，先走近；抓取会被墙挡住，贴身更稳。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命偏低时优先用这一记固定伤害收掉；关闭：只按普通近身候选排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为抓取离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
