/**
 * 屏障 的伙伴 AI 用途：把掩体铺在威胁的来路上。
 *
 * 什么局面有意义：有可见威胁（`world_combat:threat`）、自己身上还没有屏障窗口、威胁在 ai.maxChase 以内且不近于 ai.minGap。
 * 往哪里立：沿威胁（按当前速度预判 `ai.lead` 刻后的来路）的方向，在自己与威胁之间取一点，离自己大约半个射程、
 *   又留出贴身下限；点再用原生探针确认落在地表、有可行走空间。
 * 不堵谁：若这堵墙的横宽会把贴着墙面的友方隔在威胁一侧，这次就放弃立墙。
 * 对谁出手：fortify 目标就是自己，墙的方向由感知到的当前威胁决定，不需要选中谁。
 * 放完之后：墙与防御窗口都在，伙伴交回共享顺序；屏障窗口还在时不重复。
 * 配置 tall（高屏／壁垒）改变墙的高矮、宽窄与远近；ai.maxChase、ai.minGap、ai.lead 决定追多远、什么时候立墙、预判多少。
 */
namespace PokemonSkills {
    function barrierThreat(context: WorldBehavior.Context): CompanionBehavior.Entity | null {
        return (context.senses["world_combat:threat"] as CompanionBehavior.Entity) || null;
    }

    function barrierWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, threat: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (threat.friendly || threat.health <= 0 || !threat.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.status(context, self, "barrier")) return false;
        const gap = CompanionBehavior.distance(self.point, threat.point);
        if (gap < CompanionBehavior.ai<number>(capability, "minGap", 3)) return false;
        return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
    }

    /** 预判威胁来路的水平方向：按它当前速度提前 `ai.lead` 刻，没有速度就用它当前位置。 */
    function barrierHeading(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: CompanionBehavior.Entity): CombatPoint {
        const self = CompanionBehavior.source(context), velocity = threat.velocity;
        const lead = CompanionBehavior.ai<number>(item, "lead", 6);
        const ax = threat.point[0] + Number(velocity ? velocity[0] : 0) * lead;
        const az = threat.point[2] + Number(velocity ? velocity[2] : 0) * lead;
        const dx = ax - self.point[0], dz = az - self.point[2], length = Math.sqrt(dx * dx + dz * dz);
        return length < 0.05 ? WorldCombat.point(0, 0, 1) : WorldCombat.point(dx / length, 0, dz / length);
    }

    /** 立墙点离自己在半个射程，但至少留出 minGap，也不越过威胁本身。 */
    function barrierStandoff(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: CompanionBehavior.Entity): number {
        const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
        const reach = Number(item.data.range) || 4, floor = CompanionBehavior.ai<number>(item, "minGap", 3);
        return Math.max(floor, Math.min(distance - 1.5, reach * 0.55));
    }

    /** 拟建墙的横宽会不会把贴着墙面的友方隔在威胁一侧；会就别立。 */
    function barrierBlocksAlly(context: WorldBehavior.Context, self: CompanionBehavior.Entity, heading: CombatPoint,
                                standoff: number, halfWidth: number): boolean {
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || !other.friendly || other.health <= 0) continue;
            const dx = other.point[0] - self.point[0], dz = other.point[2] - self.point[2];
            const along = dx * heading.x() + dz * heading.z(), side = Math.abs(dx * heading.z() - dz * heading.x());
            if (along > standoff - 1.5 && along < standoff + 2.0 && side < halfWidth + 0.8) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("barrier", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability) {
            if (context.facts.mounted) return false;
            const threat = barrierThreat(context);
            return threat !== null && barrierWants(context, capability, threat);
        },
        accepts: function (context, _capability, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        target: function (context, capability, _selected) {
            const threat = barrierThreat(context);
            if (threat === null || !barrierWants(context, capability, threat)) return null;
            const self = CompanionBehavior.source(context), world = CompanionBehavior.world(context);
            const heading = barrierHeading(context, capability, threat);
            const standoff = barrierStandoff(context, capability, threat);
            if (standoff <= 1.0) return null;
            const tall = !!(capability.data.config && capability.data.config.tall);
            if (barrierBlocksAlly(context, self, heading, standoff, tall ? 1.4 : 2.8)) return null;
            const centre = CompanionBehavior.point(self.point).plus(heading.scale(standoff));
            const ground = WorldGeometry.ground(world, centre, 5);
            if (!world.freeSpace(ground.plus(WorldCombat.point(0, 0.1, 0)), 1, 1)) return null;
            // 超出射程就交给共享接近逻辑，先用自身目标走近。
            if (ground.minus(CompanionBehavior.point(self.point)).length() > Number(capability.data.range)) return _selected;
            const choice = JSON.parse(JSON.stringify(self));
            choice.ref = ""; choice.point = [ground.x(), ground.y(), ground.z()];
            return choice;
        },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability) {
            const threat = barrierThreat(context);
            if (threat === null || !barrierWants(context, capability, threat)) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
            // 抢在贴身前立墙；已经贴身就退回普通次序，贴脸立墙挡不住也堵自己。
            return gap > CompanionBehavior.ai<number>(capability, "minGap", 3) ? 100 : 44;
        }
    });

    addPreferences("barrier", {}, [
        field(pathOf("ai.maxChase"), "立墙距离", "number", {
            min: 3, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑立墙；越大越早准备，越小只挡已经逼近的对手。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 12, step: 1,
            help: "威胁近于这个距离时不再立墙、直接应对；调大更常在近身时放弃立墙（贴脸立墙挡不住也堵自己）。"
        }),
        field(pathOf("ai.lead"), "预判来路", "number", {
            min: 0, max: 20, step: 1,
            help: "对移动中的威胁提前这么多刻取来路方向，把墙铺在它要经过的位置；0 表示只看它当前所在方向。"
        })
    ]);
}
