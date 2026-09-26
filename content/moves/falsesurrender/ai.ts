/**
 * 假跪真撞 / falsesurrender 的 AI 用途。
 *
 * 什么局面下出手：贴身的可见敌对目标；够不到交给共享接近逻辑。`ai.punish`（默认开）时，注意不在自己身上、
 * 或正背对自己向外移动的目标抬高 priority——伏低的骗术正是打这种目标。它不把「失去关注」当发动门槛：
 * 没分神的目标照样按普通近身突刺出手，只是没有伏低加成。
 * 风险：伏低期间自己不能动，正盯着自己且血量吃紧时降低推荐；墙挡在中间则够不到，不列入候选。
 */
namespace PokemonSkills {
    /** 施法者与目标之间是否无遮挡；墙挡着就够不到。同一决策帧内缓存。 */
    function falsesurrenderClear(context: WorldBehavior.Context, target: WorldMethods.Subject): boolean {
        return CompanionBehavior.observedFlag(context, "falsesurrender:clear:" + target.ref, function () {
            const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            return world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        });
    }

    CompanionBehavior.registerUse("falsesurrender", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return false;
            return falsesurrenderClear(context, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            let base = gap <= capability.data.range ? 20 : 6;
            if (!CompanionBehavior.ai<boolean>(capability, "punish", true)) return base;
            const attention = target.attacking;
            if (!attention || attention !== self.ref) {
                // 目标盯着别人或没在出手 → 伏低的骗术成立，优先出手。
                return base + 14;
            }
            if (CompanionBehavior.ratio(self) < 0.4) {
                // 正盯着自己且血量吃紧：伏低的风险没人分担，降一档。
                return base - 8;
            }
            // 侧击：目标正背对自己向外移动，也是骗到注意的时机。
            const velocity = CompanionBehavior.velocity(context, target);
            if (velocity) {
                const away = [target.point[0] - self.point[0], 0, target.point[2] - self.point[2]];
                if (velocity[0] * away[0] + velocity[2] * away[2] > 0.0002) return base + 8;
            }
            return base;
        }
    });

    addPreferences("falsesurrender", {}, [
        field(pathOf("grovel"), "伏低", "boolean", {
            help: "开启：伏得更深，发梢距离约 +15%、伏低加成约 ×1.25，但伏低多 4 刻（暴露更久）。关闭：浅伏，起手更快、暴露更短，够得近些、加成小些。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 14, step: 1,
            help: "超过这个距离就不主动伏低，先走近。越大越愿意从较远处发难。"
        }),
        field(pathOf("ai.punish"), "趁虚而入", "boolean", {
            help: "开启后，注意不在自己身上的目标优先（伏低的骗术最值）；关闭则只按普通中近程突刺排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为接近目标离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
