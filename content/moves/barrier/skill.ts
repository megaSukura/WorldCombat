/**
 * 屏障 / barrier — 执行组织。
 *
 * 核心念头：亲手把一排半透明的硬光板立在需要挡住的那条通道上——墙立着，术者的防御也抬起来。
 *
 * 两幕：
 *   聚（windup 播「聚板」，提交前只观察与预告，打断不花代价）。
 *   立（提交后）：以点选落点为墙心、施法方向为法线，把硬光板租借成真实方块。只有 `terrainResult`
 *     真正放下的格子才作数——缺格就是缺口，一格没放下就不冒称有墙。防御窗口（NativeEffects.boostWindow）
 *     绑在共享身份 world_combat:status/barrier 的「屏障」载体上，并挂上一条随墙存续的托管效果：
 *     它每隔几刻核验 terrainCells，最后一格消失或被驱散时立即收回本次防御并播放崩解。
 * 结束：墙体按租借时长自行崩回原方块；墙的托管效果在墙消失时收回本次实际贡献，只收这一笔。
 */
namespace PokemonSkills {
    const barrierScene = "world_combat:move_barrier";
    const barrierWallScene = "world_combat:move_barrier_wall";
    const barrierVeil = "world_combat:barrier_veil";
    const barrierWall = "world_combat:barrier_wall";
    const barrierContribution = "world_combat:move/barrier";
    const barrierWallKey = "world_combat:move_barrier/wall";
    const barrierWallMoteKey = "world_combat:move_barrier/wall_mote";
    const barrierWallBlock = "minecraft:light_blue_stained_glass";
    const barrierRaiseText = "world_combat.move.barrier.text.raise";
    const barrierShatterText = "world_combat.move.barrier.text.shatter";
    const barrierFizzleText = "world_combat.move.barrier.text.fizzle";
    /** 表现里的参考宽度：`data.scale = 实际屏障宽度 / 这个数`。 */
    const barrierReferenceSpan = 2.4;
    /** 影效核验真实租约的间隔与范围：施法者离墙太远时，空读不算墙没了。 */
    const barrierWatchTicks = 8;
    const barrierWatchRange = 32;

    function barrierAir(id: string): boolean {
        return id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air";
    }

    /** 这格硬光板会不会落在某个存活生物的碰撞箱里；会就跳过，免得把谁封进墙里。 */
    function barrierBlocked(world: CombatWorld, x: number, y: number, z: number): boolean {
        const bodies = world.queryBox(WorldCombat.point(x, y, z), WorldCombat.point(x + 1, y + 1, z + 1), false);
        for (let i = 0; i < bodies.length; i++) {
            const facts = world.observe(bodies[i]);
            if (facts === null) continue;
            const min = facts.boundsMin(), max = facts.boundsMax();
            if (max.x() > x && min.x() < x + 1 && max.z() > z && min.z() < z + 1
                && max.y() > y && min.y() < y + 1) return true;
        }
        return false;
    }

    /**
     * 以 `centre` 为墙心、`forward` 为法线（墙面因此垂直于施法方向），沿垂线取 `span` 宽的几列，
     * 从地表往上立 `height` 格。只收空气格：实体占位或非空气处停下，缺口留给后面的实际格。
     * 返回候选格子、墙根锚点和墙面垂线。
     */
    function barrierBuild(world: CombatWorld, centre: CombatPoint, forward: CombatPoint, baseY: number, span: number, height: number):
        { cells: any[]; anchor: CombatPoint; side: CombatPoint } {
        const flat = WorldCombat.point(forward.x(), 0, forward.z());
        const heading = flat.length() < 0.01 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const half = Math.max(0, Math.floor(span / 2 - 0.001));
        const base = Math.floor(baseY), cells: any[] = [];
        for (let offset = -half; offset <= half; offset++) {
            const at = centre.plus(side.scale(offset));
            const x = Math.floor(at.x()), z = Math.floor(at.z());
            let surface: number | null = null;
            for (let probe = base + 3; probe >= base - 6; probe--) {
                const block = world.block(WorldCombat.point(x, probe, z));
                if (block === null) break;
                const id = String(block.id());
                if (barrierAir(id)) continue;
                if (id === "minecraft:water" || id === "minecraft:lava") break;
                surface = probe; break;
            }
            if (surface === null) continue;
            for (let lift = 1; lift <= height; lift++) {
                const atY = surface + lift;
                const block = world.block(WorldCombat.point(x, atY, z));
                if (block === null || !barrierAir(String(block.id()))) break;
                if (barrierBlocked(world, x, atY, z)) break;
                cells.push({ x: x, y: atY, z: z, block: barrierWallBlock });
            }
        }
        return { cells: cells, anchor: WorldCombat.point(centre.x(), base, centre.z()), side: side };
    }

