/**
 * 淘金潮 / makeitrain 的伙伴 AI 用途。
 *
 * 什么局面有意义：一个以自身为中心、高威力但有自我特攻代价的大招。`ready` 要求身周可及范围内至少站着
 *   `ai.minFoes`（默认 2）个可见、敌对的敌人，否则整招不参与选择——一发会掏空自己的大招，只有值得时才放。
 *   面对单体 Boss，玩家可以把 `ai.minFoes` 调到 1。
 * 对谁出手：不需要选目标（绕身倾泻）；`accepts` 只筛阵营、存活与可见。
 * 什么时候最想出手：圈里人越多 priority 越高；它是清场手段，围得越紧越值。
 *   自身特攻已经被掏空时（例如刚倾过一次库），`ai.regain`（默认开）会明显收敛，不无脑再掏一次。
 * 低顶密室：`makeitrainReach` 按本个体真实拖曳弹道，沿八个方向逐段查真实方块，找实际能飞出的最大水平距离，
 *   而不是把覆盖半径简单乘 0.55；屋檐真的截住高弧时，可及圈随之缩短。
 * 够不到怎么办：reach 是实测覆盖半径，共享任务先把身位收进圈内再倾库。
 * 放完之后：交回共享交战计划；金币只落在真实接触点。
 */
namespace PokemonSkills {
    /** 低顶/屋檐会截住高弧：按本个体真实拖曳弹道逐段验墙，找实际能整段飞出的最大水平距离，作为可达覆盖半径。 */
    function makeitrainReach(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const values = { world: world, actor: world.source(), detail: { values: item.data.config } };
        const radius = Math.max(3.5, p("makeitrain", "radius", values));
        const fall = p("makeitrain", "fall", values);
        const gravity = Math.max(0.012, fall * 0.05);
        const apex = Math.max(1.5, radius * (1.0 - fall * 0.5));
        const vy = Math.sqrt(2 * gravity * apex);
        const arc = PokemonSkills.makeitrainFlight(vy, gravity);
        const height = typeof self.height === "number" ? self.height : 1.8;
        const from = CompanionBehavior.point(self.point).plus(WorldCombat.point(0, height * 0.25, 0));
        let reach = 0;
        for (let dir = 0; dir < 8; dir++) {
            const angle = dir * Math.PI / 4, dx = Math.cos(angle), dz = Math.sin(angle);
            for (let distance = Math.round(radius); distance >= 1; distance--) {
                const horizontal = distance / arc.decay;
                const points = LivingActions.ballisticPath(from, WorldCombat.point(dx * horizontal, vy, dz * horizontal), gravity, Math.round(arc.ticks));
                let clear = true;
                for (let i = 1; i < points.length && clear; i++)
                    if (WorldGeometry.blockHit(world, points[i - 1], points[i]) !== null) clear = false;
                if (clear) { reach = Math.max(reach, distance); break; }
            }
        }
        return Math.max(reach, 1.5);
    }

    function makeitrainFoes(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const radius = makeitrainReach(context, item);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0 || other.ref === String(context.actor)) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= radius) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("makeitrain", {
        protocols: ["world_combat:attack"],
        reach: function (context, item) { return makeitrainReach(context, item); },
        ready: function (context, item) {
            return item.data.ready !== false && makeitrainFoes(context, item) >= CompanionBehavior.ai<number>(item, "minFoes", 2);
        },
        available: function (context, item, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 7);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, item, target) { return target; },
        priority: function (context, item, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > makeitrainReach(context, item)) return 0;
            let score = 40 + Math.min(24, makeitrainFoes(context, item) * 10);
            if (CompanionBehavior.ai<boolean>(item, "regain", true)) {
                const dropped = Math.min(0, CompanionBehavior.stage(context, self, "spa"));
                score += dropped * 8;
            }
            return Math.max(1, Math.min(96, score));
        }
    });

    addPreferences("makeitrain", {}, [
        field(pathOf("hoard"), "倾库式", "boolean", {
            help: "开启：单束 ×1.12、覆盖半径 ×1.15、金雨束数 ×1.3，但自损特攻从 1 级升到 2 级、起手 +4 刻、冷却 +30 刻；关闭：常备金库，自损 1 级、范围与束数按基础值，回气更快。"
        }),
        field(pathOf("ai.minFoes"), "最少目标数", "number", {
            min: 1, max: 6, step: 1,
            help: "身周至少站着几个敌人才用这一发；越大越只在真正扎堆时才倾库，避免为一两个目标掏空自己。面对单体 Boss 可以调到 1。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动靠近，先在覆盖圈外待命；越大越愿意先走近再倾泻。"
        }),
        field(pathOf("ai.regain"), "耗后收敛", "boolean", {
            help: "开启：自身特攻已被掏空时（例如刚倾过一次库）明显降低再倾的优先级，避免不断为同一批目标反复自损；关闭则不顾当前特攻等级，只按圈里人数排序。"
        })
    ]);
}
