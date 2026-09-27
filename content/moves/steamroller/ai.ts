/**
 * 疯狂滚压 / steamroller 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在自己 `ai.maxChase`（默认 7）格以内；更远交给共享接近逻辑。
 * 它一次能沿纵向队列碾过一整排，所以 `ai.preferRow`（默认开）按施法者→目标这条真实走廊里排着的敌人个数加权，
 * 并按出口是否被墙截住扣分——代价是可能为了碾一排而放过眼前真正的威胁；关闭则只按威胁本身选目标。
 * 宽碾式半径更大，更容易一次压到并排的人。贴地滚只碾得到贴着地面的人，腾空/飞行的目标会明显降权。
 * 放完之后：滚到哪算哪，接着交给共享顺序决定追打还是换招。
 */
namespace PokemonSkills {
    /** 沿施法者→目标这条走廊、用真实身体箱胶囊数一数能排着碾到的非友方（含目标）个数。 */
    function steamrollerRow(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const at = CompanionBehavior.point(self.point), goal = CompanionBehavior.point(target.point);
        const heading = WorldGeometry.flatUnit(goal.minus(at), CompanionBehavior.point([0, 0, 1]));
        const reach = Math.max(1.5, typeof capability.data.range === "number" ? capability.data.range : 4);
        let row = 0;
        WorldGeometry.selectBodies(world, WorldGeometry.bodySegment(at, at.plus(heading.scale(reach)), 0.9),
            function (other: CombatActor, facts: CombatObservation) {
                if (facts.friendly() || String(other.ref()) === String(self.ref)) return;
                if (!world.clear(at, facts.position())) return;
                row++;
            });
        return row;
    }

    CompanionBehavior.registerUse(steamrollerId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 20;
            // 贴着地面滚的人最容易被碾到；腾空/飞的威胁降权，不值得为一记空滚挤掉别的招。
            if (target.grounded === false) score -= 12;
            if (CompanionBehavior.ai<boolean>(capability, "preferRow", true)) {
                const row = steamrollerRow(context, capability, target);
                if (row >= 2) score += Math.min(24, 8 + row * 4);
                // 出口被墙截住、或滚到尽头是断崖，就等于半路收势，碾不到队列末端，降权。
                const world = CompanionBehavior.world(context), at = CompanionBehavior.point(self.point);
                const heading = WorldGeometry.flatUnit(CompanionBehavior.point(target.point).minus(at), CompanionBehavior.point([0, 0, 1]));
                const reach = Math.max(1.5, typeof capability.data.range === "number" ? capability.data.range : 4);
                const exit = at.plus(heading.scale(reach));
                if (WorldGeometry.blockHit(world, at, exit) !== null) score -= 8;
                if (WorldGeometry.ground(world, at, 3).y() - WorldGeometry.ground(world, exit, 3).y() > 1.4) score -= 6;
            }
            if (CompanionBehavior.status(context, target, "flinch")) score += 2;
            return Math.max(0, score);
        }
    });

    addPreferences(steamrollerId, {}, [
        field(pathOf("wide"), "宽碾式", "boolean", {
            help: "开启：碾压半宽 ×1.25、推挤更远、压痕更长，更容易一次罩住并排的人；代价是滚动距离 ×0.9、速度 ×0.88、单发 ×0.94、冷却 +6 刻。关闭（默认）：疾滚式，滚得远、滚得快、单发更重，碾压面较窄。"
        }),
        field(pathOf("ai.maxChase"), "滚压距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就先走近。疯狂滚压滚得不远，设大也常常够不到。"
        }),
        field(pathOf("ai.preferRow"), "优先碾一排", "boolean", {
            help: "开启（默认）：施法者→目标这条走廊里排着别人时优先滚过去（按真实身体箱与通视计数，出口被墙截住则降权），一发压到多个；关闭：不为了排队而放过眼前的敌人，只按威胁本身选目标。"
        })
    ]);
}
