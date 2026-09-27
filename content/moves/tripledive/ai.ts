/**
 * 三连钻 / tripledive 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 5）格内；更远交给共享接近逻辑。
 * 为什么选目标：三钻的价值在那一层「湿透」——已经带着共享身份 `world_combat:status/soaked`（或本来淋湿/泡水）的目标
 *   每一钻都吃 `soakBonus`，所以 `ai.drenchFirst`（默认开）下它排得更前；大体型更好接触、水花范围也更容易扫到，
 *   `ai.preferLarge`（默认开）再给一档分。出手前先看这一跳的落点有没有真实支撑、头顶留不留得下起跳高度（与招式同一套判据），
 *   悬空或低顶里不硬钻，避免连续空钻。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。
 * 放完之后：三钻落地自己收势，交回共享交战计划；带着冷却时不会重复起跳。
 */
namespace PokemonSkills {
    /** 这一跳的落点是否有真实支撑、头顶是否容得下起跳高度；与 skill.ts 的判定读同一套地面/方块事实。 */
    function triplediveLandable(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        try {
            const scope = { world: world, actor: world.source(), skill: skills["tripledive"], detail: { values: capability.data.config || {} } };
            const span = p("tripledive", "diveSpan", scope), leap = p("tripledive", "leap", scope);
            const height = typeof self.height === "number" ? self.height : 1.4;
            const feetY = self.point[1] - height / 2;
            const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2], length = Math.sqrt(dx * dx + dz * dz);
            if (length < 0.05) return true;
            const reach = Math.min(span, length);
            const tx = self.point[0] + dx / length * reach, tz = self.point[2] + dz / length * reach;
            if (SurfacePaths.support(world, WorldCombat.point(tx, feetY + 0.05, tz), 0.6, 10) === null) return false;
            const ceiling = WorldGeometry.blockHit(world, WorldCombat.point(self.point[0], feetY + 0.3, self.point[2]),
                WorldCombat.point(self.point[0], feetY + leap + 0.6, self.point[2]));
            return ceiling === null || ceiling.position().y() > feetY + leap * 0.6;
        } catch (error) { return true; }
    }

    CompanionBehavior.registerUse("tripledive", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = triplediveLandable(context, capability, target) ? 24 : 8;
            if (CompanionBehavior.ai<boolean>(capability, "drenchFirst", true)
                && (CompanionBehavior.status(context, target, "soaked") || target.wet === true)) score += 10;
            const bulk = (target.width === undefined ? 0.9 : target.width) * (target.height === undefined ? 1.4 : target.height);
            if (CompanionBehavior.ai<boolean>(capability, "preferLarge", true) && bulk >= 2.2) score += 8;
            return score;
        }
    });

    addPreferences("tripledive", {}, [
        field(pathOf("plunge"), "深潜", "boolean", {
            help: "开启：跳得更高、每钻重 20%、水花判定 ×1.2、湿身 ×1.25，但节拍 +2 刻、冷却 +6 刻——更痛但给对手更长窗口。关闭（连跳）：三钻更快、每钻轻 10%、循环更短，但水花更小、湿身更短。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不起跳，先走近。钻击距离很短，设大也常常够不到。"
        }),
        field(pathOf("ai.drenchFirst"), "优先打湿身", "boolean", {
            help: "开启：已经带着「湿透」的目标排得更前（每一钻都吃湿身加成）；关闭则所有目标同价。"
        }),
        field(pathOf("ai.preferLarge"), "优先大体型", "boolean", {
            help: "开启：身体体积较大的目标（更好接触、水花范围更易扫到）多一档分；关闭则只看湿身与距离。"
        })
    ]);
}
