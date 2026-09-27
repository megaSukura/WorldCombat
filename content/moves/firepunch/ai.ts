/**
 * 火焰拳 / firepunch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.preferUnlit`（默认开）打开时，还没烧起来的目标排得更前；但只要目标身边有真正能被点着、
 *   又在本招实际 spreadRange 内的邻敌，就抬一档——已燃主敌能稳定把火传出去，收益按一次算，不按邻居数量叠加。
 * 够不到怎么办：火拳射程短，reach 之内才动手，不够先贴近。
 * 放完之后：让灼伤持续结算，交回共享交战计划去处理减攻窗口。
 */
namespace PokemonSkills {
    function firepunchWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    /** 邻敌是否真能被点着：已灼伤的会被跳过，火属性等天生免疫灼伤的也不计收益。 */
    function firepunchBurnable(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        if (CompanionBehavior.status(context, target, "burn")) return false;
        const world = CompanionBehavior.world(context), actor = world.actor(target.ref);
        if (actor === null || String(actor.domain()) !== "cobblemon") return true;
        return PokemonDamage.combatants.read(world, actor).types.indexOf("fire") < 0;
    }

    CompanionBehavior.registerUse("firepunch", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return firepunchWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !firepunchWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 21;
            const burning = CompanionBehavior.status(context, target, "burn");
            if (CompanionBehavior.ai<boolean>(capability, "preferUnlit", true) && !burning) score += 8;
            // 用本招真实 spreadRange 和邻敌是否真能被点着来算这笔账：只算一次，不按邻居数量叠收益。
            const world = CompanionBehavior.world(context);
            const facts: FactContext = { world: world, actor: world.source(), detail: { values: capability.data.config } };
            const spreadRange = p("firepunch", "spreadRange", facts);
            const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
            let spreadable = false;
            for (let i = 0; i < nearby.length && !spreadable; i++) {
                const other = nearby[i];
                if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
                if (CompanionBehavior.distance(other.point, target.point) > spreadRange) continue;
                if (!firepunchBurnable(context, other)) continue;
                spreadable = true;
            }
            // 已燃主敌能稳定传火，比未燃主敌更值得现在出拳；不再一律优先未燃。
            if (spreadable) score += burning ? 10 : 6;
            return score;
        }
    });

    addPreferences("firepunch", {}, [
        field(pathOf("blazeUp"), "烈焰式", "boolean", {
            help: "开启：点燃概率 +15%%、灼伤时长 ×1.15、蔓延距离 ×1.25，但拳威 ×0.88、冷却 +5 刻——铺火为主。关闭（点火式）：拳更重、循环更快，但更难点着、火蔓延更近。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动出拳，先走近。火拳射程很短，设大也常常够不到。"
        }),
        field(pathOf("ai.preferUnlit"), "优先点没着火的", "boolean", {
            help: "开启：还没被点着的目标排得更前，避免浪费火种；关闭则所有目标同价。"
        })
    ]);
}
