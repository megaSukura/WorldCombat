/**
 * 落石 / rockthrow 的出手方式。
 *
 * 核心念头：**低头从脚边地上抄起一块小石，平直、快速地把它甩出去**——它是岩系里最随手的一记：
 *   起手最短、冷却最低、只出一块石头，也什么都不留下。石头朝松手那一刻的位置飞、不追踪，所以对手
 *   在石头离手后挪一步就能让开；这一记卖的是「便宜、能动、可以一记接一记地扔」。
 *
 * 两幕（提交前只播预告）：
 *   抄（scoop，提交前）：低头、脚边尘土与石屑向手心收，只抄起**一块**石，只播预告。
 *   扔（release → flight → hit / ground）：提交后把石头沿瞄准方向甩出；平击式贴身体高度平直飞，
 *       高抛式用 ballisticSolutions 解出一道身体半径净空、散布容差内仍越过矮墙的弧。命中活物砸一记
 *       `stone` 物理伤害并崩出石屑；落到地面只扬一点尘。石头材质取自脚点正下方，不从身体上方取。
 *
 * 与同族分开：岩石爆击是一梭带弧线的多发石、把落点砸成碎石；岩石封锁投重石封地；岩崩罩一片；
 *   落石只有一块、走直线、不接触地面、不留痕——玩家凭「一小块石头快而平地飞出去」认出它。
 *
 * 选取 `kind: "aim"`：方向、世界点或任意阵营实体都能投，无敌也能空放；命中权限仍由命中层判断。
 *   高抛只在有真实落点时按该点解弧；解不出能越过掩体的清晰弧就明确失败，不退回假直射越障。
 *
 * 配置 `lob`（高抛式）由公式改弧坠/散布/威力/石速、由 resolve 改时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const rockthrowScene = "world_combat:move_rockthrow";
    const rockthrowMissText = "world_combat.move.rockthrow.text.miss";

    /** 把地表方块归到一个「岩石类」材质：沙归沙岩、深板岩归碎深板岩，其余石质归圆石。 */
    function rockthrowGroundMaterial(id: string): string {
        const value = String(id);
        if (value.indexOf("red_sand") >= 0) return "minecraft:red_sandstone";
        if (value.indexOf("sand") >= 0) return "minecraft:sandstone";
        if (value.indexOf("deepslate") >= 0) return "minecraft:cobbled_deepslate";
        if (value.indexOf("blackstone") >= 0) return "minecraft:blackstone";
        if (value.indexOf("basalt") >= 0) return "minecraft:basalt";
        if (value.indexOf("netherrack") >= 0) return "minecraft:netherrack";
        if (value.indexOf("tuff") >= 0) return "minecraft:tuff";
        if (value.indexOf("andesite") >= 0) return "minecraft:andesite";
        if (value.indexOf("diorite") >= 0) return "minecraft:diorite";
        if (value.indexOf("granite") >= 0) return "minecraft:granite";
        if (value.indexOf("terracotta") >= 0) return "minecraft:terracotta";
        if (value.indexOf("gravel") >= 0) return "minecraft:gravel";
        if (value.indexOf("ice") >= 0) return "minecraft:packed_ice";
        if (value.indexOf("obsidian") >= 0) return "minecraft:obsidian";
        if (value.indexOf("dirt") >= 0 || value.indexOf("podzol") >= 0 || value.indexOf("mycelium") >= 0) return "minecraft:dirt";
        return "minecraft:cobblestone";
    }

    /** 读施法者脚点起向下最近的一层实心方块，作为这一块石头的材质来源（不从身体上方取）。 */
    function rockthrowSurface(world: CombatWorld, at: CombatPoint): string {
        for (let dy = 0; dy >= -4; dy--) {
            const block = world.block(WorldCombat.point(at.x(), at.y() + dy, at.z()));
            if (block === null) continue;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava") continue;
            return rockthrowGroundMaterial(id);
        }
        return "minecraft:cobblestone";
    }

    /** 把抛掷方向绕世界 Y 轴偏一个角度，做出散布。 */
    function rockthrowScatter(direction: CombatPoint, angle: number): CombatPoint {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);
    }

    /** 这一抛可以等待的最长飞行时间（刻）；执行与 AI 读同一个预算，不靠直距暗中加射程。 */
    export function rockthrowFlightTicks(distance: number, speed: number): number {
        return Math.max(30, Math.round((distance + 4) / Math.max(0.3, speed)) + 30);
    }

    /**
     * 沿解出的真实弹道逐段查墙：中心线用 WorldGeometry.blockHit（clipBlocks 畅通也返回 MISS），
     * 再按石头身体半径向上、左右各外扩一档，要求净空容得下这块石头。地面由中心线与落点本身约束，
     * 因此不向下外扩——否则贴近地面的落点会被脚下的地块误判成挡住。
     */
    export function rockthrowArcClear(world: CombatWorld, points: CombatPoint[], radius: number): boolean {
        for (let index = 1; index < points.length; index++) {
            const from = points[index - 1], to = points[index], delta = to.minus(from);
            if (delta.length() < 1e-6) continue;
            if (WorldGeometry.blockHit(world, from, to) !== null) return false;
            if (radius > 0) {
                const horizontal = WorldCombat.point(delta.x(), 0, delta.z());
                const side = horizontal.length() < 1e-6 ? WorldCombat.point(1, 0, 0)
                    : WorldCombat.point(-horizontal.z(), 0, horizontal.x()).unit();
                const up = WorldCombat.point(0, radius, 0), right = side.scale(radius);
                if (WorldGeometry.blockHit(world, from.plus(up), to.plus(up)) !== null) return false;
                if (WorldGeometry.blockHit(world, from.plus(right), to.plus(right)) !== null) return false;
                if (WorldGeometry.blockHit(world, from.minus(right), to.minus(right)) !== null) return false;
            }
        }
        return true;
    }

    /**
     * 高抛式的实际可达清晰弧：用 ballisticSolutions 解出这条速度下的低弧/高弧，从最高往下挑第一条
     * 身体半径净空、且把散布容差内的偏角也考虑进去仍畅通的解；都不可达就返回 null，不退回假直射越障。
     */
    export function rockthrowLobArc(world: CombatWorld, origin: CombatPoint, landing: CombatPoint,
        speed: number, gravity: number, radius: number, spreadDegrees: number): LivingActions.BallisticSolution | null {
        const distance = landing.minus(origin).length();
        if (!(distance > 0.01) || !(gravity > 0) || !(speed > 0)) return null;
        const solutions = LivingActions.ballisticSolutions(origin, landing, speed, gravity, rockthrowFlightTicks(distance, speed));
        const tolerance = Math.max(0, spreadDegrees) * Math.PI / 180;
        for (let index = solutions.length - 1; index >= 0; index--) {
            const solution = solutions[index];
            if (!rockthrowArcClear(world, solution.points, radius)) continue;
            if (tolerance > 0) {
                let clear = true;
                for (let side = -1; side <= 1 && clear; side += 2) {
                    const velocity = rockthrowScatter(solution.direction, side * tolerance).scale(speed);
                    if (!rockthrowArcClear(world, LivingActions.ballisticPath(origin, velocity, gravity, solution.ticks), radius)) clear = false;
                }
                if (!clear) continue;
            }
            return solution;
        }
        return null;
    }

    /** 原生方块表面法线；未知接触回退竖直向上，供碎石贴面铺开。 */
    function rockthrowFaceNormal(face: string): number[] {
        if (face === "down") return [0, -1, 0];
        if (face === "north") return [0, 0, -1];
        if (face === "south") return [0, 0, 1];
        if (face === "west") return [-1, 0, 0];
        if (face === "east") return [1, 0, 0];
        return [0, 1, 0];
    }

    define({
        id: "rockthrow",
        cooldownParameter: "recharge",
        name: "Rock Throw",
        description: "从脚边地上抄起一块小石，平直、快速地甩向瞄准的方向或落点：一块石头一次伤害，砸中崩出石屑。可以朝任意方向/落点空投，不要求先锁定对手；石头不追踪，对手在它离手后挪一步就能让开；高抛式能越过矮墙，但更散更慢。",
        uses: ["便宜的远程消耗，一记接一记地扔", "对站着不动的目标稳定点射", "用高抛式越过掩体打后面的目标"],
        kind: "aim",
        range: 6,
        maxRange: 12,
        prepare: 4,
        active: 0,
        recover: 5,
        cooldown: 11,
        style: "rock",
        maximumTicks: 120,
        defaults: { lob: false, ai: { maxChase: 12, finish: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("rockthrow", "reach", pokemon), geometry: "line", style: "rock", color: 0xA98C6A,
                label: config && config.lob === true ? "高抛落石" : "平击落石" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["rockthrow"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("rockthrow", "tempo", context)),
                recover: Math.round(p("rockthrow", "aftercast", context)),
                cooldown: Math.round(p("rockthrow", "recharge", context)),
                active: 0,
                range: p("rockthrow", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            const radius = p("rockthrow", "radius", action);
            action.present("world_combat:rockthrow:" + action.id(), rockthrowScene, 1, action.origin(), JSON.stringify({
                moment: "scoop", lob: config && config.lob === true ? 1 : 0, scale: scale,
                stone: Math.max(0.5, Math.min(1.6, radius / 0.22)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const point = action.targetPosition();
            const power = p("rockthrow", "stone", action);
            const speed = Math.max(0.4, p("rockthrow", "velocity", action));
            const gravity = Math.max(0, p("rockthrow", "arc", action));
            const radius = Math.max(0.12, p("rockthrow", "radius", action));
            const reach = Math.max(3, p("rockthrow", "reach", action));
            const spread = Math.max(0.5, p("rockthrow", "scatter", action));
            const shards = Math.max(4, Math.round(p("rockthrow", "shards", action)));
            const lob = !!(config && config.lob);
            const body = action.sense().observe(action.actor());
            const foot = body !== null ? WorldCombat.point(body.position().x(), body.boundsMin().y(), body.position().z()) : origin;
            const material = rockthrowSurface(world, foot);
            const scale = Math.max(0.6, Math.min(1.6, radius / 0.22));
            const intensity = Math.max(0.5, Math.min(2.0, power / 40));
            const distance = point.minus(origin).length();
            const scenes = WorldFeedback.actionScenes(rockthrowScene);
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            // 高抛只在真的有落点时按该点解一道清晰弧；解不出就不抛假直射越障，原地扬一蓬灰收势。
            let direction: CombatPoint | null = null, flightRange = reach, flightLifetime = 0;
            if (lob && distance > 0.25) {
                const solution = rockthrowLobArc(world, origin, point, speed, gravity, radius, spread);
                if (solution === null) {
                    WorldFeedback.emit(world, rockthrowScene, 1, origin,
                        { moment: "ground", shards: Math.round(shards * 0.5), scale: scale, face: "", direction: [0, 1, 0], blocked: 0 }, 16);
                    WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 0.5, 0)), rockthrowMissText, [], 18);
                    finish(action);
                    return;
                }
                direction = solution.direction;
                flightRange = Math.max(1.5, solution.length + 0.6);
                flightLifetime = Math.max(24, Math.ceil(solution.ticks) + 8);
            } else {
                direction = aim(action);
                flightLifetime = Math.max(24, Math.round(reach / Math.max(0.3, speed)) + 24);
            }
            direction = rockthrowScatter(direction, (world.random() * 2 - 1) * spread * Math.PI / 180);

            sound(action, "cobblemon:move.rockthrow.actor");
            WorldFeedback.emit(world, rockthrowScene, 1, origin,
                { moment: "release", lob: lob ? 1 : 0, shards: shards, scale: scale, intensity: intensity }, 16, "rockthrow:release");

            const flight = LivingActions.projectile(action, {
                speed: speed, direction: direction, gravity: gravity, range: flightRange,
                radius: radius, lifetime: flightLifetime,
                appearance: { block: material, spin: true, scale: Math.max(0.4, Math.min(0.9, radius * 2.2)) } as any,
                impact: function (inner: CombatAction, hit: CombatImpact): void {
                    const scope = inner.world(), at = hit.position(), struck = hit.target();
                    // 石头停下的那一刻，跟随它的飞行表现随之收尾，不空转。
                    scenes.stop(inner, "flight");
                    if (hit.hitEntity() && struck !== null && scope.valid(struck) && !scope.friendly(struck)) {
                        if (!impact(inner, hit, "rockthrow", power, { damage: damageSpec("rockthrow", "stone") })) return;
                        WorldFeedback.emit(scope, rockthrowScene, 1, at,
                            { moment: "hit", target: String(struck.ref()), shards: shards, scale: scale, intensity: intensity }, 20);
                        sound(inner, "cobblemon:impact.rock");
                        return;
                    }
                    // 打到方块：在真实接触点（position()）按接触面外法线呈现撞点；不再用方块格中心或固定抬高。
                    const face = hit.blockFace();
                    WorldFeedback.emit(scope, rockthrowScene, 1, at,
                        { moment: "ground", shards: Math.round(shards * 0.5), scale: scale, face: face,
                            direction: rockthrowFaceNormal(face), blocked: hit.blocked() ? 1 : 0 }, 16);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.5, 0)), rockthrowMissText, [], 18);
                }
            }, function (inner: CombatAction) { finish(inner); });
            // 飞行只由本次动作拥有：转段或结束即收尾，不再用固定时长的独立 keep 空转。
            scenes.show(action, "flight", origin,
                { moment: "flight", projectile: flight, shards: shards, scale: scale, intensity: intensity });
        }
    });
}
