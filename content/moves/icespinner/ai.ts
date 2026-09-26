/**
 * 冰旋 / icespinner —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活、**站在地上**，且在 `ai.maxChase`（默认 7）格内；够不到交给共享接近逻辑。
 *   它是一记贴地旋转冲撞，空中的对手不在候选里。
 * 对谁出手：`ai.clearTerrain`（默认开）打开时，身上带着任一场地身份（共享身份 world_combat:status/<场地名>，
 *   读法与其他状态一致）且冲刺路线可达的目标排最前——旋过去顺手把场地刮掉；路线被墙或窄缝挡住则退回普通近战排序。
 *   路线用只读世界入口 `CompanionBehavior.world(context)` 的 `freeSpace` 逐点探测，不凭空判定可达。
 * 够不到怎么办：reach 就是本招实际冲距，先走近。
 * 放完之后：交回共享交战计划；冲过的冰面与刮掉的场地都是它留下的结果。
 */
namespace PokemonSkills {
    const icespinnerTerrains = ["electricterrain", "grassyterrain", "mistyterrain", "psychicterrain"];

    function icespinnerOnTerrain(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        for (let i = 0; i < icespinnerTerrains.length; i++)
            if (CompanionBehavior.status(context, target, icespinnerTerrains[i])) return true;
        return false;
    }

    /** 沿自身→目标逐点用原生 freeSpace 探路；撞墙、窄缝或空档不足则路线不可达。 */
    function icespinnerRouteOpen(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const self = CompanionBehavior.source(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (!(length > 0.01)) return true;
        const reach = Math.max(2.0, Math.min(capability.data.range, length + 0.6));
        const width = self.width === undefined ? 0.9 : self.width;
        const height = self.height === undefined ? 1.4 : self.height;
        const stepX = dx / length, stepZ = dz / length;
        // 从自身体积之外起步采样，避免把自己的碰撞箱算成路障。
        const start = Math.max(1.2, width * 0.5 + 0.5);
        for (let d = start; d <= reach; d += 0.8) {
            const feet = CompanionBehavior.point([self.point[0] + stepX * d, self.point[1] - height / 2, self.point[2] + stepZ * d]);
            if (!world.freeSpace(feet, width, height)) return false;
        }
        return true;
    }

    function icespinnerWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible || target.grounded === false) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
    }

    CompanionBehavior.registerUse(icespinnerId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return icespinnerWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible && target.grounded !== false;
        },
        priority: function (context, capability, target) {
            if (!target || !icespinnerWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 16 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "clearTerrain", true) && icespinnerOnTerrain(context, target)
                && icespinnerRouteOpen(context, capability, target)) score += 22;
            return score + Math.round(CompanionBehavior.ratio(target) * 5);
        }
    });

    addPreferences(icespinnerId, { ai: { maxChase: 7, clearTerrain: true } }, [
        field(pathOf("slick"), "冰面", "boolean", {
            help: "开启：冲距 ×1.25、冲速 ×1.2、冰面存留 ×1.5、击退 ×0.7，滑得远、留得久；代价是本击 ×0.85。关闭（碎冰）：本击 ×1.15、刮除半径 ×1.3、击退 ×1.4，旋得更狠，代价是冲距 ×0.8、冰面存留 ×0.6、起手 +2 刻。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "目标离自己这么远以内才旋过去；调大愿意主动逼近更远的目标。"
        }),
        field(pathOf("ai.clearTerrain"), "优先刮场地", "boolean", {
            help: "开启：身上带着场地身份的目标优先，旋过去顺手把场地刮掉；关闭则只按普通近战排序。"
        })
    ]);
}
