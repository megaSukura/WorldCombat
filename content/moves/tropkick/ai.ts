/**
 * 热带踢 / tropkick 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 6）格内；它是本组出手最快的一脚，贴身就该用。
 * 对谁出手：单个敌人；`ai.finish`（默认开）打开时残血目标排前，用最快的一脚收掉；更偏重当下的物理威胁——
 *   正在攻击自己或主人的目标优先卸力。
 * 收脚安全：踢实会往后撤半步收脚，所以从**预计的接触停点**沿反方向探一条有限地面路径；路径被墙挡、没有落脚
 *   支撑（悬崖边、岩浆上）或落点放不下身子时降低推荐，不往危险处退。目标被踢不动也无所谓——这一脚不推动对手，
 *   Boss 未必要被移动。
 * 够不到怎么办：reach 就是本招实际射程（踢进距离 + 余量）；够不到交给共享接近逻辑，先垫步进去。
 * 放完之后：被压低攻击的目标交回共享交战计划，自己已后撤收步。
 */
namespace PokemonSkills {
    function tropkickWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    /** 后撤半步的落点能否容身：从预计的接触停点沿反方向扫一条有限地面路径，查通行与落脚支撑；同一决策帧内缓存。 */
    function tropkickSafeRetreat(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.observedFlag(context, "tropkick:retreat:" + target.ref, function () {
            const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            const width = typeof self.width === "number" && self.width > 0 ? self.width : 0.9;
            const height = typeof self.height === "number" && self.height > 0 ? self.height : 1.4;
            const detail = { values: capability.data.config || {} };
            const retreat = Math.max(0.3, PokemonSkills.p("tropkick", "retreat", { world: world, actor: world.source(), detail: detail }));
            const lunge = Math.max(1.2, PokemonSkills.p("tropkick", "lunge", { world: world, actor: world.source(), detail: detail }));
            const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
            const length = Math.sqrt(dx * dx + dz * dz);
            const ux = length > 0.01 ? dx / length : 0, uz = length > 0.01 ? dz / length : 0;
            // 预计踢进到首个接触处的停点：不越过目标身体，再减掉双方的半身厚度；后撤从这个停点起算。
            const stop = Math.max(0, Math.min(lunge, length - (width / 2 + 0.5)));
            const feet = CompanionBehavior.point([self.point[0] + ux * stop, self.point[1] - height / 2, self.point[2] + uz * stop]);
            const back = CompanionBehavior.point([-ux, 0, -uz]);
            const step = SurfacePaths.advance(world, feet, back, retreat, { up: Math.max(0.4, height * 0.5), down: 0.6, spacing: 0.25, samples: 12 });
            return !step.ended && step.travelled >= retreat - 0.05 && world.freeSpace(step.point, width, height);
        });
    }

    CompanionBehavior.registerUse("tropkick", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return tropkickWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !tropkickWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 26 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true)) score += Math.round((1 - CompanionBehavior.ratio(target)) * 8);
            // 更偏重当下的物理威胁：正在攻击自己或主人的目标优先卸力。
            const owner = context.facts.owner;
            if (target.attacking === self.ref || !!owner && target.attacking === owner.ref) score += 10;
            if (!tropkickSafeRetreat(context, capability, target)) score -= 14;
            return score;
        }
    });

    addPreferences("tropkick", {}, [
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "目标进入这个距离内才主动起脚；越大越早踢，也越可能在垫步到位前扑空。"
        }),
        field(pathOf("ai.finish"), "残血补刀", "boolean", {
            help: "开启：目标生命比例越低排得越前，用最快的一脚收掉；关闭则只按普通近战排序。"
        })
    ]);
}
