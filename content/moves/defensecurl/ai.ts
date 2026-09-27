/**
 * 变圆 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁且在 ai.maxChase 内、且这个球滚出去的方向真的落得住时先卷成球。
 * 什么时候最想出手：威胁贴到 ai.close 以内（马上要挨打）或血量掉到 ai.panic 以下时 priority 100，
 *   抢在共享次序前；只是有威胁时退回 50。它是本族里最便宜的防守起手。
 * 滚向的取舍：只按已经选定的滚向判断——顺势滚开时，落点要落在有支撑、能站住、且不落进敌群的地面；
 *   通向落差、悬崖或被墙堵死的方向不反复选，避免卷了球却滚不动。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：防御等级已写进公共能力阶梯，卷球窗口内不再重复；窗口走完才重新考虑。
 */
namespace PokemonSkills {
    /** 本决策帧内复用的一次地形判断：这条滚向的落点是不是真的落得住。 */
    function defenseCurlRollViable(context: WorldBehavior.Context, capability: WorldBehavior.Capability,
        self: CompanionBehavior.Entity, threat: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.observedFlag(context, "defensecurl:roll-viable", function () {
            try {
                const world = CompanionBehavior.world(context);
                const distance = Math.max(0.4, p("defensecurl", "roll",
                    { world: world, actor: world.source(), skill: skills["defensecurl"], detail: { values: capability.data.config } }));
                const counter = Number(capability.data.config && capability.data.config.counter) === 1;
                const dx = threat.point[0] - self.point[0], dz = threat.point[2] - self.point[2];
                const length = Math.sqrt(dx * dx + dz * dz);
                if (length < 0.05) return true;
                const dir = counter ? [dx / length, dz / length] : [-dx / length, -dz / length];
                const height = Math.max(0.4, self.height || 1.4), width = Math.max(0.4, self.width || 0.9);
                const feetY = self.point[1] - height / 2;
                const landing = WorldCombat.point(self.point[0] + dir[0] * distance, feetY, self.point[2] + dir[1] * distance);
                const floor = WorldGeometry.blockHit(world, landing.plus(WorldCombat.point(0, 0.1, 0)), landing.minus(WorldCombat.point(0, 4, 0)));
                if (floor === null) return false;
                if (feetY - floor.position().y() > 3) return false;
                if (!world.freeSpace(WorldCombat.point(landing.x(), floor.position().y() + 0.05, landing.z()), width, height)) return false;
                if (!counter) {
                    const nearby = context.facts.nearby || [];
                    for (let i = 0; i < nearby.length; i++) {
                        const other = nearby[i];
                        if (!other || other.friendly || !other.visible || !(other.health > 0)) continue;
                        const ox = other.point[0] - landing.x(), oy = other.point[1] - landing.y(), oz = other.point[2] - landing.z();
                        if (Math.sqrt(ox * ox + oy * oy + oz * oz) <= Math.max(1.5, distance)) return false;
                    }
                }
                return true;
            } catch (error) { return true; }
        });
    }

    CompanionBehavior.registerUse("defensecurl", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "defensecurl")) return false;
            if (!threat) return false;
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(capability, "maxChase", 10)) return false;
            return defenseCurlRollViable(context, capability, self, threat);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, threat.point);
            const panic = CompanionBehavior.ai<number>(capability, "panic", 0.6);
            if (CompanionBehavior.ratio(self) < panic || gap <= CompanionBehavior.ai<number>(capability, "close", 3)) return 100;
            return 50;
        }
    });

    addPreferences("defensecurl", {}, [
        field(pathOf("ai.maxChase"), "卷球距离", "number", {
            min: 2, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑卷成球；越大越早准备。"
        }),
        field(pathOf("ai.close"), "贴身距离", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁贴到这么近时优先卷成球（马上要挨打了）；越大越早抢在挨打前卷。"
        }),
        field(pathOf("ai.panic"), "紧急血量", "number", {
            min: 0.2, max: 0.9, step: 0.05,
            help: "血量比例低于这个值时抢在共享次序前卷成球；调高更早进入防守姿态，调低只在濒危时才卷。"
        })
    ]);
}
