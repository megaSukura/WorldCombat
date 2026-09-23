/**
 * 屏障 / barrier — 执行组织。
 *
 * 核心念头：在身前竖起一排半透明的硬光板，把冲过来的东西挡在外面——墙立着，术者的防御也抬起来。
 *
 * 两幕：
 *   聚（windup 播「聚板」，提交前只观察与预告，打断不花代价）。
 *   立（提交后）：`world.terrain` 把硬光板租借成身前一排真实方块（`linger` 活过招式，到期原方块回来），
 *     同时 NativeEffects.boost(def, gift) 写入公共能力阶梯，挂上共享身份 world_combat:status/barrier 的「屏障」窗口。
 * 结束：屏障窗口被清除或到期时收回抬起的等级并播放崩解；墙体按租借时长自行崩回原方块。
 */
namespace PokemonSkills {
    const barrierScene = "world_combat:move_barrier";
    const barrierVeil = "world_combat:barrier_veil";
    const barrierWallBlock = "minecraft:light_blue_stained_glass";
    const barrierRaiseText = "world_combat.move.barrier.text.raise";
    const barrierShatterText = "world_combat.move.barrier.text.shatter";
    /** 表现里的参考宽度：`data.scale = 实际屏障宽度 / 这个数`。 */
    const barrierReferenceSpan = 2.4;

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function barrierStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 抬高并返回这一次真正抬到的级数（顶到上限时可能少于请求值）。 */
    function barrierRaise(world: CombatWorld, actor: CombatActor, stat: string, amount: number): number {
        const before = barrierStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, amount);
        return Math.max(0, barrierStage(world, actor, stat) - before);
    }
    /** 这格硬光板会不会落在某个存活生物的碰撞箱里；会就跳过，免得把谁封进墙里。 */
    function barrierBlocked(world: CombatWorld, x: number, y: number, z: number): boolean {
        const bodies = world.query(WorldCombat.point(x + 0.5, y + 0.5, z + 0.5), 3.0, false);
        for (let i = 0; i < bodies.length; i++) {
            const facts = world.observe(bodies[i]);
            if (facts === null) continue;
            const centre = facts.position(), half = facts.width() / 2, tall = facts.height() / 2;
            if (centre.x() + half > x && centre.x() - half < x + 1 && centre.z() + half > z && centre.z() - half < z + 1
                && centre.y() + tall > y && centre.y() - tall < y + 1) return true;
        }
        return false;
    }
    /** 面向最近的非友方活体（水平单位向量）；没有就退回施放朝向。墙因此总挡在威胁的方向。 */
    function barrierTowards(world: CombatWorld, actor: CombatActor, fallback: CombatPoint): CombatPoint {
        const body = world.observe(actor);
        if (body === null) return fallback;
        const from = body.position();
        const actors = world.query(from, 14, false);
        let heading: CombatPoint | null = null, best = 15;
        for (let index = 0; index < actors.length; index++) {
            const facts = world.observe(actors[index]);
            if (facts === null || facts.friendly() || facts.health() <= 0) continue;
            const delta = facts.position().minus(from), horizontal = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
            if (horizontal < 0.05 || horizontal >= best) continue;
            best = horizontal; heading = WorldCombat.point(delta.x() / horizontal, 0, delta.z() / horizontal);
        }
        if (heading !== null) return heading;
        const flat = WorldCombat.point(fallback.x(), 0, fallback.z());
        return flat.length() < 0.01 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }
    /**
     * 在身前拼出一面墙：沿朝向的垂线取 `span` 宽的几列，从地表往上立 `height` 格（只替换空气与草木）。
     * 返回真正放置的格子、用于表现的墙面四角、以及墙根锚点。
     */
    function barrierBuild(world: CombatWorld, origin: CombatPoint, forward: CombatPoint, feetY: number, span: number, height: number, gap: number): { cells: any[]; corners: number[][]; anchor: CombatPoint; columns: number } {
        const flat = WorldCombat.point(forward.x(), 0, forward.z());
        const heading = flat.length() < 0.01 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const half = Math.max(0, Math.floor(span / 2 - 0.001));
        const centre = origin.plus(heading.scale(gap)), baseY = Math.floor(feetY);
        const cells: any[] = [];
        let columns = 0;
        for (let offset = -half; offset <= half; offset++) {
            const at = centre.plus(side.scale(offset));
            const x = Math.floor(at.x()), z = Math.floor(at.z());
            let surface = -1;
            for (let probe = baseY + 2; probe >= baseY - 5; probe--) {
                const block = world.block(WorldCombat.point(x, probe, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                surface = probe; break;
            }
            if (surface === -1) continue;
            let raised = 0;
            for (let lift = 1; lift <= height; lift++) {
                const atY = surface + lift;
                const block = world.block(WorldCombat.point(x, atY, z));
                if (block === null) break;
                const id = String(block.id());
                if (!(id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air")) break;
                if (barrierBlocked(world, x, atY, z)) break;
                cells.push({ x: x, y: atY, z: z, block: barrierWallBlock });
                raised++;
            }
            if (raised > 0) columns++;
        }
        const bottom = baseY, top = baseY + height;
        const left = centre.minus(side.scale(half + 1)), right = centre.plus(side.scale(half + 1));
        const corners = [
            [left.x(), bottom, left.z()],
            [right.x(), bottom, right.z()],
            [right.x(), top, right.z()],
            [left.x(), top, left.z()]
        ];
        return { cells: cells, corners: corners, anchor: WorldCombat.point(centre.x(), bottom, centre.z()), columns: columns };
    }

    define({
        id: "barrier",
        cooldownParameter: "wait",
        name: "屏障",
        description: "制造坚固的壁障，从而大幅提高自己的防御。",
        uses: ["在对手冲上来之前挡住正面的通道", "用高墙遮住视线，断掉远程的射界", "把身后的队友护在墙后，逼对手换路"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 130,
        style: "panels",
        stationary: true,
        defaults: { tall: false, ai: { maxChase: 16, minGap: 3 } },
        fields: [flag("tall", "高屏")],
        indicator: function (config, pokemon) {
            return { radius: p("barrier", "span", pokemon), geometry: "area", style: "panels", color: 0x9FC7FF,
                label: config && config.tall === true ? "光屏" : "壁垒" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["barrier"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("barrier", "tempo", context)),
                recover: Math.round(p("barrier", "aftercast", context)),
                cooldown: Math.round(p("barrier", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_barrier:focus", barrierScene, 1, action.origin(),
                JSON.stringify({ moment: "focus", tall: config && config.tall === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const tall = !!(config && config.tall === true);
            const gift = Math.max(1, Math.min(2, Math.round(p("barrier", "gift", action))));
            const span = Math.max(1.4, p("barrier", "span", action));
            const height = Math.max(1, Math.min(4, Math.round(p("barrier", "height", action))));
            const gap = Math.max(1.0, p("barrier", "gap", action));
            const panels = Math.max(4, Math.round(p("barrier", "panels", action)));
            const window = Math.max(60, Math.round(p("barrier", "fieldTicks", action)));
            const forward = barrierTowards(world, actor, action.direction());
            const wall = barrierBuild(world, body.position(), forward, body.position().y() - body.height() / 2, span, height, gap);
            const scale = span / barrierReferenceSpan;
            const levels = barrierRaise(world, actor, "def", gift);
            MobEffects.apply(world, actor, barrierVeil, window, levels);
            if (wall.cells.length) {
                try { world.terrain(JSON.stringify({ cells: wall.cells, replace: true, linger: true }), window); } catch (error) { }
            }
            WorldFeedback.emit(world, barrierScene, 1, wall.anchor,
                { moment: "raise", actor: String(actor.ref()), panels: panels, columns: wall.columns, height: height,
                    levels: levels, path: wall.corners, scale: scale,
                    intensity: Math.max(0.7, Math.min(2, panels / 10 + levels / 2)) }, 48);
            WorldFeedback.keep(world, "barrier:veil:" + String(actor.ref()), barrierScene, 1, wall.anchor,
                { moment: "hold", actor: String(actor.ref()), panels: panels, columns: wall.columns,
                    path: wall.corners, scale: scale }, Math.min(window, 220));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), barrierRaiseText,
                [levels, wall.columns], 34);
            world.sound("minecraft:block.amethyst_block.place", wall.anchor, 16, "{}");
            world.sound("minecraft:block.amethyst_block.resonate", body.position(), 14, "{}");
            done(action);
        }
    });

    // 屏障窗口被清除或到期：收回抬起的等级并播放崩解；墙体由租借时长自行崩回原方块。
    WorldCombat.on("world_combat:move_barrier/shatter", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== barrierVeil) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const levels = Math.max(1, Math.round(Number(data.amplifier) || 1));
        const loss = Math.min(levels, Math.max(0, barrierStage(world, actor, "def")));
        if (loss > 0) NativeEffects.boost(world, actor, "def", -loss);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, barrierScene, 1, body.position(), { moment: "shatter", actor: String(actor.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), barrierShatterText, [], 24);
        world.sound("minecraft:block.glass.break", body.position(), 14, "{}");
    });
}
