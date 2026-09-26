/**
 * 龙之舞 / dragondance 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、且在 ai.maxChase 内、且头顶有真实盘升空间时，先盘旋一圈再打。
 * 什么时候最想出手：差距还在 ai.minGap 之外时 priority 100 越过共享交战次序；生命低于一半且确实有空间
 *   盘上去时抬到 110——低血只有在真能用速度脱身时才更值得起舞，安全局面不会被它无条件压过。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。会给动作一个指向威胁的明确瞄向，方便身体朝向战局。
 * 放完之后：攻速各 +1、身上挂着龙势窗口；窗口还在且已到上限时不再重复起舞，交回共享交战计划。
 */
namespace PokemonSkills {
    /** 头顶是否真的容得下这次盘升；贴地配置不需要顶棚。按决策帧缓存一次原生空域探针。 */
    function dragondanceRoom(context: any, capability: any): boolean {
        const config = capability && capability.data ? capability.data.config : null;
        if (config && config.soar === false) return true;
        const self = CompanionBehavior.source(context);
        return CompanionBehavior.observedFlag(context, "dragondance:room:" + self.ref, function () {
            const world = CompanionBehavior.world(context);
            if (typeof world.freeSpace !== "function") return true;
            const width = typeof self.width === "number" && self.width > 0 ? self.width : 0.9;
            const height = typeof self.height === "number" && self.height > 0 ? self.height : 1.4;
            const probe = CompanionBehavior.point([self.point[0], self.point[1] + Math.max(1, height), self.point[2]]);
            return world.freeSpace(probe, width, height);
        });
    }

    CompanionBehavior.registerUse("dragondance", {
        protocols: ["world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "dragondance")
                && CompanionBehavior.stage(context, self, "atk") >= 6 && CompanionBehavior.stage(context, self, "spe") >= 6) return false;
            if (!threat) return false;
            const distance = CompanionBehavior.distance(self.point, threat.point);
            if (!(distance >= CompanionBehavior.ai<number>(capability, "minGap", 3)
                && distance <= CompanionBehavior.ai<number>(capability, "maxChase", 16))) return false;
            return dragondanceRoom(context, capability);
        },
        accepts: function (context, capability, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        // 自施放只借这个对象定出朝向，宿主仍以自身为动作实体。
        target: function (context) {
            return context.senses["world_combat:threat"];
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 3)) return 0;
            const escape = CompanionBehavior.ratio(self) < 0.5 && dragondanceRoom(context, capability);
            return escape ? 110 : 100;
        }
    });

    addPreferences("dragondance", {}, [
        field(pathOf("ai.maxChase"), "起舞距离", "number", {
            min: 4, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑先盘旋；越大越早开始叠攻速。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再起舞、直接攻击；调大更常在近身时放弃强化。"
        })
    ]);
}
