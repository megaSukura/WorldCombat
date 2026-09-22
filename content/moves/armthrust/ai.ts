/**
 * 猛推 / armthrust 的伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带猛推的伙伴把它当**必中的推撞连击**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 6）以内就出手；更远交给共享接近逻辑。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。`ai.wall`（默认开）打开时，**身后就有墙、
 *   石头或树干的目标**排得更前——它会被一路推着撞上去，每次撞墙多挨一记 `slam`；背后是空地的目标排后，
 *   因为那一记追加伤害不会发生。
 * 够不到怎么办：reach 就是本招射程，不够先走近；推进式会一路跟着对手走，整串更容易吃满。
 * 放完之后：这一串推完就收手，交回共享交战计划等冷却。
 * 优先级：基础 17；已在射程内 +6；`ai.wall` 开启且目标背后是障碍 +9。仅剩本招可选时，它仍在普通顺序里被选中。
 */
namespace CompanionBehavior {
    function armthrustWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 6);
    }

    /** 目标背后（沿施法者→目标方向再往外一、两格）是否有实心障碍：有就说明它会被推着撞上去。 */
    function armthrustWalled(context: WorldBehavior.Context, target: Entity): boolean {
        try {
            const world = CompanionBehavior.world(context);
            const from = source(context).point, to = target.point;
            const dx = to[0] - from[0], dz = to[2] - from[2];
            const length = Math.sqrt(dx * dx + dz * dz) || 1;
            const ux = dx / length, uz = dz / length;
            const feet = to[1] - (target.height === undefined ? 1.4 : target.height) / 2;
            for (let out = 1; out <= 2; out++) for (let up = 0; up <= 2; up++) {
                const block = world.block(WorldCombat.point(to[0] + ux * out, feet + up, to[2] + uz * out));
                if (block === null) continue;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air"
                    || id === "minecraft:water" || id === "minecraft:lava") continue;
                return true;
            }
            return false;
        } catch (ignored) { return false; }
    }

    registerUse("armthrust", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return armthrustWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !armthrustWants(context, item, target)) return 0;
            const gap = CompanionBehavior.distance(source(context).point, target.point);
            let score = 17;
            if (gap <= item.data.range) score += 6;
            if (ai<boolean>(item, "wall", true) && armthrustWalled(context, target)) score += 9;
            return score;
        }
    });

    PokemonSkills.addPreferences("armthrust", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("drive"), "推进式", "boolean", {
            help: "开启（推进）：每一推后施法者向前跟一段，把距离重新压回射程内、整串更容易吃满；代价是单推威力 ×0.9、顶开 ×0.75（推得不远，撞墙机会少）。关闭（立推）：站定不动，单推威力 ×1.15、顶开 ×1.6，一次把人顶到墙上；代价是推完就拉开距离，这串很可能提前断、冷却 +3 刻。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 12, step: 1,
            help: "超过这个距离就不主动起推，先走近。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.wall"), "优先背靠障碍的目标", "boolean", {
            help: "开启：身后就有墙、石头或树干的目标排得更前，因为它会被一路推着撞上去、每次撞墙多挨一记；背后是空地的目标排后。关闭则所有目标同价。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为猛推离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
