/**
 * 跃起 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见、存活、敌对的威胁在 `ai.maxChase`（默认 14）以内。只会跃起的个体（比如鲤鱼王）
 *   一直愿意用它换位；有正经攻击手段的伙伴则只在**被近身逼住**（贴到 `ai.keepAway` 以内、正被它打、
 *   或刚挨了它一下）且侧向/背离方向存在可站落点时才跳开，不再仅因有攻击招就彻底禁用。
 * 对谁出手：不选对象——落点由 `target` 钩子算成背离威胁或侧向的一个点，并用原生 freeSpace 探针挑能站下的。
 * 够不到怎么办：射程就是这一跳的距离，以自身为落点参照，不需要先走近谁。
 * 放完之后：只换了位置，交回共享顺序继续；高跃／低远由配置 leap 切换。
 */
namespace PokemonSkills {
    /** 是否握有可用 PP 的攻击手段；有攻击手段的个体只在真的被逼住时跳。 */
    function splashHasAttack(context: WorldBehavior.Context): boolean {
        const capabilities = context.capabilities || [];
        for (let index = 0; index < capabilities.length; index++) {
            const item = capabilities[index], data = item.data || {};
            if (item.protocols.indexOf("world_combat:attack") >= 0 && (data.pp === undefined || data.pp > 0)) return true;
        }
        return false;
    }

    /** 当前是否被可见威胁贴住或正被它打（近身逼近）。 */
    function splashPressed(context: WorldBehavior.Context, item: WorldBehavior.Capability,
                           threat: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(item, "keepAway", 4)) return true;
        return threat.attacking === self.ref || self.lastAttacker === threat.ref || self.hurtAgo <= 20;
    }

    /** 侧向或背离威胁的方向上有没有一个能站下的落点；用原生 freeSpace 探针（脚底坐标）。 */
    function splashLandingFree(context: WorldBehavior.Context, item: WorldBehavior.Capability,
                               threat: CompanionBehavior.Entity | null): boolean {
        const world = CompanionBehavior.world(context), body = world.observe(world.source());
        if (body === null) return false;
        const self = CompanionBehavior.source(context);
        const reach = Math.max(0.8, Number(item.data.range) || 0.8);
        const feet = self.point[1] - body.height() / 2;
        const candidates: number[][] = [];
        if (threat) {
            const dx = self.point[0] - threat.point[0], dz = self.point[2] - threat.point[2];
            const length = Math.sqrt(dx * dx + dz * dz) || 1, ax = dx / length, az = dz / length;
            candidates.push([ax * reach, az * reach]);
            candidates.push([-az * reach, ax * reach]);
            candidates.push([az * reach, -ax * reach]);
        } else {
            candidates.push([reach, 0], [-reach, 0], [0, reach], [0, -reach]);
        }
        for (let index = 0; index < candidates.length; index++) {
            const point = WorldCombat.point(self.point[0] + candidates[index][0], feet, self.point[2] + candidates[index][1]);
            if (world.freeSpace(point, body.width(), body.height())) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse(splashId, {
        protocols: ["world_combat:cover"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, _target) {
            if (context.facts.mounted) return false;
            const threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
            if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(item, "maxChase", 14)) return false;
            if (!splashHasAttack(context)) return true;
            return splashPressed(context, item, threat) && splashLandingFree(context, item, threat);
        },
        accepts: function () { return true; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        target: function (context, item, _target) {
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
            const copy: any = JSON.parse(JSON.stringify(self));
            const reach = Math.max(0.8, Number(item.data.range) || 0.8);
            if (!threat) { copy.point = [self.point[0], self.point[1], self.point[2] + reach]; return copy; }
            const dx = self.point[0] - threat.point[0], dz = self.point[2] - threat.point[2], length = Math.sqrt(dx * dx + dz * dz) || 1;
            const ax = dx / length, az = dz / length;
            const world = CompanionBehavior.world(context), body = world.observe(world.source());
            const feet = self.point[1] - (body ? body.height() / 2 : 0.7);
            const options: number[][] = [
                [self.point[0] + (-az) * reach, self.point[2] + ax * reach],
                [self.point[0] + az * reach, self.point[2] + (-ax) * reach],
                [self.point[0] + ax * reach, self.point[2] + az * reach]
            ];
            if (body !== null) {
                for (let index = 0; index < options.length; index++) {
                    if (world.freeSpace(WorldCombat.point(options[index][0], feet, options[index][1]), body.width(), body.height())) {
                        copy.point = [options[index][0], self.point[1], options[index][1]];
                        return copy;
                    }
                }
            }
            copy.point = [self.point[0] + ax * reach, self.point[1], self.point[2] + az * reach];
            return copy;
        },
        priority: function (context, item, _target) {
            const threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            if (!splashHasAttack(context)) return CompanionBehavior.distance(self.point, threat.point) > 1.5 ? 20 : 8;
            if (!splashPressed(context, item, threat) || !splashLandingFree(context, item, threat)) return 0;
            return CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(item, "retreatBelow", 0.5) ? 70 : 45;
        }
    });

    addPreferences(splashId, { leap: false, ai: { maxChase: 14, retreatBelow: 0.5, keepAway: 4 } }, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", { min: 3, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑蹦跳；调大更愿意远远地换位。" }),
        field(pathOf("ai.retreatBelow"), "危急阈值", "number", { min: 0.1, max: 0.9, step: 0.05,
            help: "有攻击手段时，生命低于这个比例且被逼住会把这一跳当作逃离（优先级更高）；调高更早撤，调低只在濒危时跳。" }),
        field(pathOf("ai.keepAway"), "近身距离", "number", { min: 1, max: 8, step: 1,
            help: "敌人贴到这个距离以内就算被近身逼住；有攻击手段的伙伴此时才会跳开，落点另用 freeSpace 探针挑选。" })
    ]);
}
