/**
 * 挖洞 / Dig — 世界内的动作。
 *
 * 核心念头：**真的从天然土里钻出一条短通道**——下潜、贴着地下前移、在起手锁定的落点破土，把
 * 真正被身体扫到的第一个敌人掀飞。绕开的不是判定，而是地表的那堵矮墙；通道本身是世界里短时存在的
 * 一组空气格（world.terrain 租借），动作结束或中断时原方块自己回来，实体占住的格子会把复原推迟到它离开。
 *
 * 形态
 *   - kind "motion"：12 格内选一个落点（不是敌人），施法者准备后沉入地下。
 *   - windup（提交前）：脚边地裂／落点画出范围，可被打断且不花 PP。这是对手走开或加强戒备的窗口。
 *   - ready：预检一条通道——身体尺寸能扫过、起点与落点都有天然土顶、水平不超过 8 格、最多 64 格临时空气、
 *     全程都是天然土／石或已空气。预检不成立就直接拒绝，不隔空闪现、不 teleport 兜底。
 *   - execute：terrainResult 真正把整条通道开成空气后才开始移动；下潜→前移→上钻三段都走真实位移／
 *     原生 moveSweep，出土那一下 sweep 到谁就结算谁（一次）。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（impact → PokemonDamage）与击飞（world.hitDisplace）
 * 都走同一条路；只有属性相性/本系是宝可梦层。
 */
namespace PokemonSkills {
    const DIG_SCENE = "world_combat:move_dig";
    const DIG_BASE_PREPARE = 12;
    const DIG_AMBUSH_PREPARE = 18;
    const DIG_AMBUSH_POWER = 1.1;
    const DIG_AMBUSH_LAUNCH = 1.3;
    const DIG_MAX_RUN = 8;
    const DIG_MAX_CELLS = 64;
    const DIG_TUNNEL_TICKS = 120;

    /** 可以被挖开的天然地材；预检里除它之外的方块（建材、矿石、含水方块、方块实体）一律拒绝。 */
    const DIG_NATURAL = ["dirt", "grass_block", "sand", "red_sand", "gravel", "clay", "mud", "podzol", "coarse_dirt",
        "rooted_dirt", "mycelium", "moss_block", "snow", "soul_soil", "soul_sand", "netherrack", "end_stone",
        "stone", "deepslate", "granite", "diorite", "andesite", "tuff", "calcite", "basalt", "blackstone",
        "sandstone", "dripstone"];
    /** 人工或加工过的方块：即使子串撞上天然词也先拒掉。 */
    const DIG_REJECT = ["ore", "redstone", "brick", "concrete", "planks", "log", "glass", "wool", "terracotta",
        "polished", "chiseled", "smooth", "cobblestone", "slab", "stairs", "wall", "fence", "door", "chest",
        "furnace", "barrel", "hopper", "dispenser", "dropper", "shulker", "copper_block", "iron_block", "gold_block",
        "diamond_block", "netherite", "emerald", "lapis", "coal_block", "quartz", "amethyst", "obsidian", "bedrock",
        "barrier", "sponge", "anvil", "gilded", "crafting"];

    interface DigCell { x: number; y: number; z: number; }
    interface DigPassage {
        cells: DigCell[];
        floorY: number;
        startFeet: CombatPoint;
        destFeet: CombatPoint;
        destTop: number;
    }

    function digAir(id: string): boolean {
        return id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air";
    }

    function digNatural(id: string): boolean {
        var i;
        for (i = 0; i < DIG_REJECT.length; i++) if (id.indexOf(DIG_REJECT[i]) >= 0) return false;
        for (i = 0; i < DIG_NATURAL.length; i++) if (id.indexOf(DIG_NATURAL[i]) >= 0) return true;
        return false;
    }

    /** 原生碰撞形状的支撑顶面。 */
    function digSurfaceTop(world: CombatWorld, point: CombatPoint): number | null {
        const support = SurfacePaths.support(world, point, .1, 8);
        return support === null ? null : support.y();
    }

    function digFeet(body: CombatObservation): CombatPoint {
        return WorldCombat.point(body.position().x(), body.boundsMin().y(), body.position().z());
    }

