/**
 * 冰柱坠击 / iciclecrash 的伙伴 AI 用途。
 *
 * 什么局面下出手：中距离的单点重击，目标可见、敌对、还活着且在 `ai.maxChase`（默认 13）格内，
 * 落点上方有真实净空，并且按实际下落时间估计目标来不及整步走出碎裂半径。距离只决定能不能先手，不改变下落多快。
 * 高空式更慢更好躲，因此优先挑移动慢、或已被畏缩/睡眠等控制住的目标，让它们走不出落点。
 * `ai.opening`（默认「只对未畏缩目标」）让伙伴别把这一记砸在已经被别的招顶懵的人身上——畏缩会浪费；选「随时」就当普通攻击。
 * 够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    /** 本招公式的决策上下文：同一批读取复用世界、施法者与配置。 */
    function icicleCrashContext(context: WorldBehavior.Context, capability: WorldBehavior.Capability): FactContext {
        const world = CompanionBehavior.world(context);
        return { world: world, actor: world.source(), skill: skills["iciclecrash"], detail: { values: capability.data.config || {} } };
    }

    function icicleCrashLanding(context: WorldBehavior.Context, target: CompanionBehavior.Entity): CombatPoint | null {
        const world = CompanionBehavior.world(context), here = CompanionBehavior.point(target.point);
        const at = WorldGeometry.ground(world, WorldCombat.point(here.x(), here.y(), here.z()), 6);
        return SurfacePaths.support(world, at, 1, 2);
    }

    /** block-only 最低顶棚：整根冰柱半径范围内取最低真实方块格，实体不参与。 */
    function icicleCrashAiCeiling(world: CombatWorld, point: CombatPoint, wanted: CombatPoint, radius: number): number | null {
        const offsets = [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]];
        let ceiling: number | null = null;
        for (let i = 0; i < offsets.length; i++) {
            const clip = WorldGeometry.blockHit(world,
                point.plus(WorldCombat.point(offsets[i][0], 0.2, offsets[i][1])),
                wanted.plus(WorldCombat.point(offsets[i][0], 0, offsets[i][1])));
            if (clip && clip.blockPosition()) {
                const y = clip.blockPosition()!.y();
                if (ceiling === null || y < ceiling) ceiling = y;
            }
        }
        return ceiling;
    }

    /** 落点上方是否真的放得下这根冰块（block-only 净空，实体不参与）。 */
    function icicleCrashHasHeadroom(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const landing = icicleCrashLanding(context, target);
        if (!landing) return false;
        const world = CompanionBehavior.world(context), ctx = icicleCrashContext(context, capability);
        const drop = p("iciclecrash", "dropHeight", ctx), radius = p("iciclecrash", "icicleRadius", ctx);
        const wanted = landing.plus(WorldCombat.point(0, drop, 0));
        const ceiling = icicleCrashAiCeiling(world, landing, wanted, radius);
        return ceiling === null || (ceiling - 0.6) - landing.y() >= Math.max(0.8, radius * 2);
    }

    /** 按实际下落时间与当前水平速度，目标预计能走开多远。 */
    function icicleCrashEscape(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const ctx = icicleCrashContext(context, capability);
        const drop = p("iciclecrash", "dropHeight", ctx), fall = Math.max(0.1, drop / Math.max(0.05, p("iciclecrash", "fallSpeed", ctx)));
        const velocity = target.velocity;
        if (!velocity || velocity.length !== 3) return 0;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) * fall;
    }

    function icicleCrashControlled(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.status(context, target, "flinch") || CompanionBehavior.status(context, target, "sleep")
            || CompanionBehavior.status(context, target, "rooted") || CompanionBehavior.status(context, target, "tripped");
    }

    function icicleCrashWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 13)) return false;
        if (!icicleCrashHasHeadroom(context, item, target)) return false;
        const ctx = icicleCrashContext(context, item);
        const radius = p("iciclecrash", "crackRadius", ctx), escape = icicleCrashEscape(context, item, target);
        if (escape > radius * 1.1) return false;
        const tall = !!(item.data.config && item.data.config.tall === true);
        if (tall && escape > radius * 0.5 && !icicleCrashControlled(context, target)) return false;
        var opening = CompanionBehavior.ai<string>(item, "opening", "fresh");
        return opening !== "fresh" || !CompanionBehavior.status(context, target, "flinch");
    }

    CompanionBehavior.registerUse("iciclecrash", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return icicleCrashWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !icicleCrashWants(context, capability, target)) return 0;
            const ctx = icicleCrashContext(context, capability);
            const radius = p("iciclecrash", "crackRadius", ctx);
            let score = 22;
            if (icicleCrashEscape(context, capability, target) <= radius * 0.5) score += 6;
            if (icicleCrashControlled(context, target)) score += 4;
            return score;
        }
    });

    addPreferences("iciclecrash", {}, [
        field(pathOf("tall"), "高空坠柱", "boolean", {
            help: "开启：冰块从更高处落下，更重、波及更广，但准备更久、下落更慢，目标更容易走开。关闭：近距快落，更轻更窄，几乎躲不掉。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不主动落冰柱，先走近。越大越会在远处先手；距离只决定能不能先手，不改变冰块下落的速度，目标能否躲开仍由它自己的移动和落点净空决定。"
        }),
        field(pathOf("ai.opening"), "起手目标", "choice", {
            options: [
                { value: "fresh", label: "只对未畏缩目标" },
                { value: "always", label: "随时" }
            ],
            help: "只对未畏缩目标：跳过已经被别的招顶懵的人，把这一记留给还能被砸懵的目标。随时：把它当普通攻击，不挑目标状态。"
        })
    ]);
}
