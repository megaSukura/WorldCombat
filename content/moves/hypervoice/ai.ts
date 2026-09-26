/**
 * 巨声 / hypervoice 的伙伴 AI 用途。
 *
 * 什么局面下出手：朝当前威胁那条线推出的一整片声墙。收益按**实际朝向**计算——只数从自身指向目标的
 *   3D 声锥内、射程里的可见非友方，背后的敌人不抬高这一声的价值；锥内起码要有 `ai.minFoes`
 *   （默认 1）个敌人才值得张开。它比爆音波便宜、也推得开人，所以单个目标也值得放。
 * `available` 另外要求目标在考虑距离 `ai.maxChase`（默认 9）内；不看目标站不站在地上、也不要求通视
 *   （声音穿墙）。站位：共享接近逻辑把身位收到锥长以内，然后朝目标方向整片扫出。
 * 另外：自己被贴身围攻（生命低于一半）时 priority 抬一段——一声把贴上来的人推回去比继续硬拼更值。
 * 放完之后：交给共享顺序继续交战；冷却没转好前不重复。
 * 配置：`ai.maxChase` 限制考虑距离；`ai.minFoes` 决定朝向锥内要几个目标才值得张开这一片。
 */
namespace PokemonSkills {
    /** 声锥的相对半角；取参数公式里散声/聚声之间的代表值，只用来判断前后，不代替真实判定。 */
    const hypervoiceAiHalfAngle = 50 * Math.PI / 180;

    /** 从自身指向 `target` 的 3D 声锥内、射程里的非友方数量；与真实判定的朝向一致，背后不计入。 */
    function hypervoiceCaught(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const dx = target.point[0] - self.point[0], dy = target.point[1] - self.point[1], dz = target.point[2] - self.point[2];
        const span = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (span < 1e-4) return 1;
        const ax = dx / span, ay = dy / span, az = dz / span;
        const reach = item.data.range, cosHalf = Math.cos(hypervoiceAiHalfAngle);
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oy = other.point[1] - self.point[1], oz = other.point[2] - self.point[2];
            const distance = Math.sqrt(ox * ox + oy * oy + oz * oz);
            if (distance > reach) continue;
            if (distance < 0.35 || (ox * ax + oy * ay + oz * az) / distance >= cosHalf) count++;
        }
        return count;
    }

    function hypervoiceWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 9)) return false;
        return hypervoiceCaught(context, item, target) >= CompanionBehavior.ai<number>(item, "minFoes", 1);
    }

    CompanionBehavior.registerUse("hypervoice", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return hypervoiceWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !hypervoiceWants(context, capability, target)) return 0;
            let base = 22;
            const count = hypervoiceCaught(context, capability, target);
            if (count >= 3) base += Math.min(22, (count - 2) * 7);
            // 被贴身围攻时，一声把一圈人推回去比继续硬拼更值。
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) < 0.5) base += 8;
            return base;
        }
    });

    addPreferences("hypervoice", {}, [
        field(pathOf("focused"), "聚声", "boolean", {
            help: "开启：张角收到约 0.6 倍、射程约 ×1.25、击退约 ×1.15、威力约 ×1.08，起手 +2 刻、冷却 +4 刻，把一声吼收成更远更重的一条。关闭（散声）：张角约 ×1.3、威力略小，用来一次覆盖一整个方向。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑巨声；调小只在贴身时吼，调大愿意先追进去再吼。"
        }),
        field(pathOf("ai.minFoes"), "锥内人数", "number", {
            min: 1, max: 6, step: 1,
            help: "朝目标方向的锥内至少站着这么多可见、敌对的敌人才出手；调大只在人堆里吼、省 PP，调 1 见一个也吼。"
        })
    ]);
}
