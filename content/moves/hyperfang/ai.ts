/**
 * 必杀门牙 / hyperfang 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 6）格内；它是短近身招，够不到交给共享接近逻辑。
 * 排序：目标还没被甩懵时加分（第一次震慑最值），已经懵了就压低；`ai.press`（默认开）在目标正被钉住或压住时再加分，
 * 趁它动不了再补一口；目标已经很低时也略微抬价，当收尾用。
 * `ai.clearLine`（默认开）：甩向由招式配置的左／右偏好决定，AI 用本个体 `shove` 公式算出甩后真实落点与扫过的体积，
 *   只在队友真会被甩到（且中间没有墙挡下）时压低这招的优先级，等一个更干净的位置再出手；配置为「未知」时按配置本身使用。
 * `ai.press` 是玩家能预见的取舍：开启＝专挑动不了的目标补刀；关闭＝不追钉住的目标，当普通近身重咬排序。
 */
namespace PokemonSkills {
    /** 本次侧甩的实际总位移（与施放同一公式，含配置）。 */
    function hyperfangShove(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(0.08, p("hyperfang", "shove", {
                world: world, actor: world.source(), skill: skills["hyperfang"],
                detail: { values: capability.data.config } }));
        } catch (error) { return 0.3; }
    }

    /** 甩后真实落点：沿配置选定的同一侧平移，墙会把它挡在实际接触处。 */
    function hyperfangWhipPath(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): { start: CombatPoint; end: CombatPoint } | null {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const heading = Math.sqrt(dx * dx + dz * dz);
        if (!(heading > 1e-6)) return null;
        const side = capability.data.config && capability.data.config.side === "left" ? -1 : 1;
        const shove = hyperfangShove(context, capability);
        const start = CompanionBehavior.point(target.point);
        const end = start.plus(WorldCombat.point(-dz / heading * side * shove, 0, dx / heading * side * shove));
        const wall = WorldGeometry.blockHit(world, start, end);
        return { start: start, end: wall ? wall.position() : end };
    }

    /** 甩动扫过的体积里有没有队友：目标与队友的碰撞箱宽度都算进去，隔墙则不误扣。 */
    function hyperfangClears(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const path = hyperfangWhipPath(context, capability, target);
        if (path === null) return true;
        const self = CompanionBehavior.source(context);
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        const targetHalf = (target.width || 0.9) / 2;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (!other.friendly || !(other.health > 0) || other.ref === self.ref || other.ref === target.ref) continue;
            const half = targetHalf + (other.width || 0.9) / 2;
            const gap = WorldGeometry.closestOnSegment(CompanionBehavior.point(other.point), path.start, path.end)
                .minus(CompanionBehavior.point(other.point)).length();
            if (gap <= half) return false;
        }
        return true;
    }

    CompanionBehavior.registerUse("hyperfang", {
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
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let value = 22;
            if (!CompanionBehavior.status(context, target, "flinch")) value += 8;
            if (CompanionBehavior.ai<boolean>(capability, "press", true)
                && CompanionBehavior.effect(context, target, "world_combat:rooted")) value += 6;
            if (CompanionBehavior.ratio(target) <= 0.3) value += 4;
            // 按本次真实甩动扫过的体积与队友位置判断：严格沿选定侧，隔墙不算。
            if (CompanionBehavior.ai<boolean>(capability, "clearLine", true) && !hyperfangClears(context, capability, target)) value -= 10;
            return value;
        }
    });

    addPreferences("hyperfang", {}, [
        field(pathOf("shake"), "摆甩式", "boolean", {
            help: "开启：甩得更狠、钉得更久、畏缩几率更高，但单口威力 ×0.9、起手与冷却更长；关闭：钳咬式，单口威力 ×1.1、出手更快，但位移、钉住与畏缩都更小。"
        }),
        field(pathOf("side"), "甩出方向", "choice", {
            options: [{ value: "right", label: "向右" }, { value: "left", label: "向左" }],
            help: "咬住后固定在释放方向的这一侧甩出：向右或向左。同一方向连续使用不会再随机换边，方便把敌人让出队友的射线。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动扑咬，先走近；越大追得越执着。"
        }),
        field(pathOf("ai.press"), "压住目标", "boolean", {
            help: "开启：目标正被钉住时优先补一口；关闭：不特意追钉住的目标，当普通近身重咬排序。"
        }),
        field(pathOf("ai.clearLine"), "让出队友射线", "boolean", {
            help: "开启：按本个体实际甩动扫过的范围判断，若会把敌人甩到队友身上就压低这招，优先等一个更干净的位置；关闭：不检查队友位置，按普通重咬排序。"
        })
    ]);
}