    /**
     * 从原生真正放下的格子里取墙心与顶边：每个真实列取最高的一格作顶点，按墙面垂线排序。
     * 被跳过或被破坏的列不会补上，画出来就是真实缺口；同时给出全部实际格子供逐格描边。
     */
    function barrierOutline(placed: any[], centre: CombatPoint, side: CombatPoint):
        { cells: number[][]; path: number[][]; columns: number; base: number } {
        const groups: { [key: string]: { x: number; z: number; top: number; bottom: number } } = Object.create(null);
        const cells: number[][] = [];
        let base = Infinity;
        for (let i = 0; i < placed.length; i++) {
            const entry = placed[i];
            if (!entry) continue;
            const x = Number(entry[0]), y = Number(entry[1]), z = Number(entry[2]);
            if (!isFinite(x) || !isFinite(y) || !isFinite(z)) continue;
            cells.push([x, y, z]);
            if (y < base) base = y;
            const key = x + "," + z;
            const group = groups[key] || (groups[key] = { x: x, z: z, top: y, bottom: y });
            if (y > group.top) group.top = y;
            if (y < group.bottom) group.bottom = y;
        }
        const list: { x: number; z: number; top: number }[] = [];
        Object.keys(groups).forEach(function (key) { list.push(groups[key]); });
        list.sort(function (a, b) {
            const ao = (a.x + 0.5 - centre.x()) * side.x() + (a.z + 0.5 - centre.z()) * side.z();
            const bo = (b.x + 0.5 - centre.x()) * side.x() + (b.z + 0.5 - centre.z()) * side.z();
            return ao - bo;
        });
        const path: number[][] = [];
        for (let i = 0; i < list.length; i++) path.push([list[i].x + 0.5, list[i].top + 1, list[i].z + 0.5]);
        return { cells: cells, path: path, columns: list.length, base: isFinite(base) ? base : 0 };
    }

    function barrierWallData(json: string): string {
        const value = JSON.parse(json);
        if (value && value.plan) return JSON.stringify(value);
        if (!value || !Array.isArray(value.cells) || !Array.isArray(value.path)) throw new Error("Invalid barrier wall cells");
        if (typeof value.terrain !== "number") throw new Error("Invalid barrier wall terrain");
        [value.scale, value.placed, value.columns, value.levels].forEach(function (n: any) {
            if (typeof n !== "number" || !isFinite(n)) throw new Error("Invalid barrier wall number");
        });
        if (value.window !== undefined && (typeof value.window !== "number" || !isFinite(value.window))) throw new Error("Invalid barrier wall window");
        if (value.veil !== undefined && typeof value.veil !== "string") throw new Error("Invalid barrier wall veil");
        if (value.veilKey !== undefined && typeof value.veilKey !== "string") throw new Error("Invalid barrier wall veil key");
        [value.centre, value.side].forEach(function (pair: any) {
            if (!Array.isArray(pair) || pair.length !== 2 || !pair.every(function (n: any) { return typeof n === "number" && isFinite(n); }))
                throw new Error("Invalid barrier wall frame");
        });
        return JSON.stringify(value);
    }

