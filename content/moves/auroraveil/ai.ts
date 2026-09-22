/**
 * 极光幕 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：只有冰雹（雨/雷暴 + 脚下有雪或冰）时才考虑；有可见威胁在 ai.maxChase 以内。
 *   ai.coverTeam 开启时，只有身边 5 格内还有别的友方才铺——留着一次护住多人。
 * 出手前的位置：ai.advance 关闭（默认）时铺在脚下；开启时前压到交战区中间，把更多队友罩进幕里。
 * 放完之后把伤害交回共用交战计划；自己还带着幕时不再重复（幕只护友方，铺完走出去就失去）。
 */
namespace CompanionBehavior {
    const auroraChase = PokemonSkills.number("ai.maxChase", "铺幕距离", 4, 26, 1);
    auroraChase.help = "伙伴只在威胁离自己这么远以内、且天在下着雪时才考虑极光幕；调小只在贴身受压时铺，调大愿意提前布置。";
    const auroraAdvance = PokemonSkills.flag("ai.advance", "把极光铺向对手");
    auroraAdvance.help = "开启后把极光按在自己与威胁之间，让交战区落到幕下；关闭则铺在脚下先护住自己。";
    const auroraCover = PokemonSkills.flag("ai.coverTeam", "留到队友也进来才铺");
    auroraCover.help = "开启后，只有身边 5 格内还有别的友方才铺极光幕；关闭则自己受压就铺。";
    const auroraStation = PokemonSkills.flag("ai.leaveStation", "离开驻守点");
    auroraStation.help = "开启后，收到「驻守」指令时也会离开原位去铺极光幕。";

    PokemonSkills.addPreferences("auroraveil", { ai: { maxChase: 14, coverTeam: false, advance: false, leaveStation: false } },
        [auroraChase, auroraAdvance, auroraCover, auroraStation]);

    function auroraHailHere(context: WorldBehavior.Context): boolean {
        return PokemonSkills.auroraVeilHail(world(context), point(source(context).point));
    }
    function auroraWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        const self = source(context);
        if (status(context, self, "auroraveil")) return false;
        if (!auroraHailHere(context)) return false;
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 14)) return false;
        if (ai<boolean>(item, "coverTeam", false)) {
            const nearby = context.facts.nearby as Entity[];
            let ally = false;
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (other.friendly && other.health > 0 && distance(other.point, self.point) <= 5) { ally = true; break; }
            }
            if (!ally) return false;
        }
        return true;
    }
    function auroraCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "auroraveil") return items[i];
        return null;
    }

    registerUse("auroraveil", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, item) { return auroraHailHere(context) ? 78 : 30; },
        available: function (context, item, _purpose, _target) { return auroraWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_auroraveil/goal", propose: function (context) {
        const threat: Entity | null = context.senses["world_combat:threat"];
        const item = auroraCapability(context);
        if (!item || !auroraWants(context, item, threat)) return [];
        return [{ id: "world_combat:move_auroraveil:" + threat!.ref, kind: "world_combat:move_auroraveil", data: { ref: threat!.ref } }];
    } });
    registry.method({ id: "world_combat:move_auroraveil/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_auroraveil") return [];
            const item = auroraCapability(context), threat: Entity | null = entity(context, goal.data.ref);
            if (!item || !auroraWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            const item = choice.offer.capabilities![0];
            return castNode(item.id, "prepare", function (current) {
                const self = source(current), threat: Entity | null = current.senses["world_combat:threat"];
                const copy: Entity = JSON.parse(JSON.stringify(self));
                if (ai<boolean>(item, "advance", false) && threat) {
                    const dx = threat.point[0] - self.point[0], dz = threat.point[2] - self.point[2];
                    const length = Math.max(0.001, Math.sqrt(dx * dx + dz * dz)), step = Math.min(2, length * 0.4);
                    copy.point = [self.point[0] + dx / length * step, self.point[1], self.point[2] + dz / length * step];
                }
                return copy;
            });
        }
    });
    orderGoals("world_combat:move_auroraveil/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_auroraveil");
    });
}
