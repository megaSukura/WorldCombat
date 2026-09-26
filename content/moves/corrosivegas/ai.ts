/** 伙伴检查范围内可溶毁的宝可梦道具或可腐蚀的普通耐久装备，再选择喷酸位置。 */
namespace CompanionBehavior {
    registerFact("world_combat:move_corrosivegas/held", function (access: CombatWorld, actor: CombatActor, _argument: any): any {
        const held = PokemonSkills.corrosiveHeldOf(access, actor);
        return held === null ? "" : held.id;
    });

    function corrosiveHeldOf(context: WorldBehavior.Context, target: Entity): string {
        return CompanionBehavior.fact<string>(context, "world_combat:move_corrosivegas/held", target) || "";
    }
    function corrosiveCloudRadius(context: WorldBehavior.Context, self: Entity): number {
        const access = world(context), actor = access.actor(self.ref);
        return actor ? PokemonSkills.corrosiveGasRadius(access, actor) : 3.2;
    }
    function corrosiveCounts(context: WorldBehavior.Context, self: Entity, radius: number): { enemyHolders: number; allyHolders: number; enemies: number } {
        const nearby = (context.facts.nearby || []) as Entity[];
        let enemyHolders = 0, allyHolders = 0, enemies = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, self.point) > radius) continue;
            const holds = corrosiveHeldOf(context, other) !== "";
            if (other.friendly) { if (holds) allyHolders++; }
            else { enemies++; if (holds) enemyHolders++; }
        }
        return { enemyHolders: enemyHolders, allyHolders: allyHolders, enemies: enemies };
    }

    registerUse("corrosivegas", {
        protocols: ["world_combat:prepare", "world_combat:control"],
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
            // 雾里有携带可腐蚀物的队友时绝不喷：溶毁队友道具的代价远大于沾到一两个敌人。
            if (counts.allyHolders > 0) return false;
            if (ai<boolean>(item, "onlyHolders", true)) return counts.enemyHolders > 0;
            return counts.enemies > 0;
        },
        priority: function (context, item) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = source(context);
            const counts = corrosiveCounts(context, self, corrosiveCloudRadius(context, self));
            // 有装备的队友在雾里是强负收益，直接放弃这次出手。
            if (counts.allyHolders > 0) return 0;
            if (counts.enemyHolders >= 2) return 62;
            if (counts.enemyHolders === 1) return 54;
            return counts.enemies > 0 ? 30 : 0;
        }
    });

    const corrosiveChase = PokemonSkills.number("ai.maxChase", "出手距离", 3, 18, 1);
    corrosiveChase.help = "威胁进入这个距离内才考虑喷酸；调小只在贴身时喷，调大愿意提前把远处围上来的一圈一起罩住。";
    const corrosiveHolders = PokemonSkills.flag("ai.onlyHolders", "只对雾里有敌方携带物时出手");
    corrosiveHolders.help = "开启：只有雾半径内至少有一个携带道具的敌人时才出手，专门用来溶毁敌方装备；关闭：雾里裹到敌人就喷，顺手沾酸也认。两种设置下，雾里有携带道具的队友时都不会出手。";
    const corrosiveStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    corrosiveStation.help = "开启后，收到「驻守」指令时也会离开原位去喷酸；关闭则只在原地够得到时出手。";
    PokemonSkills.addPreferences("corrosivegas", { ai: { maxChase: 11, onlyHolders: true, leaveStation: false } },
        [corrosiveChase, corrosiveHolders, corrosiveStation]);
}
