/**
 * 贝壳刃 / razorshell 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。
 * 身位（本招的关键）：壳刃只切**外缘刃带**里的身体，所以起手前用目标**原生身体盒边缘**（中心 ± 半宽）而不是中心
 * 去量：
 *   - 身体盒碰到刃带（inner..outer）：正常横扫，由共享接近走到出手距离；
 *   - 身体盒整体缩在内圈里：先用原生空域探针朝背离目标的方向找半步落脚点，`approach` 以 0.1 格容差返回该点，
 *     真正撤到刃带距离再横扫；连半步都放不下（被墙夹死）就在 `available` 里放弃这招，让更贴身的招或等待接手，
 *     而不是低分反复挥空。
 * `ai.crowd`（默认开）实际改变候选排序：开启时按**刃带的实际距离带**估人数——只有落在外缘刃厚那一圈的
 * 敌人才算进这一刀；挤着两个以上就把这招抬到优先，只有单个目标时按普通中近程斩击排序。关闭则不数人头，当单点招排。
 */
namespace PokemonSkills {
    /** 当前个体的新月刃带内/外半径；reach 与 edge 都不受 wide 影响，出手与 AI 用同一组。 */
    function razorshellBand(context: WorldBehavior.Context): { inner: number; outer: number } {
        const world = CompanionBehavior.world(context);
        const reach = p("razorshell", "reach", world);
        const edge = p("razorshell", "edge", world);
        return { inner: Math.max(0.3, reach - edge), outer: reach + edge * 0.5 };
    }

    /** 目标身体盒的半宽（缺省按中等体型 0.9）。 */
    function razorshellHalfWidth(target: CompanionBehavior.Entity): number {
        return (typeof target.width === "number" && target.width > 0 ? target.width : 0.9) * 0.5;
    }

    /** 施法者中心到目标中心的水平距离；刃带判断再按身体半宽折算成边缘。 */
    function razorshellGap(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const dx = self.point[0] - target.point[0], dz = self.point[2] - target.point[2];
        return Math.sqrt(dx * dx + dz * dz);
    }

    /** 目标身体盒整体缩在刃带内圈里：真实薄刃够不到它；大身体把边缘伸进刃带就不算在内。 */
    function razorshellInside(context: WorldBehavior.Context, target: CompanionBehavior.Entity, band: { inner: number; outer: number }): boolean {
        return razorshellGap(context, target) + razorshellHalfWidth(target) < band.inner;
    }

    /** 半步落脚容差：精确到 0.1 格，避免旧数组默认 1 格让小于一格的撤步立刻判到达。 */
    const razorshellStepWithin = 0.1;

    /**
     * 目标身体盒整体缩在内圈里时，朝背离目标的方向找半步落脚点，让它的边缘回到刃带；用原生 freeSpace 探真实可站空间，
     * 找不到返回 null。返回共享 Positioning，由 Tasks.perform 按 0.1 格容差走到位后才出手。
     */
    function razorshellStepBack(context: WorldBehavior.Context, target: CompanionBehavior.Entity): WorldMethods.Positioning | null {
        const world = CompanionBehavior.world(context);
        const self = CompanionBehavior.source(context);
        const width = typeof self.width === "number" && self.width > 0 ? self.width : 0.9;
        const height = typeof self.height === "number" && self.height > 0 ? self.height : 1.4;
        const reach = p("razorshell", "reach", world);
        const dx = self.point[0] - target.point[0], dz = self.point[2] - target.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1e-6) return null;
        const needed = Math.max(0.4, reach + 0.2 - length);
        for (let step = needed; step <= needed + 1.2; step += 0.3) {
            const spot = CompanionBehavior.point([
                self.point[0] + dx / length * step, self.point[1], self.point[2] + dz / length * step]);
            const feet = spot.minus(CompanionBehavior.point([0, height / 2, 0]));
            if (world.freeSpace(feet, width, height)) return { point: [spot.x(), spot.y(), spot.z()], within: razorshellStepWithin };
        }
        return null;
    }

    CompanionBehavior.registerUse("razorshell", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 6)) return false;
            // 身体盒整体缩在内圈里又撤不开：这刀只会从目标内侧掠过，先让别的招或等待接手。
            const band = razorshellBand(context);
            return !razorshellInside(context, target, band) || razorshellStepBack(context, target) !== null;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const world = CompanionBehavior.world(context);
            const band = razorshellBand(context);
            const gap = razorshellGap(context, target);
            if (gap - razorshellHalfWidth(target) > capability.data.range) return 0;
            // 身体盒整体缩在内圈里：approach 会小撤半步挣外缘身位，排得略低让更贴身的招先上。
            if (razorshellInside(context, target, band)) return 18;
            if (!CompanionBehavior.ai<boolean>(capability, "crowd", true)) return 22;
            // 以自身→候选目标为朝向，数一数真正让身体盒落进新月刃带的敌人。
            const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
            const heading = Math.sqrt(dx * dx + dz * dz) || 1;
            const ux = dx / heading, uz = dz / heading;
            const halfCos = Math.cos(p("razorshell", "arc", world) * Math.PI / 360);
            const nearby = context.facts.nearby as CompanionBehavior.Entity[];
            let inBand = 0;
            for (let index = 0; index < nearby.length; index++) {
                const other = nearby[index];
                if (other.friendly || !(other.health > 0)) continue;
                const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
                const distance = Math.sqrt(ox * ox + oz * oz);
                if (distance < 1e-6) continue;
                const half = razorshellHalfWidth(other);
                if (distance + half < band.inner || distance - half > band.outer) continue;
                if ((ox * ux + oz * uz) / distance < halfCos) continue;
                inBand++;
            }
            return inBand >= 2 ? 40 : 22;
        },
        approach: function (context, capability, target, reach) {
            if (!target) return null;
            const band = razorshellBand(context);
            if (!razorshellInside(context, target, band)) return null;
            const spot = razorshellStepBack(context, target);
            // 撤不开时先按兵不动，别在原地空扫；可行落点存在就走到它再横扫。
            return spot === null ? "wait" : spot;
        }
    });

    addPreferences("razorshell", {}, [
        field(pathOf("wide"), "揽月式", "boolean", {
            help: "开启：扫过的弧更宽、削甲几率更高、湿身更久、顶得更开，代价是单下威力 ×0.88、冷却 +6；关闭：凿刃式，弧收窄但单下威力 ×1.15、冷却更短、削甲几率略低，对单点更狠。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动横扫，先走近；越大追得越执着。被贴得比刃带内圈还近时，伙伴会先撤半步到刃带距离再横扫；撤不开就不在这一招上挥空。"
        }),
        field(pathOf("ai.crowd"), "横扫一群", "boolean", {
            help: "开启：身前新月刃带里挤着两个以上敌人时优先横扫，一次削一排护甲；关闭：不数人头，当普通中近程斩击排序。"
        })
    ]);
}
