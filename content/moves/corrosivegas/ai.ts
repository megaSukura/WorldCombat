/**
 * 腐蚀气体 / corrosivegas —— AI 用途。
 *
 * 什么局面下出手：挂在共享的 prepare 位上；有可见威胁、威胁在 `ai.maxChase`（默认 11）格内、
 *   自己不在驻守且不愿离位时跳过。出手的时机看雾里值不值：`ai.onlyHolders`（默认开启）下，
 *   需要雾半径内至少有一个（非自己的）活体携带道具才出手——腐蚀气体正是冲着携带物去的；
 *   关闭后只要雾里裹到一个敌人就喷。
 * 候选之间怎么排：雾里携带道具的人越多优先级越高（2 个及以上 62、1 个 54、只有敌人 30），排在普通交战之前。
 * 放完之后：一圈道具被溶毁、周围活体沾上短暂的沾酸身份，伙伴交回共享顺序继续交战。
 */
namespace CompanionBehavior {
    registerFact("world_combat:move_corrosivegas/held", function (access: CombatWorld, actor: CombatActor, _argument: any): any {
        if (String(actor.domain()) !== "cobblemon") return "";
        return String(CobblemonCombat.pokemon(actor).heldItem()).replace("cobblemon:", "");
    });

    function corrosiveHeldOf(context: WorldBehavior.Context, target: Entity): string {
        return CompanionBehavior.fact<string>(context, "world_combat:move_corrosivegas/held", target) || "";
    }
    function corrosiveCloudRadius(context: WorldBehavior.Context, self: Entity): number {
        const access = world(context), actor = access.actor(self.ref);
        return actor ? PokemonSkills.corrosiveGasRadius(access, actor) : 3.2;
    }
    function corrosiveCounts(context: WorldBehavior.Context, self: Entity, radius: number): { holders: number; enemies: number } {
        const nearby = (context.facts.nearby || []) as Entity[];
        let holders = 0, enemies = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, self.point) > radius) continue;
            if (!other.friendly) enemies++;
            if (corrosiveHeldOf(context, other) !== "") holders++;
        }
        return { holders: holders, enemies: enemies };
    }

    registerUse("corrosivegas", {
        protocols: ["world_combat:prepare"],
        /** 自身为中心施放，但要走到威胁附近再喷：站位参照设为威胁，reach 取雾半径略内缩，避免站在雾缘刚好罩不住。 */
        reach: function (context) { return Math.max(1.5, corrosiveCloudRadius(context, source(context)) - 0.4); },
        approachTarget: function (context, _item, target) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            const found = threat ? entity(context, threat.ref) : null;
            return found || target;
        },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
            if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
            const self = source(context);
            const approach = ai<number>(item, "maxChase", 11);
            if (distance(self.point, threat.point) > approach) return false;
            // 出手前先看「够得着的范围」里有没有值得裹的目标；真正开喷时再走到雾半径以内（reach）。
            const counts = corrosiveCounts(context, self, approach);
            if (ai<boolean>(item, "onlyHolders", true)) return counts.holders > 0;
            return counts.enemies > 0;
        },
        priority: function (context, item) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = source(context);
            const counts = corrosiveCounts(context, self, corrosiveCloudRadius(context, self));
            if (counts.holders >= 2) return 62;
            if (counts.holders === 1) return 54;
            return counts.enemies > 0 ? 30 : 0;
        }
    });

    const corrosiveChase = PokemonSkills.number("ai.maxChase", "出手距离", 3, 18, 1);
    corrosiveChase.help = "威胁进入这个距离内才考虑喷酸；调小只在贴身时喷，调大愿意提前把远处围上来的一圈一起罩住。";
    const corrosiveHolders = PokemonSkills.flag("ai.onlyHolders", "只对雾里有携带物时出手");
    corrosiveHolders.help = "开启：只有雾半径内至少有一个活体携带道具时才出手，作为专门的溶物手段；关闭：只要雾里裹到一个敌人就喷，顺手沾酸也认。";
    const corrosiveStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    corrosiveStation.help = "开启后，收到「驻守」指令时也会离开原位去喷酸；关闭则只在原地够得到时出手。";
    PokemonSkills.addPreferences("corrosivegas", { ai: { maxChase: 11, onlyHolders: true, leaveStation: false } },
        [corrosiveChase, corrosiveHolders, corrosiveStation]);
}
