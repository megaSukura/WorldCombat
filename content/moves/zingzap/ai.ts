/**
 * 麻麻刺刺 / zingzap 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，在 `ai.maxChase`（默认 10）格内，且与目标之间助跑路线通视——隔墙冲不到。
 * 对谁出手：`ai.longRun`（默认开）打开时，目标离自己 2 格以外、冲刺距离以内排前——留出冲程才攒得起电，
 *   贴脸撞威力最低；已经被电懵的目标减价（畏缩掷在干净目标上更值）。
 *   跳电开着、目标旁边还有一个无遮挡的第二人时再加价（电真的跳得到）。
 * 够不到怎么办：射程交给 `rush`，共享任务把身位收进射程后再出手。
 * 放完接什么：交回共享交战计划；它是一记近身冲撞，不负责收尾。
 */
namespace PokemonSkills {
    function zingzapWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 10)) return false;
        // 助跑要通视：中间隔墙就冲不到，不为它起步。
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    /** 目标旁边是否有一个跳电够得到、且中间无遮挡的第二人；arcChain 关掉时没有这个收益。 */
    function zingzapArcValue(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const config = item.data.config;
        if (config && config.arcChain === false) return false;
        const world = CompanionBehavior.world(context), arcReach = p("zingzap", "arc", world);
        const at = CompanionBehavior.point(target.point);
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= arcReach
                && world.clear(at, CompanionBehavior.point(other.point))) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("zingzap", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return zingzapWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !zingzapWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let value = 20;
            if (CompanionBehavior.ai<boolean>(capability, "longRun", true) && distance >= 2 && distance <= capability.data.range) value += 6;
            if (CompanionBehavior.status(context, target, "flinch")) value -= 4;
            if (zingzapArcValue(context, capability, target)) value += 5;
            return value;
        }
    });

    addPreferences("zingzap", {}, [
        field(pathOf("overcharge"), "蓄电", "boolean", {
            help: "开启：冲刺更远、蓄电上限与攒电速度更高、撞上更重，但起手与冷却更长，扑空冲过头也更亏。关闭：短促冲撞，更快更稳、蓄电增益低。"
        }),
        field(pathOf("arcChain"), "跳电", "boolean", {
            help: "开启：命中点的电跳向旁边最近的一个敌人（挨主击威力的 50%%、畏缩几率减半），但主击约轻 10%%。关闭：全部电荷灌进主目标，主击约重 10%%。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "只在威胁离自己这么远以内才起步冲撞；调大愿意先追一段，调小只在贴身时冲。"
        }),
        field(pathOf("ai.longRun"), "留出冲程", "boolean", {
            help: "开启后，目标离自己 2 格以外时优先冲撞——留出冲程才攒得起电；贴脸时不加价，只按普通近战排序。"
        })
    ]);
}
