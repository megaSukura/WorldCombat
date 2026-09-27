/**
 * 双翼 / dualwingbeat —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带双翼的伙伴把它当**前后两拍近身连击**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 12）以内就出手；更远交给共享接近逻辑。它靠 `reach` 判断要不要先贴近，所以
 *   悬停式会在更远处先手，俯冲式会先走到贴身再冲。
 * 低顶判断：第二拍会把身位向后上方掀起。出手前用只读世界 `CompanionBehavior.world(context).freeSpace`
 *   以脚底探针探一下自身正上方 `rise` 格是否放得下这具身体；顶棚压得太低时不在原地盲升，改走普通接近或换招。
 * 前后有敌：身前与身后（沿自身→目标方向的前后）都还站着别的敌人时，两翼前下/后上两拍更容易各拍到一个，排序提前。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。`ai.finishLow`（默认关）打开时残血目标
 *   排得更前，用这两拍收尾。
 * 放完之后：两拍各自结算、方向相反，伙伴交回共享顺序。
 * 优先级：基础 22（在射程内）／6（还要先走近）；两侧都有敌 +8；`ai.finishLow` 开启且目标生命低于四成时 +12。
 */
namespace CompanionBehavior {
    function dualwingbeatWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 12);
    }

    /** 后上方还有没有掀起第二拍的空间；探针不可用时保持中性（不因此排除本招）。 */
    function dualwingbeatHeadroom(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        const world = CompanionBehavior.world(context);
        if (!world || typeof (world as any).freeSpace !== "function") return true;
        const self = source(context);
        try {
            // 本招的拉升由公式给出：让探针读与执行同一份参数。
            const rise = PokemonSkills.p("dualwingbeat", "rise",
                { world: world, actor: world.source(), skill: PokemonSkills.skills["dualwingbeat"], detail: { values: item.data.config } });
            const height = typeof self.height === "number" && self.height > 0 ? self.height : 1.4;
            // freeSpace 的探针点是脚底中心，不是身体中心：从脚底再抬升 rise。
            const feet = self.point[1] - height / 2;
            const probe = CompanionBehavior.point([self.point[0], feet + Math.max(0.4, rise), self.point[2]]);
            return world.freeSpace(probe, typeof self.width === "number" && self.width > 0 ? self.width : 0.9, height);
        } catch (error) { return true; }
    }

    /** 前后是否各还站着别的敌人：两翼是前下/后上两拍，前后都有人时更容易各照顾一个。 */
    function dualwingbeatTwoSided(context: WorldBehavior.Context, target: Entity): boolean {
        const self = source(context), nearby = (context.facts.nearby || []) as Entity[];
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2], length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return false;
        const forwardX = dx / length, forwardZ = dz / length;
        let front = false, back = false;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
            if (distance(other.point, self.point) > 4) continue;
            const along = (other.point[0] - self.point[0]) * forwardX + (other.point[2] - self.point[2]) * forwardZ;
            if (along > 0.4) front = true; else if (along < -0.4) back = true;
        }
        return front && back;
    }

    registerUse("dualwingbeat", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!dualwingbeatHeadroom(context, item)) return false;
            if (!target) return true;
            return dualwingbeatWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !dualwingbeatWants(context, item, target)) return 0;
            const distance = CompanionBehavior.distance(source(context).point, target.point);
            if (distance > item.data.range) return 6;
            let score = 22;
            if (dualwingbeatTwoSided(context, target)) score += 8;
            if (ai<boolean>(item, "finishLow", false) && ratio(target) < 0.4) score += 12;
            return score;
        }
    });

    PokemonSkills.addPreferences("dualwingbeat", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("dive"), "俯冲形态", "boolean", {
            help: "开启（俯冲）：先冲进贴身、两只翅膀各拍一下都是接触，每拍威力 ×1.15、间隔更短；代价是射程降到约 3.2 格、把身位交出去，起手多一次下潜。关闭（悬停）：隔空拍出风压，射程约 5.6 格、更安全，但每拍 ×0.9、间隔更长。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动扑翼，先走近；越大越愿意先手。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这两拍稳定收尾；关闭则所有目标同等对待。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为扑翼离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
