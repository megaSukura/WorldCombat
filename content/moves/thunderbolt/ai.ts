/**
 * 十万伏特 / thunderbolt —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack／ranged 位上；带十万伏特的伙伴把它当作中距离的主攻点射。
 *   对可见、敌对、存活、在 `ai.maxChase`（默认 13）以内、且中间有一条通视线的目标出手；更远交给共享接近逻辑。
 * 对谁出手：`ai.preferChain`（默认开）打开时，用真实可连通的敌人规模抬价——从目标出发，只有边长不超过电链
 *   预算（与爆开半径同量级）、彼此通视的敌人才算可连；扩散式的树状短链真的能电到的人越多越值得。
 *   `ai.seekUnparalysed`（默认开）打开时，还没被麻住的目标略高，别把本就很少的麻痹机会丢在已经麻住的人身上。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程后再出手；靠墙的目标先等共享接近逻辑找到射界。
 * 放完之后：命中者带上一小段麻痹机会，伙伴交回共享顺序继续交战；它是一记消耗手段，不负责收尾。
 * 优先级：基础 20（已在射程内）／4（还要先走近）；可连电规模 +6/人（封顶 +18），未麻 +5。
 */
namespace PokemonSkills {
    /** 电链的连通判定半径：与爆开半径同一量级，只用于候选排序，不改变命中判定。 */
    const thunderboltChainReach = 2.5;

    /** 从目标出发、按边长与通视真实可连通的敌人数量（不含目标自己），用来读扩散式真正能电到谁。 */
    function thunderboltConnectable(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context);
        const nearby: CompanionBehavior.Entity[] = <any>context.facts.nearby || [];
        const seen: { [ref: string]: boolean } = Object.create(null);
        seen[String(target.ref)] = true;
        const queue: CompanionBehavior.Entity[] = [target];
        let count = 0;
        for (let head = 0; head < queue.length; head++) {
            const node = queue[head];
            const from = CompanionBehavior.point(node.point);
            for (let index = 0; index < nearby.length; index++) {
                const other = nearby[index], ref = String(other.ref);
                if (seen[ref] || other.friendly || other.health <= 0) continue;
                if (CompanionBehavior.distance(node.point, other.point) > thunderboltChainReach) continue;
                if (!world.clear(from, CompanionBehavior.point(other.point))) continue;
                seen[ref] = true;
                count++;
                queue.push(other);
            }
        }
        return count;
    }

    CompanionBehavior.registerUse(thunderboltId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 13)) return false;
            return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > CompanionBehavior.ai<number>(capability, "maxChase", 13)) return 0;
            let value = gap <= capability.data.range ? 20 : 4;
            if (CompanionBehavior.ai<boolean>(capability, "preferChain", true)) {
                const chain = thunderboltConnectable(context, target);
                if (chain > 0) value += Math.min(18, 6 * chain);
            }
            if (CompanionBehavior.ai<boolean>(capability, "seekUnparalysed", true) && !CompanionBehavior.status(context, target, "paralysis")) value += 5;
            return value;
        }
    });

    addPreferences(thunderboltId, {}, [
        field(pathOf("spread"), "扩散式", "boolean", {
            help: "开启：命中处向周围最多几个敌人分摊电花（各按一部分威力结算），爆开范围 ×1.5、起手多 2 刻、冷却 ×1.15，但直击威力 ×0.82；关闭：单体重击，直击 ×1.06、飞得更快。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 24, step: 1,
            help: "超过这个距离就不主动点射，先走近；越大越愿意从更远处先手压血。"
        }),
        field(pathOf("ai.preferChain"), "优先可连电群", "boolean", {
            help: "开启后，按目标能真实连通（边长不超过电链范围、彼此通视）的敌人数量抬价，扩散式能电到的人越多越优先；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.seekUnparalysed"), "优先未麻目标", "boolean", {
            help: "开启后，还没被麻住的目标优先级略高，别把很少的麻痹机会丢在已经麻住的人身上；关闭则一视同仁。"
        })
    ]);
}