    function barrierWallAnchor(state: any): CombatPoint {
        return WorldCombat.point(Number(state.anchor[0]), Number(state.anchor[1]), Number(state.anchor[2]));
    }

    /**
     * 墙效果结束时归还它自己的租约与防御，只撤这次实际贡献。
     * 地形一定要先释放：提前驱散/结束不能让实体墙留着却只播崩解；target 已失效时也要先还原地形。
     */
    function barrierWallRecover(world: CombatWorld, target: CombatActor | null, state: any): void {
        // Native owner cleanup releases terrain even when this source can no longer mutate the world.
        if (state.terrain && world.valid(world.source())) world.removeTerrain(state.terrain);
        if (target === null || !world.valid(target)) return;
        if (state.window) NativeEffects.windowClose(world, state.window);
        if (state.veil && state.veilKey) {
            const current = MobEffects.read(world, target, state.veil);
            // 只删本 scope 申请的 exact key：被新一次施放刷新后不能删走新载体。
            if (current !== null && String(current.key()) === state.veilKey) world.removeMobEffect(target, state.veil, state.veilKey);
        }
    }

    function barrierWallWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        if (!world.valid(target)) { effect.end(); return; }
        const state = JSON.parse(effect.state()), anchor = barrierWallAnchor(state);
        // 本次载体被原生驱散或被替换（exact key 变了）：本次墙结束，表现随效果一起收。
        if (state.veil) {
            const carrier = MobEffects.read(world, target, state.veil);
            if (carrier === null || String(carrier.key()) !== state.veilKey) { effect.end(); return; }
        }
        const body = world.observe(target);
        // 核验真实租约：只有施法者还在墙附近时，空读才代表墙真的没了。
        if (body !== null && body.position().minus(anchor).length() <= barrierWatchRange) {
            const alive = world.terrainCells(state.terrain);
            if (!alive || alive.length === 0) { effect.end(); return; }
            // 用真正 remaining 的格子重算轮廓：局部被破坏时画面只画剩下的墙，不再是旧格。
            const centre = WorldCombat.point(state.centre[0], anchor.y(), state.centre[1]);
            const side = WorldCombat.point(state.side[0], 0, state.side[1]);
            const placed: number[][] = [];
            for (let i = 0; i < alive.length; i++) placed.push([alive[i].x(), alive[i].y(), alive[i].z()]);
            const outline = barrierOutline(placed, centre, side);
            state.cells = outline.cells; state.path = outline.path; state.columns = outline.columns;
            state.placed = outline.cells.length;
            effect.state(JSON.stringify(state));
        }
        // 表现绑在这条墙效果上：墙效果结束（自然到期、被驱散或最后一格消失）时一并清理。
        WorldFeedback.onEffect(world, effect.id(), barrierWallMoteKey, barrierScene, 1, anchor,
            { moment: "hold", path: state.path, placed: state.placed, panels: state.panels, columns: state.columns, scale: state.scale });
        WorldFeedback.onEffect(world, effect.id(), barrierWallKey, barrierWallScene, 1, anchor,
            { cells: state.cells, path: state.path, placed: state.placed, columns: state.columns, scale: state.scale });
        effect.schedule("watch", "watch", barrierWatchTicks, "{}");
    }

    WorldCombat.effect(barrierWall, 1, 6000, "actor", barrierWallData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(barrierWall, "start", function (effect) {
        if (!effect.world().valid(effect.target())) { effect.end(); return; }
        if (JSON.parse(effect.state()).plan && !barrierWallCreate(effect)) { effect.end(); return; }
        barrierWallWatch(effect);
    });
    WorldCombat.effectHandler(barrierWall, "watch", barrierWallWatch);
    WorldCombat.effectHandler(barrierWall, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(barrierWall, "end", function (effect) {
        const world = effect.world(), state = JSON.parse(effect.state()), target = effect.target();
        if (!state.terrain) return;
        barrierWallRecover(world, world.valid(target) ? target : null, state);
        if (!world.valid(target)) return;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, barrierScene, 1, barrierWallAnchor(state),
            { moment: "shatter", actor: String(target.ref()), placed: state.placed, panels: state.panels, scale: state.scale }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), barrierShatterText, [], 24);
        world.sound("minecraft:block.glass.break", body.position(), 14, "{}");
    });

    /** 一格都没立起来：只留一声空响与浮字，不挂防御、不画完整护墙。 */
    function barrierFizzle(world: CombatWorld, actor: CombatActor, body: CombatObservation, anchor: CombatPoint, panels: number): void {
        WorldFeedback.emit(world, barrierScene, 1, anchor,
            { moment: "fizzle", actor: String(actor.ref()), panels: panels }, 18);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), barrierFizzleText, [], 24);
        world.sound("minecraft:block.glass.break", body.position(), 10, "{}");
    }

    /** Terrain and Defense begin in the wall's scope, so native owner cleanup also works after the caster leaves. */
    function barrierWallCreate(effect: CombatEffect): boolean {
        const world = effect.world(), actor = effect.target(), body = world.observe(actor), setup = JSON.parse(effect.state());
        if (body === null) return false;
        const centre = WorldCombat.point(setup.centre[0], setup.centre[1], setup.centre[2]);
        const plan = { cells: setup.plan, side: WorldCombat.point(setup.side[0], 0, setup.side[1]),
            anchor: WorldCombat.point(setup.anchor[0], setup.anchor[1], setup.anchor[2]) };
        const window = setup.window, gift = setup.gift, scale = setup.scale, panels = setup.panels, height = setup.height;
        let receipt: any = null;
        try { receipt = JSON.parse(String(world.terrainResult(JSON.stringify({ cells: plan.cells, replace: false, linger: false, bestEffort: true }), window))); }
        catch (error) { receipt = null; }
        const placed: any[] = receipt && receipt.id > 0 && Array.isArray(receipt.placed) ? receipt.placed : [];
        if (!placed.length) { barrierFizzle(world, actor, body, plan.anchor, panels); return false; }
        const outline = barrierOutline(placed, centre, plan.side);
        const anchor = WorldCombat.point(plan.anchor.x(), outline.base - 1, plan.anchor.z());
        // 防御只挂在真正立起来的墙上：窗口归属本次屏障载体，墙消失时由墙效果原样收回。
        const before = NativeEffects.effectiveStage(world, actor, "def");
        const previous = MobEffects.read(world, actor, barrierVeil);
        const carrier = MobEffects.apply(world, actor, barrierVeil, window, previous ? previous.amplifier() : 0);
        let levels = 0, windowId = 0;
        if (carrier) {
            windowId = NativeEffects.boostWindow(world, actor, { def: gift }, carrier.duration(), barrierContribution, carrier, previous);
            levels = Math.max(0, NativeEffects.effectiveStage(world, actor, "def") - before);
            if (carrier.amplifier() !== levels) {
                const shown = MobEffects.apply(world, actor, barrierVeil, window, levels);
                // 刷新载体后窗口会转移到新载体，记下最新返回的 windowId，结束时才收得掉这一次的贡献。
                if (shown) windowId = NativeEffects.boostWindow(world, actor, {}, shown.duration(), barrierContribution, shown, carrier);
            }
        }
        const veil = MobEffects.read(world, actor, barrierVeil);
        const data = { cells: outline.cells, path: outline.path, anchor: [anchor.x(), anchor.y(), anchor.z()],
            centre: [centre.x(), centre.z()], side: [plan.side.x(), plan.side.z()],
            terrain: receipt.id, placed: outline.cells.length, columns: outline.columns, panels: panels,
            scale: scale, levels: levels, window: windowId,
            veil: veil ? String(veil.id()) : "", veilKey: veil ? String(veil.key()) : "" };
        effect.state(JSON.stringify(data));
        const wallEffect = effect.id();
        // 立墙这一刻的爆发；持续边缘由墙效果持有，随它自然到期、被驱散或最后一格消失一起收。
        WorldFeedback.emit(world, barrierScene, 1, anchor,
            { moment: "raise", actor: String(actor.ref()), panels: panels, placed: outline.cells.length, columns: outline.columns,
                height: height, levels: levels, path: outline.path, scale: scale,
                intensity: Math.max(0.7, Math.min(2, panels / 10 + levels / 2)) }, 48);
        if (wallEffect) {
            WorldFeedback.onEffect(world, wallEffect, barrierWallMoteKey, barrierScene, 1, anchor,
                { moment: "hold", actor: String(actor.ref()), path: outline.path, placed: outline.cells.length,
                    panels: panels, columns: outline.columns, scale: scale });
            WorldFeedback.onEffect(world, wallEffect, barrierWallKey, barrierWallScene, 1, anchor,
                { cells: outline.cells, path: outline.path, placed: outline.cells.length, columns: outline.columns, scale: scale });
        }
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), barrierRaiseText,
            [levels, outline.columns, outline.cells.length], 34);
        world.sound("minecraft:block.amethyst_block.place", anchor, 16, "{}");
        world.sound("minecraft:block.amethyst_block.resonate", body.position(), 14, "{}");
        return true;
    }

    define({
        id: "barrier",
        cooldownParameter: "wait",
        name: "屏障",
        description: "点选一个落点，在它那里竖起一面垂直于施法方向的硬光板墙，同时提高自身防御。墙只在实际放得下的空气格里立起，缺口就留在那里；墙消失时，本次防御提升结束。",
        uses: ["在对手冲上来的通道上亲手立墙", "把墙立到侧路，而不是被迫朝最近的敌人", "用高墙遮住视线，断掉远程的射界"],
        kind: "aim",
        range: 4,
        maxRange: 7,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 130,
        style: "panels",
        stationary: true,
        defaults: { tall: false, ai: { maxChase: 16, minGap: 3, lead: 6 } },
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
                range: p("barrier", "reach", context)
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
            const gift = Math.max(1, Math.min(2, Math.round(p("barrier", "gift", action))));
            const span = Math.max(1.4, p("barrier", "span", action));
            const height = Math.max(1, Math.min(4, Math.round(p("barrier", "height", action))));
            const gap = Math.max(1.0, p("barrier", "gap", action));
            const panels = Math.max(4, Math.round(p("barrier", "panels", action)));
            const window = Math.max(60, Math.round(p("barrier", "fieldTicks", action)));
            const origin = body.position();
            // 点选落点定墙心，墙面垂直于施法方向；空放（落点贴着自己）退回身前 gap 处、按施法方向立。
            let centre = action.targetPosition(), forward = centre.minus(origin);
            forward = WorldCombat.point(forward.x(), 0, forward.z());
            if (forward.length() < 0.8) {
                const dir = action.direction(), flat = WorldCombat.point(dir.x(), 0, dir.z());
                forward = flat.length() < 0.01 ? WorldCombat.point(0, 0, 1) : flat.unit();
                centre = origin.plus(forward.scale(gap));
            } else forward = forward.unit();
            const feet = origin.y() - body.height() / 2;
            const plan = barrierBuild(world, centre, forward, feet, span, height);
            const scale = span / barrierReferenceSpan;
            if (!plan.cells.length) { barrierFizzle(world, actor, body, plan.anchor, panels); done(action); return; }
            action.effect(barrierWall, actor, JSON.stringify({ plan: plan.cells,
                centre: [centre.x(), centre.y(), centre.z()], side: [plan.side.x(), plan.side.z()],
                anchor: [plan.anchor.x(), plan.anchor.y(), plan.anchor.z()],
                window: window, gift: gift, scale: scale, panels: panels, height: height }), window + 40);
            done(action);
        }
    });
}
