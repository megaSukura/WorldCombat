/** 伙伴检查范围内可溶毁的宝可梦道具或可损坏的普通耐久装备，再选择喷酸位置。 */
namespace CompanionBehavior {
    interface CorrosiveHeldFact { id: string; pokemon: boolean; remaining: number; maximum: number; }

    /** 只读、决策内缓存：该目标手上可被本招作用的持物事实（JSON），无可作用持物返回 ""。 */
    registerFact("world_combat:move_corrosivegas/held", function (access: CombatWorld, actor: CombatActor, _argument: any): any {
        const held = PokemonSkills.corrosiveHeldOf(access, actor);
        if (held === null) return "";
        return JSON.stringify({
            id: held.id, pokemon: held.pokemon !== null,
            remaining: held.durability ? Math.max(0, held.durability.maximum - held.durability.damage) : -1,
            maximum: held.durability ? held.durability.maximum : -1
        });
    });

    function corrosiveHeldFact(context: WorldBehavior.Context, target: Entity): CorrosiveHeldFact | null {
        const raw = CompanionBehavior.fact<string>(context, "world_combat:move_corrosivegas/held", target);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (error) { return null; }
    }
    function corrosiveCloudRadius(context: WorldBehavior.Context, self: Entity): number {
        const access = world(context), actor = access.actor(self.ref);
        return actor ? PokemonSkills.corrosiveGasRadius(access, actor) : 3.2;
    }
    /** 一次损失会否真的把装备弄坏：宝可梦携带物直接溶毁；普通装备按本招 6% 预算判断能否到破损。 */
    function corrosiveBreaks(fact: CorrosiveHeldFact): boolean {
        if (fact.pokemon) return true;
        if (fact.remaining < 0 || fact.maximum <= 0) return false;
        const wear = Math.max(1, Math.ceil(fact.maximum * 0.06));
        return fact.remaining <= wear;
    }
    function corrosiveCounts(context: WorldBehavior.Context, self: Entity, radius: number): { enemyHolders: number; allyHolders: number; enemies: number; enemyValues: number } {
        const nearby = (context.facts.nearby || []) as Entity[];
        let enemyHolders = 0, allyHolders = 0, enemies = 0, enemyValues = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, self.point) > radius) continue;
            const held = corrosiveHeldFact(context, other);
            if (other.friendly) { if (held !== null) allyHolders++; }
            else { enemies++; if (held !== null) { enemyHolders++; if (corrosiveBreaks(held)) enemyValues++; } }
        }
        return { enemyHolders: enemyHolders, allyHolders: allyHolders, enemies: enemies, enemyValues: enemyValues };
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
            // 能真的损毁装备或溶毁持物才算高价值；满耐久装备只被磨掉 6%，价值明显更低。
            if (counts.enemyValues >= 2) return 66;
            if (counts.enemyValues === 1) return 58;
            if (counts.enemyHolders >= 1) return 40;
            return counts.enemies > 0 ? 30 : 0;
        }
    });

    const corrosiveChase = PokemonSkills.number("ai.maxChase", "出手距离", 3, 18, 1);
    corrosiveChase.help = "威胁进入这个距离内才考虑喷酸；调小只在贴身时喷，调大愿意提前把远处围上来的一圈一起罩住。";
    const corrosiveHolders = PokemonSkills.flag("ai.onlyHolders", "只对雾里有敌方携带物时出手");
    corrosiveHolders.help = "开启：只有雾半径内至少有一个携带道具的敌人时才出手，专门用来溶毁敌方装备；关闭：雾里裹到敌人就喷，顺手磨损也认。两种设置下，雾里有携带道具的队友时都不会出手。";
    const corrosiveStation = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    corrosiveStation.help = "开启后，收到「驻守」指令时也会离开原位去喷酸；关闭则只在原地够得到时出手。";
    PokemonSkills.addPreferences("corrosivegas", { ai: { maxChase: 11, onlyHolders: true, leaveStation: false } },
        [corrosiveChase, corrosiveHolders, corrosiveStation]);
}
