/** Choose a reachable native ankle-box point; large target centres do not decide low-sweep reach. */
namespace PokemonSkills {
    function lowsweepPoint(context:WorldBehavior.Context,target:CompanionBehavior.Entity):number[]{
        const world=CompanionBehavior.world(context),actor=world.actor(target.ref),body=actor?world.observe(actor):null,self=CompanionBehavior.source(context);
        if(!body)return target.point;
        const min=body.boundsMin(),max=body.boundsMax(),y=self.point[1]-(self.height||1.4)/2+.2;
        return[Math.max(min.x(),Math.min(max.x(),self.point[0])),Math.max(min.y(),Math.min(max.y(),y)),Math.max(min.z(),Math.min(max.z(),self.point[2]))];
    }
    CompanionBehavior.registerUse("lowsweep", {
        protocols: ["world_combat:attack"],
        target:function(context,_item,target){const aim=JSON.parse(JSON.stringify(target));aim.point=lowsweepPoint(context,target);return aim;},
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, lowsweepPoint(context,target))
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, lowsweepPoint(context,target)) > capability.data.range) return 0;
            let score = 20;
            if (CompanionBehavior.ai<boolean>(capability, "cutRunners", true)) {
                const motion = CompanionBehavior.velocity(context, target);
                const pace = motion === null ? 0 : Math.sqrt(motion[0] * motion[0] + motion[1] * motion[1] + motion[2] * motion[2]);
                if (pace >= 0.16) score += 16;
                else if (pace >= 0.09) score += 8;
            }
            if (CompanionBehavior.status(context, target, "hobbled")) score -= 12;
            if (CompanionBehavior.ratio(target) <= 0.3) score += 8;
            return score;
        }
    });

    addPreferences("lowsweep", {}, [
        field(pathOf("whirl"), "旋身扫", "boolean", {
            help: "开启：扫击弧线更开、能把高速目标的腿别住更久，但单点更轻、收招与冷却更久。关闭：一记更快更重的小弧点切。"
        }),
        field(pathOf("ai.maxChase"), "贴身距离", "number", {
            min: 2, max: 12, step: 1,
            help: "对手进入这个距离内才考虑低扫；调大愿意主动贴上去，调小只在近身时出手。"
        }),
        field(pathOf("ai.cutRunners"), "先削跑得快的", "boolean", {
            help: "开启：目标正在快速移动时优先出手（掉速更深）；关闭：当普通近身候选排序。"
        })
    ]);
}
