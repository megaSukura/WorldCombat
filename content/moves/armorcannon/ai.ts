/**
 * 铠农炮 / armorcannon 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 16）格之内；更远交给共享接近逻辑。
 *   这一发在提交那一刻就把铠甲烧掉（自降防特防），只有在自身生命比例不低于 `ai.minHealth`（默认 0＝不限制）时才起手。
 * 对谁出手：它是远距炮击，越能拉开站位越值——距离达到 `ai.standoff`（默认 5）格以上加一档，贴到 2 格以内减一档；
 *   `ai.finish`（默认开）打开时残血目标更高；散爆式在实际散爆半径内还有真实可达的别人时再高一档。
 * 够不到怎么办：reach 就是本招射程，先走到射程里；飞行途中目标消失就只留一下散火。
 * 放完之后：交回共享交战计划等冷却；落点的短促热壳残屑只是表现，本招不因它改后续决策。
 */
namespace PokemonSkills {
    /** 目标身边实际散爆半径内、且从接触点真实可达的别的敌人数（散爆式的价值判断）。 */
    function armorcannonClustered(context: WorldBehavior.Context, target: CompanionBehavior.Entity, radius: number): number {
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        if (!(radius > 0)) return 0;
        const world = CompanionBehavior.world(context);
        const centre = CompanionBehavior.point(target.point);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || other.ref === target.ref) continue;
            if (CompanionBehavior.distance(other.point, target.point) > radius) continue;
            if (!world.clear(centre, CompanionBehavior.point(other.point))) continue;
            count++;
        }
        return count;
    }

    function armorcannonWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            > CompanionBehavior.ai<number>(capability, "maxChase", 16)) return false;
        const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0);
        return minHealth <= 0 || CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth;
    }

    CompanionBehavior.registerUse(armorcannonId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return armorcannonWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !armorcannonWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = distance <= capability.data.range ? 18 : 0;
            if (distance >= CompanionBehavior.ai<number>(capability, "standoff", 5)) score += 6; else if (distance <= 2) score -= 8;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) < 0.45) score += 8;
            const config = capability.data.config || {};
            if (config.burst === true) {
                // 只在实际散爆半径内有真实可达的第二目标时才算群体收益。
                let blast = 0;
                try {
                    const world = CompanionBehavior.world(context);
                    blast = Math.max(0, p(armorcannonId, "blast", { world: world, actor: world.source(), detail: { values: config } }));
                } catch (error) { }
                if (blast > 0 && armorcannonClustered(context, target, blast) > 0) score += 6;
            }
            return score;
        }
    });

    addPreferences(armorcannonId, { burst: false, ai: { maxChase: 16, standoff: 5, finish: true, minHealth: 0 } }, [
        field(pathOf("burst"), "散爆式", "boolean", {
            help: "开启：炮弹命中在接触面炸开一团半径数格的火，范围内真实可达的其他敌人各吃一部分威力；代价是炮弹威力 ×0.8、收招 +3 刻、冷却 +5 刻。关闭（单发式）：全部集中在单个目标，威力更高、出手更快，只有局部壳碎。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 6, max: 26, step: 1,
            help: "超过这个距离就不主动起手，先走近；越大越愿意在更远处先点火。"
        }),
        field(pathOf("ai.standoff"), "保持距离", "number", {
            min: 0, max: 12, step: 1,
            help: "距离达到这个值以上时加一档优先级，鼓励在远处开炮；贴到 2 格以内会减一档，让位给近身手段。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这一发在身价下跌前收掉；关闭则所有目标同价。"
        }),
        field(pathOf("ai.minHealth"), "最低生命比例", "number", {
            min: 0, max: 0.9, step: 0.1,
            help: "自身生命比例低于这个值就不主动烧甲开炮（0＝不限制）。调高能让它把这一发留给值得交换的局面。"
        })
    ]);
}
