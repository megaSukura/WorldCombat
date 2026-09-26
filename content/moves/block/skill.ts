/**
 * 挡路 / block — 执行组织。
 *
 * 核心念头：**在退路上把一道短弧栅栏立起来**，靠一堵真实的墙改变走位。
 *
 * 三幕：
 *   起（windup，提交前）：术者沉腰、双臂张开，脚边卷起一圈尘土；同时沿拟建弧线画出一道淡淡的冷光，
 *       让玩家在出手前就看见退路会被封在哪（`data.path` 是拟建弧，`fit:"none"` 按世界坐标画）。
 *   立（seal，提交后）：以落点为心、术者到落点的方向为轴，取 `columns` 个点位，从地表往上立 `height` 格
 *       `minecraft:iron_bars`（`world.terrain` 租借，`linger` 活过招式，到期原方块回来）。
 *       墙按**实际成功格数**立起：碰撞箱挡住的格、受保护的格、非空气的格都会失败，弧线上因此留下缺口。
 *       只对**落墙时真实贴住墙面**的敌人做一次短推挤（往术者方向），并让他们短暂走不快、被钉一下；
 *       没有贴住墙的目标不写任何压制——墙本身才是这招的作用。
 *   收（fold）：`hold` 到点，栅栏由租约自己归还原方块，墙基冷光收回。
 *
 * 目标形状：`kind:"aim"` 接受敌人或地面点。
 *   点敌人：墙立在它背影一侧（保留原来的推荐位置），弧朝向取术者到它的方向。
 *   点地面：墙立在被点的位置，弧朝向取术者到落点的方向——空地、路口、门口都能封。
 *   目标是友方或目标已经离场时，按点处理：在当时的落点立墙，不推挤任何友方。
 *
 * 与同族分开：黑色目光是术者站在原地一直凝视、被打断就断；蛛网缠在目标身上、怕火；挡路只在退路上立一堵墙，
 *   墙在退路就不在，墙短可翻越、可挖开、时长一到就消失。
 *
 * 配置 `brace`（撑臂）由 resolve 改时序与射程，由公式改弧长／高度／时长：撑臂更高更窄更久但更慢更近。
 */
namespace PokemonSkills {
    const blockId = "block";
    const blockScene = "world_combat:move_block";
    const blockPenned = "world_combat:block_penned";
    const blockWall = "world_combat:block_wall";
    const blockWallKey = "block:wall:";
    const blockWallBlock = "minecraft:iron_bars";
    const blockSealText = "world_combat.move.block.text.seal";
    const blockPenSpeed = 0.3;
    /** 贴住墙面的判定余量：超过「半个身位 + 这个数」就不算接触。 */
    const blockContactReach = 0.85;

