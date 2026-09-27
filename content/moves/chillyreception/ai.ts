/**
 * 冷笑话 / chillyreception 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 12）格内，自己身上还没有挂着这招留下的雪（不连发）。
 * 什么时候最想出手：队伍里**有合法后备**、且生命掉到 `ai.retreatBelow`（默认 50%）以下、或身边挤着
 *   两个以上敌人时，priority 抬到 82——正是该把场子交出去的时候；有后备的其余情况 38，当作留雪的布置。
 *   没有后备时只在生命偏低、且**背离威胁的退路真的逐段有支撑**（原生 collider 采样）时才考虑，priority 60；
 *   退路被墙堵死或身位安全就不出手。放完由新上场的伙伴接管，交回共用交战计划。
 * 所有半径与退路都读本个体当前配置算出的真实参数，不硬编码半径或步长。
 */
namespace CompanionBehavior {
    const chillyChase = PokemonSkills.number("ai.maxChase", "开讲距离", 2, 20, 1);
    chillyChase.help = "伙伴只在威胁离自己这么远以内时才考虑冷笑话；调小只在贴身时开讲，调大愿意提前清场。";
    const chillyRetreat = PokemonSkills.number("ai.retreatBelow", "退场阈值", 0.1, 0.8, 0.05);
    chillyRetreat.help = "生命低于这个比例时优先讲冷笑话脱身；调高更早退场，调低更常留场战斗。";

    PokemonSkills.addPreferences("chillyreception", { ai: { maxChase: 12, retreatBelow: 0.5, leaveStation: false } },
        [chillyChase, chillyRetreat, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    /** 本个体当前配置（含重梗取舍）算出的真实参数，供距离与退路判断使用。 */
    function chillyParam(context: WorldBehavior.Context, item: WorldBehavior.Capability, key: string): number {
        return PokemonSkills.p("chillyreception", key, {
            world: world(context), actor: world(context).source(),
            skill: PokemonSkills.skills["chillyreception"], detail: { values: item.data.config }
        });
    }
    function chillyCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:cover", source(context));
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "chillyreception") return items[i];
        return null;
    }
    function chillyFlatDistance(a: number[], b: number[]): number {
        const dx = a[0] - b[0], dz = a[2] - b[2];
        return Math.sqrt(dx * dx + dz * dz);
    }
    /** 冷场半径内看得见、还活着的非友方数量。 */
    function chillyCrowd(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = source(context), radius = chillyParam(context, item, "silenceRadius");
        return (context.facts.nearby as Entity[]).filter(function (other) {
            return other.health > 0 && other.visible && !other.friendly && chillyFlatDistance(other.point, self.point) <= radius;
        }).length;
    }
    /** 队伍里还有能上场的合法后备：有后备时这招是真正的交接，价值最高。 */
    function chillyReserve(context: WorldBehavior.Context): boolean {
        const access = world(context);
        const actor = access.actor(source(context).ref);
        if (actor === null) return false;
        const roster = PokemonSkills.partyRoster(access, actor);
        return roster.length > 0 && PokemonSkills.partyReserve(roster, PokemonSkills.partyActiveId(access, actor)) !== null;
    }
    /**
     * 背离威胁的退路能真实走多远（格）：按本次 withdraw 预算，用原生 collider 逐段查支撑与走廊，
     * 墙后或断崖一步都不算。0 表示第一步就被堵住。
     */
    function chillyExitClear(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): number {
        const access = world(context), self = source(context);
        const dx = self.point[0] - threat.point[0], dz = self.point[2] - threat.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return 0;
        const heading = WorldCombat.point(dx / length, 0, dz / length);
        const size = { width: typeof self.width === "number" ? self.width : 0.9, height: typeof self.height === "number" ? self.height : 1.4 };
        const feet = WorldCombat.point(self.point[0], self.point[1] - size.height / 2, self.point[2]);
        const step = SurfacePaths.advance(access, feet, heading, chillyParam(context, item, "withdraw"),
            { up: 1, down: 1, spacing: 0.5, samples: 40 });
        return step.travelled;
    }
    function chillyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (context.facts.mounted) return false;
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        const self = source(context);
        if (status(context, self, "snow")) return false;
        return distance(self.point, threat.point) <= ai<number>(item, "maxChase", 12);
    }

    registerUse("chillyreception", {
        protocols: ["world_combat:cover"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, item, target) {
            const threat: Entity | null = target || context.senses["world_combat:threat"];
            if (!threat || !chillyWants(context, item, threat)) return 0;
            const self = source(context);
            const reserve = chillyReserve(context);
            const low = ratio(self) < ai<number>(item, "retreatBelow", 0.5);
            if (!reserve) {
                // 没有后备：只在生命偏低、退路真的站得住时考虑，退场不换人。
                return low && chillyExitClear(context, item, threat) >= 1 ? 60 : 0;
            }
            if (low || chillyCrowd(context, item) >= 2) return 82;
            return 38;
        },
        available: function (context, item, _purpose, _target) { return chillyWants(context, item, context.senses["world_combat:threat"]); },
        accepts: function (context, _item, target) { return target.ref === source(context).ref; }
    });
}
