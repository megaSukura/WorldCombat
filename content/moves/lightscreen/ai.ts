/**
 * 光墙 的伙伴 AI 用途：这是这招自己的一套出手计划——把柔光竖幕立在敌方火线与队友之间。
 *
 * 什么局面有意义：有可见、存活、在 ai.maxChase 以内的威胁，自己身边还没有同类幕（载体身份或附近场地都算），
 *   ai.opening=受压时张幕（默认）只在对手正攻击自己或主人、或自己刚被打过时立；=随时时见威胁就先立上。
 *   ai.protectWeak 开启时，只在自己或半径内友方生命低于 65% 时才立幕——留着护残血。
 * 对谁出手：以自己与威胁之间、可站立的前方点为目标（ref 为空，走 point 施放），法线由施法者指向该点；不是旧的自身目标。
 * 候选之间怎么排：正在被打时抬到 100 越过分派顺序，先把幕立起来；其余情况 44。
 * 放完之后：幕替幕后一侧削特殊、滤附带效果；幕还在时不再重复，队友绕过幕外不会假有护盾。
 * 配置 thick（厚幕／柔幕）改变减伤与滤淡；ai.maxChase、ai.opening、ai.protectWeak 决定追多远、什么时候立幕。
 */
namespace PokemonSkills {
    function lightscreenPressured(context: WorldBehavior.Context, capability: WorldBehavior.Capability): boolean {
        const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"], self = CompanionBehavior.source(context);
        if (!threat) return false;
        const owner = context.facts.owner;
        return self.hurtAgo < 60 || threat.attacking === self.ref || !!owner && threat.attacking === owner.ref;
    }
    function lightscreenWeak(context: WorldBehavior.Context): boolean {
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.ratio(self) < 0.65) return true;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, self.point) > 6) continue;
            if (CompanionBehavior.ratio(other) < 0.65) return true;
        }
        return false;
    }
    function lightscreenCell(point: number[]): CombatPoint {
        return WorldCombat.point(point[0], point[1], point[2]);
    }
    /** 已有一面同类幕压在交战中线附近时不再重复：只按最强一面减伤，重复摆幕是浪费。 */
    function lightscreenAlready(context: WorldBehavior.Context, self: CompanionBehavior.Entity, threat: CompanionBehavior.Entity | null): boolean {
        const world = CompanionBehavior.world(context);
        if (threat) {
            const mid = [(self.point[0] + threat.point[0]) / 2, self.point[1], (self.point[2] + threat.point[2]) / 2];
            if (WorldEffects.areasAround(world, lightscreenCell(mid), 6, lightscreenMark).length > 0) return true;
        }
        return WorldEffects.areasAround(world, lightscreenCell(self.point), 3, lightscreenMark).length > 0;
    }
    /** 自己与威胁之间偏自己一侧、可站立的前方点；ref 为空表示按 point 施放。 */
    function lightscreenPick(context: WorldBehavior.Context, capability: WorldBehavior.Capability): CompanionBehavior.Entity {
        const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
        const copy: CompanionBehavior.Entity = JSON.parse(JSON.stringify(self));
        copy.ref = "";
        const world = CompanionBehavior.world(context), actor = world.actor(self.ref), body = actor && world.observe(actor);
        const feet = body ? body.boundsMin().y() : self.point[1] - (self.height || 1.4) / 2;
        copy.point[1] = feet;
        if (!threat) return copy;
        const dx = threat.point[0] - self.point[0], dz = threat.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return copy;
        const range = Number(capability.data.range) || 6;
        const distance = Math.min(range, Math.max(1.5, length * 0.5));
        const height = Math.max(2, (self.height || 1.4) * 1.5);
        for (let factor = 1; factor > 0.25; factor -= 0.25) {
            const point = [self.point[0] + dx / length * (distance * factor), feet, self.point[2] + dz / length * (distance * factor)];
            if (world.freeSpace(lightscreenCell(point), 0.5, height)) { copy.point = point; return copy; }
        }
        copy.point = [self.point[0] + dx / length * distance, feet, self.point[2] + dz / length * distance];
        return copy;
    }

    CompanionBehavior.registerUse(lightscreenId, {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, lightscreenStatus)) return false;
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return false;
            if (CompanionBehavior.ai<string>(capability, "opening", "incoming") === "incoming" && !lightscreenPressured(context, capability)) return false;
            if (CompanionBehavior.ai<boolean>(capability, "protectWeak", false) && !lightscreenWeak(context)) return false;
            return !lightscreenAlready(context, self, threat);
        },
        accepts: function () { return true; },
        target: function (context, capability) { return lightscreenPick(context, capability); },
        priority: function (context, capability) { return lightscreenPressured(context, capability) ? 100 : 44; }
    });

    const lightscreenAiChase = number("ai.maxChase", "考虑距离", 4, 26, 1);
    lightscreenAiChase.help = "伙伴只在威胁离自己这么远以内时才考虑立幕；调小只在贴身受压时立，调大在更远处就先摆好幕位。";
    const lightscreenAiOpening = choice("ai.opening", "出手时机", ["incoming", "anytime"], ["受压时张幕", "随时"]);
    lightscreenAiOpening.help = "受压时张幕：只在对手正攻击自己或主人、或自己刚被打过时立；随时：见威胁就先摆上。";
    const lightscreenAiWeak = flag("ai.protectWeak", "留到有人残血才张");
    lightscreenAiWeak.help = "开启后，只有自己或身边 6 格内友方生命低于 65% 时才立光幕；关闭则见威胁就立。";
    const lightscreenAiStation = flag("ai.leaveStation", "驻守时允许离位");
    lightscreenAiStation.help = "开启后，收到「驻守」指令时也会离开原位去立光幕。";

    addPreferences(lightscreenId, { ai: { maxChase: 14, opening: "anytime", protectWeak: false, leaveStation: false } },
        [lightscreenAiChase, lightscreenAiOpening, lightscreenAiWeak, lightscreenAiStation]);
}