    /** `world_combat:block_wall` 的状态：墙基折线、锚点与它的大小；到期时用它播放收栅。 */
    function blockWallData(json: string): string {
        const value = JSON.parse(json);
        if (!Array.isArray(value.path)) throw new Error("Invalid block wall path");
        if (!Array.isArray(value.anchor) || value.anchor.length !== 3
            || !value.anchor.every(function (n: any) { return typeof n === "number" && isFinite(n); }))
            throw new Error("Invalid block wall anchor");
        ["columns", "scale", "intensity"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid block wall state");
        });
        return JSON.stringify(value);
    }

    function blockAnchor(data: any): CombatPoint {
        return WorldCombat.point(data.anchor[0], data.anchor[1], data.anchor[2]);
    }

    function blockWallVisual(world: CombatWorld, data: any): void {
        WorldFeedback.keep(world, blockWallKey + String(world.source().ref()), blockScene, 1, blockAnchor(data),
            { moment: "penned", path: data.path, columns: data.columns, lines: data.columns,
                scale: data.scale, intensity: data.intensity }, 40);
    }

    /** 这格栅栏会不会落在某个存活生物的碰撞箱里；会就跳过，免得把谁封进墙里。 */
    function blockBlocked(world: CombatWorld, x: number, y: number, z: number): boolean {
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

    /**
     * 规划一道弧墙。
     *   behind=true（点敌人）：弧心就是敌人，半径 `gap + 弧长一半`，墙落在它的背影一侧。
     *   behind=false（点地面）：弧心后退一个半径，弧的中间点正好穿过落点，弧朝向取术者到落点。
     * 返回：真正放置的格子、成功列的墙基折线、拟建弧折线（含受阻列）、墙根锚点与实际成功列数。
     */
    function blockPlan(world: CombatWorld, origin: CombatPoint, at: CombatPoint, behind: boolean,
                       span: number, height: number, gap: number, arcDegrees: number, columns: number):
        { cells: any[]; path: number[][]; proposed: number[][]; anchor: CombatPoint; columns: number } {
        const dx = at.x() - origin.x(), dz = at.z() - origin.z(), length = Math.sqrt(dx * dx + dz * dz);
        const hx = length < 0.01 ? 0 : dx / length, hz = length < 0.01 ? 1 : dz / length;
        const radius = behind ? Math.max(0.8, gap + span * 0.5) : Math.max(0.8, span * 0.5 + 0.5);
        const centre = behind ? at : WorldCombat.point(at.x() - hx * radius, at.y(), at.z() - hz * radius);
        const half = Math.max(0, arcDegrees) * Math.PI / 360;
        const baseY = Math.floor(at.y()), cells: any[] = [], path: number[][] = [], proposed: number[][] = [];
        const seen: { [key: string]: boolean } = Object.create(null);
        let placed = 0;
        for (let index = 0; index < columns; index++) {
            const t = columns <= 1 ? 0.5 : index / (columns - 1);
            const angle = (t - 0.5) * 2 * half, cos = Math.cos(angle), sin = Math.sin(angle);
            const rx = hx * cos - hz * sin, rz = hx * sin + hz * cos;
            const x = Math.floor(centre.x() + rx * radius), z = Math.floor(centre.z() + rz * radius);
            let surface: number | null = null;
            for (let probe = baseY + 2; probe >= baseY - 5; probe--) {
                const block = world.block(WorldCombat.point(x, probe, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:water" || id === "minecraft:lava") break;
                surface = probe; break;
            }
            if (surface === null) continue;
            proposed.push([x + 0.5, surface + 1.1, z + 0.5]);
            let raised = 0;
            for (let lift = 1; lift <= height; lift++) {
                const atY = surface + lift;
                const block = world.block(WorldCombat.point(x, atY, z));
                if (block === null) break;
                const id = String(block.id());
                if (!(id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air")) break;
                if (blockBlocked(world, x, atY, z)) break;
                const key = x + "," + atY + "," + z;
                if (seen[key]) break;
                seen[key] = true;
                cells.push({ x: x, y: atY, z: z, block: blockWallBlock });
                raised++;
            }
            if (raised > 0) { placed++; path.push([x + 0.5, surface + 1.1, z + 0.5]); }
        }
        const middle = path.length ? path[Math.floor(path.length / 2)] : null;
        const anchor = middle !== null ? WorldCombat.point(middle[0], middle[1], middle[2]) : at;
        return { cells: cells, path: path, proposed: proposed, anchor: anchor, columns: placed };
    }

    /** 落墙时真实贴住这道墙的非友方：到任意一格的平面距离在「半个身位 + 余量」以内，且与那格上下相交。 */
    function blockContacts(world: CombatWorld, cells: any[], height: number): CombatActor[] {
        const found: CombatActor[] = [], seen: { [ref: string]: boolean } = Object.create(null);
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            const bodies = world.query(WorldCombat.point(cell.x + 0.5, cell.y + 0.5, cell.z + 0.5), 2.2, false);
            for (let j = 0; j < bodies.length; j++) {
                const actor = bodies[j], ref = String(actor.ref());
                if (seen[ref] || world.friendly(actor)) continue;
                const facts = world.observe(actor);
                if (facts === null || facts.health() <= 0) continue;
                const centre = facts.position(), half = facts.width() / 2;
                const dx = Math.max(0, Math.abs(centre.x() - (cell.x + 0.5)) - half);
                const dz = Math.max(0, Math.abs(centre.z() - (cell.z + 0.5)) - half);
                if (dx * dx + dz * dz > blockContactReach * blockContactReach) continue;
                const feet = centre.y() - facts.height() / 2;
                if (feet >= cell.y + 1.05 || feet + facts.height() <= cell.y - 0.35) continue;
                seen[ref] = true; found.push(actor);
            }
        }
        return found;
    }

    WorldCombat.effect(blockWall, 1, 600, "actor", blockWallData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(blockWall, "start", function (effect) {
        const world = effect.world();
        if (!world.valid(effect.target())) { effect.end(); return; }
        blockWallVisual(world, JSON.parse(effect.state()));
        effect.schedule("watch", "watch", 4, "{}");
    });
    WorldCombat.effectHandler(blockWall, "watch", function (effect) {
        const world = effect.world();
        if (!world.valid(effect.target())) { effect.end(); return; }
        blockWallVisual(world, JSON.parse(effect.state()));
        effect.schedule("watch", "watch", 4, "{}");
    });
    WorldCombat.effectHandler(blockWall, "end", function (effect) {
        const world = effect.world();
        if (!world.valid(effect.target())) return;
        WorldFeedback.emit(world, blockScene, 1, blockAnchor(JSON.parse(effect.state())),
            { moment: "fold" }, 22);
    });

    // 被墙压住的目标走不快：导航速度压到三成（移动速度属性由状态效果自带）。
    WorldCombat.on("world_combat:move_block/pen", "world_combat:navigate", "", function (event) {
        if (MobEffects.read(event.world(), event.actor(), blockPenned) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = Math.max(0, (typeof data.speed === "number" ? data.speed : 0.2) * blockPenSpeed);
        event.data(JSON.stringify(data));
    });

    define({
        id: blockId,
        cooldownParameter: "recharge",
        name: "挡路",
        description: "张开双手，在敌人或地面的落点立起一道短弧栅栏，封住那条退路：墙按实际能立起的格数出现，挡住的格会留下缺口。只有落墙时真正贴住墙面的敌人才会被往术者方向推挤一下、短暂钉住并走不快。墙短、可翻越、可挖开，时长一到就收回。",
        uses: ["把想逃跑的目标挡回来等队友收", "在路口或门口横拦一条退路", "把冲上来的厚目标按进近战范围"],
        kind: "aim",
        range: 4,
        maxRange: 6,
        prepare: 9,
        active: 1,
        recover: 7,
        cooldown: 100,
        style: "bulwark",
        stationary: true,
        defaults: { brace: false, ai: { maxChase: 6, catchRunners: true, leaveStation: false } },
        fields: [
            flag("brace", "撑臂")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[blockId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(blockId, "tempo", context)),
                recover: Math.round(p(blockId, "aftercast", context)),
                cooldown: Math.round(p(blockId, "recharge", context)),
                active: 1,
                range: p(blockId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const target = action.target();
            const enemy = target !== null && world.valid(target) && !world.friendly(target);
            const targetBody = enemy && target !== null ? world.observe(target) : null;
            const at = targetBody !== null ? targetBody.position() : action.targetPosition();
            const span = Math.max(2.4, p(blockId, "span", action));
            const height = Math.max(1, Math.min(3, Math.round(p(blockId, "height", action))));
            const gap = Math.max(0.6, p(blockId, "gap", action));
            const arc = Math.max(90, Math.min(240, p(blockId, "arc", action)));
            const columns = Math.max(4, Math.min(12, Math.round(p(blockId, "columns", action))));
            let path: number[][] = [];
            if (at.minus(origin).length() > 0.4) path = blockPlan(world, origin, at, enemy, span, height, gap, arc, columns).proposed;
            action.present("world_combat:move_block:windup", blockScene, 1, origin,
                JSON.stringify({ moment: "windup", brace: config && config.brace === true ? 1 : 0, path: path, columns: columns }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: p(blockId, "reach"), geometry: "line", style: "bulwark", color: 0x8FA1B0,
                label: config && config.brace === true ? "挡路·撑臂" : "挡路" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const enemy = target !== null && world.valid(target) && !world.friendly(target);
            const targetBody = enemy && target !== null ? world.observe(target) : null;
            const at = targetBody !== null ? targetBody.position() : action.targetPosition();
            if (at.minus(origin).length() < 0.4) {
                WorldFeedback.emit(world, blockScene, 1, at, { moment: "fizzle" }, 16);
                done(action); return;
            }
            const span = Math.max(2.4, p(blockId, "span", action));
            const height = Math.max(1, Math.min(3, Math.round(p(blockId, "height", action))));
            const gap = Math.max(0.6, p(blockId, "gap", action));
            const arc = Math.max(90, Math.min(240, p(blockId, "arc", action)));
            const columns = Math.max(4, Math.min(12, Math.round(p(blockId, "columns", action))));
            const hold = Math.max(40, Math.round(p(blockId, "hold", action)));
            const pin = Math.max(0, Math.round(p(blockId, "pin", action)));
            const shove = Math.max(0, p(blockId, "shove", action));
            const wall = blockPlan(world, origin, at, enemy, span, height, gap, arc, columns);
            const scale = Math.max(0.6, Math.min(2.4, span / 4.0));
            const intensity = Math.max(0.6, Math.min(2.4, wall.columns / 7 + height / 4));
            if (!wall.cells.length) {
                WorldFeedback.emit(world, blockScene, 1, at, { moment: "fizzle", scale: scale }, 18);
                sound(action, "minecraft:block.iron_trapdoor.close");
                done(action); return;
            }
            world.terrain(JSON.stringify({ cells: wall.cells, replace: true, linger: true }), hold);
            // 只对被墙真实接触到的敌人做短推挤与压制；没有贴住的目标不写任何状态。
            const pressed = blockContacts(world, wall.cells, height);
            const away = at.minus(origin);
            for (let i = 0; i < pressed.length; i++) {
                const contact = pressed[i], body = world.observe(contact);
                if (body === null) continue;
                if (shove > 0 && away.length() > 0.01) world.displace(contact, away.unit().scale(-shove));
                MobEffects.apply(world, contact, blockPenned, hold, 0);
                if (pin > 0) WorldEffects.apply(world, contact, "rooted", {}, pin);
                WorldFeedback.emit(world, blockScene, 1, body.position(),
                    { moment: "press", target: String(contact.ref()), columns: wall.columns, shove: shove, intensity: intensity }, 22);
            }
            const data = { path: wall.path, columns: wall.columns, scale: scale, intensity: intensity,
                anchor: [wall.anchor.x(), wall.anchor.y(), wall.anchor.z()] };
            action.effect(blockWall, self, JSON.stringify(data), hold);
            WorldFeedback.emit(world, blockScene, 1, wall.anchor,
                { moment: "seal", path: wall.path, columns: wall.columns, lines: wall.columns,
                    scale: scale, intensity: intensity, shove: shove, pressed: pressed.length }, 40);
            WorldFeedback.text(world, wall.anchor.plus(WorldCombat.point(0, 1.2, 0)), blockSealText, [Math.round(hold / 20 * 10) / 10], 30);
            sound(action, "minecraft:block.piston.extend");
            sound(action, "minecraft:block.iron_trapdoor.close");
            done(action);
        }
    });
}
