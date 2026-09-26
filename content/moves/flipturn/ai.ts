/**
 * 快速折返 / flipturn 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 8 格）以内——靠近后翻身越到它另一侧。
 * 对谁出手：被打崩前用它脱身（`ai.fleeBelow`，默认 0.4 以下排最前），或收掉残血目标；泡在水里时额外提前，
 *   因为水里滑得更远、这一翻更值。
 * 身材与退路：能越过的体型（目标不比自己高太多）加分——这一翻才真的越到背后；比自己高出一大截的巨型目标
 *   不假设能穿过去，只当作蹬一脚后退的落点，不加分反而扣分。目标背后用只读空域探针量出是否空旷：有地方落脚
 *   就加分，逼墙时不愿往那儿翻。异于急速折返的是它不是单纯退开，而是**换到目标另一侧**——想换一条攻击线
 *   或绕到背后时也值得先出。
 * 够不到怎么办：reach 就是本招射程，不够就交给共享接近逻辑。
 * 放完之后：身位已经在目标另一侧（或伙伴身边），交回共享交战计划。
 */
namespace PokemonSkills {
    function flipturnWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    /** 目标背后是否有自己放得下的落脚空间；只读空域探针，探针不可用时按未知处理（不计分）。 */
    function flipturnRearOpen(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        if (!world || typeof world.freeSpace !== "function") return false;
        const self = CompanionBehavior.source(context);
        const width = Number(self.width) || 0.9, height = Number(self.height) || 1.4;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const span = Math.sqrt(dx * dx + dz * dz);
        if (span < 0.01) return false;
        const reach = (Number(target.width) || 0.9) / 2 + width / 2 + 0.9;
        const behind = CompanionBehavior.point([target.point[0] + dx / span * reach,
            target.point[1] - height / 2, target.point[2] + dz / span * reach]);
        return world.freeSpace(behind, width, height);
    }

    CompanionBehavior.registerUse("flipturn", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            return !target || flipturnWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !flipturnWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 15;
            if (CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(capability, "fleeBelow", 0.4)) score += 18;
            if (CompanionBehavior.ratio(target) <= 0.35) score += 10;
            if (self.wet) score += 8;
            const selfHeight = Number(self.height) || 1.4, targetHeight = Number(target.height) || 1.4;
            // 与抛弧顶点同一笔预算：目标不高于自身约 0.9 倍身长加一点时真能翻过去；巨型目标不加分，只保留撤退价值。
            if (targetHeight <= selfHeight * 0.9 + 0.35) score += 6; else score -= 10;
            if (flipturnRearOpen(context, target)) score += 6;
            return score;
        }
    });

    addPreferences("flipturn", {}, [
        field(pathOf("turn"), "回身式", "boolean", {
            help: "开启（回身式）：越过目标后回身落向最近的等候伙伴（没有伙伴就退到目标这一侧），滑行 ×0.8、冲撞 ×1.12。关闭（深潜式）：越过目标继续深潜远遁，滑行 ×1.3、冲撞 ×0.9。一个换更重的撞击与归队，一个换更远的脱身。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动冲上去，先靠近；比冲刺距离略宽，调大更愿意先手，调小则只在贴身时折返。"
        }),
        field(pathOf("ai.fleeBelow"), "脱身血量", "number", {
            min: 0.15, max: 0.9, step: 0.05,
            help: "自己血量比例低于这个值时，把快速折返排到最前用来翻身脱身；调高更早脱身，调低只在濒危时才用。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会翻身脱离；关闭则只在原地方便时施放。"
        })
    ]);
}
