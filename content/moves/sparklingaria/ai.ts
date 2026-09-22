/**
 * 泡影的咏叹调 / sparklingaria 的伙伴 AI 用途。
 *
 * 同一支歌有两个用途，注册在两条协议上：
 *   `world_combat:attack`——站在敌人堆里唱，一次轰到身边一圈；
 *   `world_combat:heal`  ——朝一个**中了灼伤**的同伴（不含自己）唱，把它的灼伤洗掉。
 * 什么局面下出手：攻击分支看 `ai.maxChase`（默认 9）内可见、敌对的敌人，身边敌人越多 priority 越高；
 *   救助分支在 `ai.cureAllies`（默认开）时，对 `ai.maxChase` 内身上带灼伤身份的同伴出手，同伴越残 priority 越高。
 * 站位：共享接近逻辑把身位收进波及半径以内，再原地起唱。起手较长，注意别在人堆里硬站。
 */
namespace PokemonSkills {
    function sparklingariaBurned(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.status(context, target, "burn");
    }

    function sparklingariaValid(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 9);
    }

    /** 自身波及半径内还站着几个可见、敌对的敌人。 */
    function sparklingariaCluster(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby: WorldMethods.Subject[] = context.facts.nearby || [], self = CompanionBehavior.source(context);
        const reach = typeof item.data.range === "number" ? item.data.range : 4.5;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= reach) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("sparklingaria", {
        protocols: ["world_combat:attack", "world_combat:heal"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.friendly) {
                if (!CompanionBehavior.ai<boolean>(capability, "cureAllies", true)) return false;
                if (String(target.ref) === String(CompanionBehavior.source(context).ref)) return false;
                return sparklingariaBurned(context, target) && sparklingariaValid(context, capability, target);
            }
            return sparklingariaValid(context, capability, target);
        },
        accepts: function (context, capability, target) {
            if (target.health <= 0 || !target.visible) return false;
            if (target.friendly) {
                if (!CompanionBehavior.ai<boolean>(capability, "cureAllies", true)) return false;
                if (String(target.ref) === String(CompanionBehavior.source(context).ref)) return false;
                return sparklingariaBurned(context, target) && sparklingariaValid(context, capability, target);
            }
            return sparklingariaValid(context, capability, target);
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (target.friendly) {
                if (!sparklingariaBurned(context, target) || !sparklingariaValid(context, capability, target)) return 0;
                return CompanionBehavior.ratio(target) < 0.5 ? 100 : 72;
            }
            if (!sparklingariaValid(context, capability, target)) return 0;
            const count = sparklingariaCluster(context, capability);
            return 18 + Math.min(26, Math.max(0, count - 1) * 8);
        }
    });

    addPreferences("sparklingaria", { ai: { maxChase: 9, cureAllies: true } }, [
        field(pathOf("highNote"), "高音", "boolean", {
            help: "开启：范围约 ×1.25、气泡更多、单点约 ×0.85，起手 +2 刻、冷却 +8 刻，用来一次洗更大一片。关闭（收束咏叹调）：范围约 ×0.85、单点约 ×1.15，收手更快。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在目标离自己这么远以内时才考虑起唱；调小只在贴身时唱，调大愿意先往人堆里走。"
        }),
        field(pathOf("ai.cureAllies"), "替同伴洗灼伤", "boolean", {
            help: "开启：伙伴会把一次出手让给身上带灼伤的同伴，走过去唱掉它；关闭：只在攻击分支里用这支歌。"
        })
    ]);
}
