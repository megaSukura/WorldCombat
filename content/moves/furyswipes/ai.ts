/**
 * 乱抓 / furyswipes —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带乱抓的伙伴把它当**贴身连抓**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 6）以内就出手；乱抓会自己绕圈，所以比站定招更愿意贴上去；更远交给共享接近逻辑。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）；`ai.finish`（默认开）打开且目标生命已低于
 *   四成时排得更前——用这一趟快抓收掉残血。
 * 为什么挑局面：乱抓靠左右换位找角度，只适合目标身边压力不大、侧边站得下的时候；被一群杂兵围住时降权，
 *   把这一片交给扫尾拍打。侧边站不下（贴身靠墙）时也降权，不硬挤。
 * 够不到怎么办：射程交给 `reach`，共享任务负责把身位送进射程。
 * 放完之后：一趟抓完（或抓空）就收势，交回共享交战计划等冷却。
 * 优先级：基础 18；已在射程内 +8；残血且 `ai.finish` 开启 +8；侧边站得下 +6、站不下 −4；近旁杂兵 ≥2 −8。
 *   仅剩本招可选时，它仍在普通顺序里被选中。
 */
namespace CompanionBehavior {
    function furyswipesWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 6);
    }

    /** 目标近旁（3.5 格内）还站着几个别的敌人；被围住时这一趟绕不开。 */
    function furyswipesCrowd(context: WorldBehavior.Context, target: Entity): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
    }

    /** 侧边放得下换位的一步才方便绕抓；用只读的 freeSpace 探针探左右各一步。 */
    function furyswipesSideSpace(context: WorldBehavior.Context, target: Entity): boolean {
        const access = world(context), self = source(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1e-6) return true;
        const sideX = -dz / length, sideZ = dx / length, step = 0.9;
        const first = point([self.point[0] + sideX * step, self.point[1], self.point[2] + sideZ * step]);
        const second = point([self.point[0] - sideX * step, self.point[1], self.point[2] - sideZ * step]);
        try { return access.freeSpace(first, self.width || 0.9, self.height || 1.4) || access.freeSpace(second, self.width || 0.9, self.height || 1.4); }
        catch (error) { return true; }
    }

    registerUse("furyswipes", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return furyswipesWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !furyswipesWants(context, item, target)) return 0;
            const distance = CompanionBehavior.distance(source(context).point, target.point);
            let score = 18;
            if (distance <= item.data.range) score += 8;
            if (ai<boolean>(item, "finish", true) && ratio(target) < 0.4) score += 8;
            // 侧边站得下才好左右换位绕抓；站不下就降权。
            score += furyswipesSideSpace(context, target) ? 6 : -4;
            // 被杂兵围住时这一趟绕不开，让扫尾拍打接手。
            if (furyswipesCrowd(context, target) >= 2) score -= 8;
            return score;
        }
    });

    PokemonSkills.addPreferences("furyswipes", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("pounce"), "扑抓式", "boolean", {
            help: "开启（扑抓）：改为朝目标前压、每道威力 ×1.08、爪距 ×1.12，把目标按在一面猛抓；代价是张角 ×0.8（收窄成一道）、几乎不侧移、命中率 −3%、间隔 +1 刻。关闭（游走）：左右交替绕圈、张角 ×1.12、换位 ×1.25、命中率 +3%，逼目标不停转身；代价是每道 ×0.9、爪距 ×0.92。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动扑上去抓，先走近。它是贴身招，越大越愿意从稍远处起手。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：目标生命低于四成时更愿意用这趟快抓收掉它；关闭则所有目标同价。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为乱抓离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
