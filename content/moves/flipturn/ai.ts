/**
 * 快速折返 / flipturn 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 8 格）以内——靠近后翻身越到它另一侧。
 * 对谁出手：被打崩前用它脱身（`ai.fleeBelow`，默认 0.4 以下排最前），或收掉残血目标；泡在水里时额外提前，
 *   因为水里滑得更远、这一翻更值。
 * 身材与退路：能越过的体型（目标不比自己高太多，且头顶清得开）加分——这一翻才真的越到背后；比自己高出一大截
 *   的巨型目标不假设能穿过去，只当作蹬一脚后退的落点，不加分反而扣分。落点不靠猜：用本招自己的 cross/glide
 *   公式和当前 `turn` 配置算出真实落点，再探那里的净空与地面支撑；逼墙、悬空或顶棚压顶时不愿往那儿翻。
 *   异于急速折返的是它不是单纯退开，而是**换到目标另一侧**——想换一条攻击线或绕到背后时也值得先出。
 * 够不到怎么办：reach 就是本招射程，不够就交给共享接近逻辑。
 * 放完之后：身位已经在目标另一侧（或伙伴身边），交回共享交战计划。
 */
namespace PokemonSkills {
    function flipturnWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    /** 本招参数按当前个体与当前配置求值；AI 复用同一份公式，不另写近似值。 */
    function flipturnParam(context: WorldBehavior.Context, capability: WorldBehavior.Capability, key: string): number {
        var world = CompanionBehavior.world(context);
        return p("flipturn", key, { world: world, actor: world.source(), skill: skills["flipturn"], detail: { values: capability.data.config } });
    }

    function flipturnTurn(capability: WorldBehavior.Capability): boolean {
        var config = capability.data && capability.data.config;
        return !!(config && config.turn === true);
    }

    /** 目标真实体积能不能从上方过：不高于自身上限，且头顶到所需弧顶之间没有更低的天花板。 */
    function flipturnCanClear(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        const selfHeight = Number(self.height) || 1.4, targetHeight = Number(target.height) || 1.4;
        if (targetHeight > selfHeight * 0.9 + 0.35) return false;
        const world = CompanionBehavior.world(context);
        const top = target.point[1] + targetHeight / 2;
        const required = top + selfHeight / 2 + 0.25;
        return WorldGeometry.blockHit(world, WorldCombat.point(target.point[0], top, target.point[2]),
            WorldCombat.point(target.point[0], required, target.point[2])) === null;
    }

    /**
     * 按当前 turn 配置算出的真实落点是否有空间站下：dive 越过 cross+glide，turn 折向 rally 内最近的伙伴
     * （没有伙伴就退到目标这一侧）；再探该点脚下是否有真实支撑、身体是否有净空。
     */
    function flipturnLandingOpen(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        if (typeof world.freeSpace !== "function") return false;
        const width = Number(self.width) || 0.9, height = Number(self.height) || 1.4;
        const cross = flipturnParam(context, capability, "cross"), glide = flipturnParam(context, capability, "glide");
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const span = Math.sqrt(dx * dx + dz * dz);
        if (span < 0.01) return false;
        const hx = dx / span, hz = dz / span;
        let gx: number, gz: number;
        if (flipturnTurn(capability)) {
            const rally = flipturnParam(context, capability, "rally");
            const nearby: CompanionBehavior.Entity[] = <any>context.facts.nearby || [];
            let ally: CompanionBehavior.Entity | null = null, best = rally;
            for (let index = 0; index < nearby.length; index++) {
                const other = nearby[index];
                if (String(other.ref) === String(self.ref) || !other.friendly || other.health <= 0) continue;
                const gap = CompanionBehavior.distance(other.point, self.point);
                if (gap < best) { best = gap; ally = other; }
            }
            if (ally !== null) { gx = ally.point[0] - hx * 1.3; gz = ally.point[2] - hz * 1.3; }
            else { gx = target.point[0] - hx * glide; gz = target.point[2] - hz * glide; }
        } else {
            gx = target.point[0] + hx * (cross + glide);
            gz = target.point[2] + hz * (cross + glide);
        }
        const targetFeet = target.point[1] - (Number(target.height) || 1.4) / 2;
        const support = WorldGeometry.blockHit(world, WorldCombat.point(gx, targetFeet + 0.4, gz), WorldCombat.point(gx, targetFeet - 4, gz));
        if (support === null) return false;
        const feet = support.position().y();
        return world.freeSpace(WorldCombat.point(gx, feet, gz), width, height);
    }

    CompanionBehavior.registerUse("flipturn", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            return !target || flipturnWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !flipturnWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 15;
            if (CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(capability, "fleeBelow", 0.4)) score += 18;
            if (CompanionBehavior.ratio(target) <= 0.35) score += 10;
            if (self.wet) score += 8;
            // 与真实抛弧同一笔预算：目标不高于自身上限且头顶清得开才真能翻过去；否则只保留撤退价值。
            if (flipturnCanClear(context, target)) score += 6; else score -= 10;
            if (flipturnLandingOpen(context, capability, target)) score += 6;
            return score;
        }
    });

    addPreferences("flipturn", {}, [
        field(pathOf("turn"), "回身式", "boolean", {
            help: "开启（回身式）：越过目标后回身落向最近的等候伙伴（没有伙伴就退到目标这一侧），滑行 ×0.8、冲撞 ×1.12。关闭（深潜式）：越过目标继续深潜远遁，滑行 ×1.3、冲撞 ×0.9。一个换更重的撞击与归队，一个换更远的脱身。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动冲上去，先靠近；比冲刺距离略宽，调大更愿意先手，调小则只在贴身时折返。"
        }),
        field(pathOf("ai.fleeBelow"), "脱身血量", "number", {
            min: 0.15, max: 0.9, step: 0.05,
            help: "自己血量比例低于这个值时，把快速折返排到最前用来翻身脱身；调高更早脱身，调低只在濒危时才用。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会翻身脱离；关闭则只在原地方便时施放。"
        })
    ]);
}