    /**
     * 预检一条有出口的短天然土通道：起点与落点各一条竖井、地下一条水平段，截面按身体尺寸扫过。
     * 只允许天然土／石或已空气；任一格不可挖、水平超过 8 格、截面超过 64 格都返回 null——本招不发动。
     */
    function digPassage(world: CombatWorld, body: CombatObservation, destination: CombatPoint): DigPassage | null {
        var start = digFeet(body), width = Math.max(0.6, body.width()), height = Math.max(1, Math.ceil(body.height()));
        if (!body.grounded()) return null;
        if (height > 3) return null;
        var startTop = digSurfaceTop(world, start), destTop = digSurfaceTop(world, destination);
        if (startTop === null || destTop === null) return null;
        var dx = destination.x() - start.x(), dz = destination.z() - start.z(), span = Math.sqrt(dx * dx + dz * dz);
        if (!(span >= 1) || span > DIG_MAX_RUN) return null;
        var top = Math.min(startTop, destTop), floorY = Math.floor(top - height - 1), halfW = width / 2 + 0.05;
        var cells: DigCell[] = [], seen: { [key: string]: boolean } = Object.create(null);
        function add(x: number, y: number, z: number): boolean {
            var key = x + "," + y + "," + z;
            if (seen[key]) return true;
            var block = world.block(WorldCombat.point(x, y, z));
            if (block === null) return false;
            var id = String(block.id());
            const fluid = world.fluid(WorldCombat.point(x + .5, y + .5, z + .5));
            if (fluid === null || !fluid.empty()) return false;
            if (digAir(id)) { seen[key] = true; return true; }
            if (!digAir(id) && !digNatural(id)) return false;
            seen[key] = true; cells.push({ x: x, y: y, z: z });
            return true;
        }
        var steps = Math.max(1, Math.ceil(span / 0.5));
        for (var i = 0; i <= steps; i++) {
            var t = i / steps, px = start.x() + dx * t, pz = start.z() + dz * t;
            for (var xi = Math.floor(px - halfW); xi <= Math.floor(px + halfW); xi++)
                for (var zi = Math.floor(pz - halfW); zi <= Math.floor(pz + halfW); zi++)
                    for (var y = floorY; y < floorY + height; y++) if (!add(xi, y, zi)) return null;
        }
        for (var sx = Math.floor(start.x() - halfW); sx <= Math.floor(start.x() + halfW); sx++)
            for (var sz = Math.floor(start.z() - halfW); sz <= Math.floor(start.z() + halfW); sz++)
                for (var sy = floorY; sy < Math.ceil(startTop + body.height()); sy++) if (!add(sx, sy, sz)) return null;
        for (var ex = Math.floor(destination.x() - halfW); ex <= Math.floor(destination.x() + halfW); ex++)
            for (var ez = Math.floor(destination.z() - halfW); ez <= Math.floor(destination.z() + halfW); ez++)
                for (var ey = floorY; ey < Math.ceil(destTop + body.height()); ey++) if (!add(ex, ey, ez)) return null;
        if (!cells.length || cells.length > DIG_MAX_CELLS) return null;
        return { cells: cells, floorY: floorY, startFeet: start,
            destFeet: WorldCombat.point(destination.x(), destTop, destination.z()), destTop: destTop };
    }

    /** 落点脚下的材料决定碎屑色系：石头给一档更冷的碎石，其他天然地面给普通土屑。 */
    function digMoment(world: CombatWorld, point: CombatPoint): string {
        var ground = world.block(point.plus(WorldCombat.point(0, -1, 0)));
        if (ground === null) return "erupt";
        var id = String(ground.id());
        var hard = ["stone", "deepslate", "tuff", "calcite", "basalt", "blackstone", "granite", "diorite", "andesite"];
        for (var i = 0; i < hard.length; i++) if (id.indexOf(hard[i]) >= 0) return "erupt_stone";
        return "erupt";
    }

    /** 只读预检入口：AI 与 ready 共用同一条通道判定。 */
    export function digPassageValid(world: CombatWorld, actor: CombatActor, destination: CombatPoint): boolean {
        var body = world.observe(actor);
        return body !== null && digPassage(world, body, destination) !== null;
    }

