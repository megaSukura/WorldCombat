/**
 * 起风 / gust 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 13）格之内；更远交给共享接近逻辑。
 *   这是便宜、回得快的远程一记，偏好从稍远处先手。
 * 对谁出手：`ai.flyers`（默认开）打开时，正离地/飞在空中的目标多一档分（起风对空中的目标吹得更远）；
 *   关闭则所有目标同价。此外还会看这记推得动不动与推得值不值：
 *   原生完全/极高抗击退的目标几乎只吃伤害，不再当推人手段加权；贴着己方伙伴的目标值得把它吹开；
 *   站在平台/断口边、推出去就是悬空的目标更值得扇（用只读世界方块与伙伴位置判断）。
 * 够不到怎么办：reach 就是本招射程，不够先走近。风弹会小幅追踪，目标走位通常仍会被追上。
 * 放完之后：一发即散，交回共享交战计划等很短的冷却再扇下一团。
 */
namespace PokemonSkills {
    function gustWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
    }

    /** 原生抗击退接近满值时推不动：这记只剩伤害，不再按推人手段加权。 */
    function gustUnpushable(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        try {
            const world = CompanionBehavior.world(context), actor = world.actor(target.ref);
            if (actor === null) return false;
            const resistance = world.attributeValue(actor, "minecraft:generic.knockback_resistance");
            return resistance !== null && resistance.value() >= 0.9;
        } catch (ignored) { return false; }
    }

    /** 目标身边贴着自己的伙伴：把它推开能把伙伴从它的攻击范围里解救出来。 */
    function gustGuardingAlly(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context).ref;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[] | undefined;
        if (!nearby) return false;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.ref === self) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 2.4) return true;
        }
        return false;
    }

    /** 目标前方（沿施法者→目标再往外约 1.5 格）是否悬空：是就说明这一推能把人送下去。 */
    function gustLedge(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        try {
            const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context).point, at = target.point;
            const dx = at[0] - self[0], dz = at[2] - self[2], length = Math.sqrt(dx * dx + dz * dz) || 1;
            const ux = dx / length, uz = dz / length;
            const feet = at[1] - (target.height === undefined ? 1.4 : target.height) / 2;
            const ahead = world.block(WorldCombat.point(at[0] + ux * 1.5, feet - 0.2, at[2] + uz * 1.5));
            const below = world.block(WorldCombat.point(at[0] + ux * 1.5, feet - 1.2, at[2] + uz * 1.5));
            const solid = function (block: any): boolean {
                if (block === null) return false;
                return ["minecraft:air", "minecraft:cave_air", "minecraft:void_air", "minecraft:water", "minecraft:lava"].indexOf(String(block.id())) < 0;
            };
            return !solid(ahead) && !solid(below);
        } catch (ignored) { return false; }
    }

    CompanionBehavior.registerUse("gust", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return gustWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !gustWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = 16;
            if (distance <= capability.data.range) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "flyers", true) && target.grounded === false) score += 9;
            if (gustUnpushable(context, target)) score -= 10;
            if (gustGuardingAlly(context, target)) score += 6;
            if (gustLedge(context, target)) score += 6;
            return score;
        }
    });

    addPreferences("gust", {}, [
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不扇风，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.flyers"), "优先吹空中的", "boolean", {
            help: "开启：正离地/飞在空中的目标排得更前（起风把它们吹得更远）；关闭则所有目标同价。"
        })
    ]);
}
