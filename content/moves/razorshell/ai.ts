/**
 * 贝壳刃 / razorshell 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。
 * `ai.crowd`（默认开）实际改变候选排序：开启时按**新月外缘的实际距离带**估人数——只有落在外缘刃厚那一圈的
 * 敌人才算进这一刀；挤着两个以上就把这招抬到优先，只有单个目标时按普通中近程斩击排序。关闭则不数人头，当单点招排。
 * 目标贴得比内圈还近时压低这招（这时刀从目标内侧掠过、空扫），让它先用普通接近拉开到一臂距离再横切。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("razorshell", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const world = CompanionBehavior.world(context);
            const reach = p("razorshell", "reach", world);
            const edge = p("razorshell", "edge", world);
            const inner = Math.max(0.3, reach - edge), outer = reach + edge * 0.5;
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > capability.data.range) return 0;
            // 目标贴得比内圈还近：刀从它内侧掠过，先拉开距离而不是在脚下空扫。
            if (gap < inner) return 8;
            if (!CompanionBehavior.ai<boolean>(capability, "crowd", true)) return 22;
            // 以自身→候选目标为朝向，数一数真正落在新月外缘距离带里的敌人。
            const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
            const heading = Math.sqrt(dx * dx + dz * dz) || 1;
            const ux = dx / heading, uz = dz / heading;
            const halfCos = Math.cos(p("razorshell", "arc", world) * Math.PI / 360);
            const nearby = context.facts.nearby as CompanionBehavior.Entity[];
            let inBand = 0;
            for (let index = 0; index < nearby.length; index++) {
                const other = nearby[index];
                if (other.friendly || !(other.health > 0)) continue;
                const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
                const distance = Math.sqrt(ox * ox + oz * oz);
                if (distance < inner || distance > outer || distance < 1e-6) continue;
                if ((ox * ux + oz * uz) / distance < halfCos) continue;
                inBand++;
            }
            return inBand >= 2 ? 40 : 22;
        }
    });

    addPreferences("razorshell", {}, [
        field(pathOf("wide"), "揽月式", "boolean", {
            help: "开启：扫过的弧更宽、削甲几率更高、湿身更久、顶得更开，代价是单下威力 ×0.88、冷却 +6；关闭：凿刃式，弧收窄但单下威力 ×1.15、冷却更短、削甲几率略低，对单点更狠。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动横扫，先走近；越大追得越执着。"
        }),
        field(pathOf("ai.crowd"), "横扫一群", "boolean", {
            help: "开启：身前新月外缘的距离带里挤着两个以上敌人时优先横扫，一次削一排护甲；关闭：不数人头，当普通中近程斩击排序。"
        })
    ]);
}