    /**
     * 出土那一下读真实位移：逐段 moveSweep 向上钻，身体真正撞到谁就结算谁一次，撞到顶或实体即停。
     * 没有范围伤害，也没有从头顶反向 trace 的假命中。
     */
    function digExecute(action: CombatAction, config: any, done: (current: CombatAction) => void): void {
        var world = action.world(), actor = action.actor(), body = world.observe(actor);
        if (body === null) { done(action); return; }
        var passage = digPassage(world, body, action.targetPosition());
        if (passage === null) {
            WorldFeedback.emit(world, DIG_SCENE, 1, body.position(), { moment: "blocked" }, 20);
            done(action); return;
        }
        var power = p("dig", "power", action) * (config.ambush ? DIG_AMBUSH_POWER : 1);
        var launch = p("dig", "launch", action) * (config.ambush ? DIG_AMBUSH_LAUNCH : 1);
        var radius = Math.max(0.2, p("dig", "collisionRadius", action));
        var totalTicks = Math.max(3, Math.round(p("dig", "burrowTicks", action)));
        const partTicks = Math.max(1, Math.floor(totalTicks / 3));
        const phaseTicks = [partTicks, partTicks, totalTicks - 2 * partTicks];
        var route: DigPassage = passage;
        var moment = digMoment(world, route.destFeet);
        var scale = Math.max(0.6, Math.min(2.0, radius / 0.45));
        var request = route.cells.map(function (cell) { return { x: cell.x, y: cell.y, z: cell.z, block: "minecraft:air" }; });
        var lease = 0, placed = 0;
        try {
            var receipt = JSON.parse(String(world.terrainResult(JSON.stringify({ cells: request, replace: true, linger: false }), DIG_TUNNEL_TICKS)));
            lease = typeof receipt.id === "number" ? receipt.id : 0;
            placed = Array.isArray(receipt.placed) ? receipt.placed.length : 0;
        } catch (error) { lease = 0; }
        // 没有整条开通就不走：回收本次租约，不 teleport 兜底。
        if (!(lease > 0) || placed < route.cells.length) {
            if (lease > 0) { try { world.removeTerrain(lease); } catch (error) { } }
            WorldFeedback.emit(world, DIG_SCENE, 1, body.position(), { moment: "blocked" }, 20);
            done(action); return;
        }
        world.sound("minecraft:block.sand.break", route.startFeet, 16, "{}");
        WorldFeedback.emit(world, DIG_SCENE, 1, route.startFeet, { moment: "entry", cells: placed, scale: scale }, 30);
        var finished = false, struck = 0, contacted = false;
        const scenes = WorldFeedback.actionScenes(DIG_SCENE);
        function finish(current: CombatAction): void {
            if (finished) return;
            finished = true;
            try { current.world().removeTerrain(lease); } catch (error) { }
            scenes.finish(current, done);
        }
        function blocked(current: CombatAction): void {
            const scope = current.world(), body = scope.observe(actor);
            if (body !== null) WorldFeedback.emit(scope, DIG_SCENE, 1, body.position(), { moment: "blocked" }, 20);
            // 租约按原生占用检查延迟恢复仍有人站着的格子；停在实际已到达的安全点。
            finish(current);
        }
        const goals = [
            WorldCombat.point(route.startFeet.x(), route.floorY, route.startFeet.z()),
            WorldCombat.point(route.destFeet.x(), route.floorY, route.destFeet.z()), route.destFeet
        ];
        function phase(current: CombatAction, index: number, elapsed: number): void {
            const scope = current.world(), body = scope.observe(actor);
            if (body === null) { finish(current); return; }
            const goal = goals[index], before = digFeet(body);
            let left = goal.minus(before).length() / Math.max(1, phaseTicks[index] - elapsed);
            const walked: number[][] = [[before.x(), before.y(), before.z()]];
            // 每刻有限进度再拆成<=.35格原生短段；墙挡/位移被拒绝时立刻止步，不跳到下一阶段。
            for (let sample = 0; sample < 64 && left > .001; sample++) {
                const liveBody = scope.observe(actor);
                if (liveBody === null) { finish(current); return; }
                const at = digFeet(liveBody), delta = goal.minus(at);
                if (delta.length() <= .03) break;
                const amount = Math.min(.35, left, delta.length()), step = delta.unit().scale(amount);
                if (index === 2) {
                    const hit = current.moveSweep(step, radius), victim = hit.target();
                    const movedBody = scope.observe(actor);
                    if (movedBody === null) { finish(current); return; }
                    if (hit.hitEntity()) {
                        if (!contacted && victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                            contacted = true;
                            if (impact(current, hit, "dig", power, { damage: damageSpec("dig", "power"), contact: true })) {
                                struck = 1;
                                if (scope.valid(victim) && launch > 0) scope.hitDisplace(victim, WorldCombat.point(0, launch, 0));
                            }
                        }
                        // 活体接触已记录一次；剩余自移仍走原生方块碰撞，不把“碰到人”冒充已出土。
                        const remainder = step.minus(digFeet(movedBody).minus(at));
                        if (remainder.length() > .001) scope.displace(actor, remainder);
                    }
                } else scope.displace(actor, step);
                const afterBody = scope.observe(actor);
                if (afterBody === null) { finish(current); return; }
                const after = digFeet(afterBody), actual = after.minus(at).length();
                walked.push([after.x(), after.y(), after.z()]);
                if (actual < amount - .025) { blocked(current); return; }
                left -= actual;
            }
            const nowBody = scope.observe(actor);
            if (nowBody === null) { finish(current); return; }
            const now = digFeet(nowBody);
            scenes.show(current, "burrow", nowBody.position(), { moment: "burrow", cells: placed, scale: scale, deep: 1, path: walked });
            const arrived = goal.minus(now).length() <= .06;
            if (arrived) {
                if (index === 2) {
                    WorldFeedback.emit(scope, DIG_SCENE, 1, now.plus(WorldCombat.point(0, .03, 0)),
                        { moment: moment, cells: placed, scale: scale, intensity: 1 + struck * .5 }, 44);
                    scope.sound("minecraft:entity.ravager.stunned", now, 16, "{}");
                    finish(current); return;
                }
                current.after(1, next => phase(next, index + 1, 0)); return;
            }
            if (elapsed + 1 >= phaseTicks[index]) { blocked(current); return; }
            current.after(1, next => phase(next, index, elapsed + 1));
        }
        phase(action, 0, 0);
    }

    define({
        freeMovement: true,
        id: "dig", name: "挖洞",
        description: "在天然土里钻出一条短通道：下潜、贴着地下前移、在选定落点破土，绕开地表障碍，出土时把真正被身体扫到的第一个敌人掀飞并造成一次物理伤害。通道只开在天然土／石里；预检不成立（人工建材、矿石、水／岩浆、太远或太大）就不发动，不会隔空闪现。落点在准备期锁定，对手能走开躲过。",
        uses: ["钻过地表障碍绕后", "破土突袭单个目标", "越过矮墙接近远程对手"],
        kind: "motion", range: 12, active: 10, style: "ground-burrow", maximumTicks: 180,
        defaults: { ambush: false },
        fields: [field(pathOf("ambush"), "伏击", "boolean", { help: "多花 6 刻准备，破土威力与击飞高度都提高、冷却更长；更容易被读懂。落点与通道判定不变。" })],
        ready: function (action, config) {
            var sense = action.sense(), body = sense.observe(action.actor());
            if (body === null) return "no-body";
            return digPassage(sense, body, action.targetPosition()) === null ? "no-passage" : "";
        },
        resolve: function (_pokemon, config) {
            return { prepare: config.ambush ? DIG_AMBUSH_PREPARE : DIG_BASE_PREPARE, recover: 6, cooldown: config.ambush ? 70 : 48 };
        },
        windup: function (action, config) {
            var sense = action.sense(), body = sense.observe(action.actor()), destination = action.targetPosition();
            action.present("dig-mark", DIG_SCENE, 1, destination.plus(WorldCombat.point(0, 0.03, 0)), JSON.stringify({ moment: "mark" }));
            if (body) action.present("dig-cracks", DIG_SCENE, 1, body.position(), JSON.stringify({ moment: "windup" }));
            return config.ambush ? DIG_AMBUSH_PREPARE : DIG_BASE_PREPARE;
        },
        execute: function (action, move, config, done) { digExecute(action, config, done); }
    });

    WorldCombat.preview("world_combat:dig", JSON.stringify({ motion: "horizontal" }));
}
