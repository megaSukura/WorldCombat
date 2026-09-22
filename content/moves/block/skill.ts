/**
 * 挡路 / block — 执行组织。
 *
 * 核心念头：**在对手的背影一侧，把一道弧形栅栏立起来**，把它的退路从世界里拿走。
 *
 * 三幕：
 *   起（windup，提交前）：术者沉腰、双臂张开，脚边卷起一圈尘土。
 *   立（seal，提交后）：以目标为心、术者到目标的方向为轴，在目标背影一侧的圆环上取 `columns` 个点位，
 *       从地表往上立 `height` 格 `minecraft:iron_bars`（`world.terrain` 租借，`linger` 活过招式，到期原方块回来）。
 *       落栅的一刻把目标往术者方向推 `shove` 格、短暂钉住 `pin`，并挂上共享身份 `world_combat:status/trapped`
 *       的 `world_combat:block_penned`（移动被压慢、导航被压到三成）。
 *   收（fold）：`hold` 到点，`world_combat:block_wall` 的看护效果收回压制状态、播放收栅；栅栏由租约自己归还。
 *
 * 与同族分开：黑色目光是术者站在原地一直凝视、被打断就断；蛛网缠在目标身上、怕火；挡路只在目标背后立一堵墙，
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
    const blockReferenceSpan = 4.0;
    const blockPenSpeed = 0.3;

    /** `world_combat:block_wall` 的状态：墙基折线与它的大小；到期时用它播放收栅。 */
    function blockWallData(json: string): string {
        const value = JSON.parse(json);
        if (!Array.isArray(value.path)) throw new Error("Invalid block wall path");
        ["columns", "span", "scale", "intensity"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid block wall state");
        });
        return JSON.stringify(value);
    }

    function blockWallVisual(world: CombatWorld, victim: CombatActor, data: any): void {
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.keep(world, blockWallKey + String(victim.ref()), blockScene, 1, body.position(),
            { moment: "penned", target: String(victim.ref()), path: data.path,
                columns: data.columns, lines: data.columns, scale: data.scale, intensity: data.intensity }, 40);
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
     * 以目标为心、术者到目标的方向为轴，在目标背影一侧的圆弧上取 `columns` 个点位，从地表往上立 `height` 格栅栏。
     * 返回真正放置的格子、墙基折线（表现与判定同一组顶点）与墙根锚点。
     */
    function blockBuild(world: CombatWorld, origin: CombatPoint, at: CombatPoint, span: number, height: number,
                        gap: number, arcDegrees: number, columns: number): { cells: any[]; path: number[][]; anchor: CombatPoint; columns: number } {
        const dx = at.x() - origin.x(), dz = at.z() - origin.z(), length = Math.sqrt(dx * dx + dz * dz);
        const hx = length < 0.01 ? 0 : dx / length, hz = length < 0.01 ? 1 : dz / length;
        const radius = Math.max(0.8, gap + span * 0.5), half = Math.max(0, arcDegrees) * Math.PI / 360;
        const baseY = Math.floor(at.y()), cells: any[] = [], path: number[][] = [], seen: { [key: string]: boolean } = Object.create(null);
        let placed = 0;
        for (let index = 0; index < columns; index++) {
            const t = columns <= 1 ? 0.5 : index / (columns - 1);
            const angle = (t - 0.5) * 2 * half, cos = Math.cos(angle), sin = Math.sin(angle);
            const rx = hx * cos - hz * sin, rz = hx * sin + hz * cos;
            const x = Math.floor(at.x() + rx * radius), z = Math.floor(at.z() + rz * radius);
            let surface = -1;
            for (let probe = baseY + 2; probe >= baseY - 5; probe--) {
                const block = world.block(WorldCombat.point(x, probe, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:water" || id === "minecraft:lava") break;
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
                if (blockBlocked(world, x, atY, z)) break;
                const key = x + "," + atY + "," + z;
                if (seen[key]) break;
                seen[key] = true;
                cells.push({ x: x, y: atY, z: z, block: blockWallBlock });
                raised++;
            }
            if (raised > 0) { placed++; path.push([x + 0.5, surface + 1.1, z + 0.5]); }
        }
        const centre = WorldCombat.point(at.x() + hx * gap, at.y(), at.z() + hz * gap);
        return { cells: cells, path: path, anchor: centre, columns: placed };
    }

    WorldCombat.effect(blockWall, 1, 600, "actor", blockWallData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(blockWall, "start", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        blockWallVisual(world, victim, JSON.parse(effect.state()));
        effect.schedule("watch", "watch", 4, "{}");
    });
    WorldCombat.effectHandler(blockWall, "watch", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        blockWallVisual(world, victim, JSON.parse(effect.state()));
        effect.schedule("watch", "watch", 4, "{}");
    });
    WorldCombat.effectHandler(blockWall, "end", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) return;
        const pinned = MobEffects.read(world, victim, blockPenned);
        if (pinned !== null) world.removeMobEffect(victim, blockPenned, pinned.key());
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, blockScene, 1, body.position(), { moment: "fold", target: String(victim.ref()) }, 22);
    });

    // 被围住的目标走不快：导航速度压到三成（移动速度属性由状态效果自带）。
    WorldCombat.on("world_combat:move_block/pen", "world_combat:navigate", "", function (event) {
        if (MobEffects.read(event.world(), event.actor(), blockPenned) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = Math.max(0, (typeof data.speed === "number" ? data.speed : 0.2) * blockPenSpeed);
        event.data(JSON.stringify(data));
    });

    define({
        id: blockId,
        name: "挡路",
        description: "张开双手，在对手的背影一侧立起一道弧形栅栏，封住它的退路：墙落下时把它往自己方向推挤、短暂钉住，整段时间里把它压在墙与术者之间走不快。墙短、可翻越、可挖开，时长一到就收回。",
        uses: ["把想逃跑的目标挡回来等队友收", "在路口或门口横拦一条退路", "把冲上来的厚目标按进近战范围"],
        kind: "enemy",
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
            action.present("world_combat:move_block:windup", blockScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", brace: config && config.brace === true ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: p(blockId, "reach"), geometry: "line", style: "bulwark", color: 0x8FA1B0,
                label: config && config.brace === true ? "挡路·撑臂" : "挡路" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, blockScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action); return;
            }
            const body = world.observe(target), selfBody = world.observe(self);
            if (body === null || selfBody === null) { done(action); return; }
            const origin = selfBody.position(), at = body.position();
            const span = Math.max(2.4, p(blockId, "span", action));
            const height = Math.max(1, Math.min(3, Math.round(p(blockId, "height", action))));
            const gap = Math.max(0.6, p(blockId, "gap", action));
            const arc = Math.max(90, Math.min(240, p(blockId, "arc", action)));
            const columns = Math.max(4, Math.min(12, Math.round(p(blockId, "columns", action))));
            const hold = Math.max(40, Math.round(p(blockId, "hold", action)));
            const pin = Math.max(0, Math.round(p(blockId, "pin", action)));
            const shove = Math.max(0, p(blockId, "shove", action));
            const wall = blockBuild(world, origin, at, span, height, gap, arc, columns);
            const scale = Math.max(0.6, Math.min(2.4, span / blockReferenceSpan));
            const intensity = Math.max(0.6, Math.min(2.4, wall.columns / 7 + height / 4));
            if (!wall.cells.length) {
                WorldFeedback.emit(world, blockScene, 1, at, { moment: "fizzle", scale: scale }, 18);
                sound(action, "minecraft:block.iron_trapdoor.close");
                done(action); return;
            }
            world.terrain(JSON.stringify({ cells: wall.cells, replace: true, linger: true }), hold);
            const away = at.minus(origin);
            if (shove > 0 && away.length() > 0.01) world.displace(target, away.unit().scale(-shove));
            MobEffects.apply(world, target, blockPenned, hold, 0);
            if (pin > 0) WorldEffects.apply(world, target, "rooted", {}, pin);
            const data = { path: wall.path, columns: wall.columns, span: span, scale: scale, intensity: intensity };
            action.effect(blockWall, target, JSON.stringify(data), hold);
            WorldFeedback.emit(world, blockScene, 1, wall.anchor,
                { moment: "seal", target: String(target.ref()), path: wall.path, columns: wall.columns, lines: wall.columns,
                    scale: scale, intensity: intensity, shove: shove }, 40);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), blockSealText, [Math.round(hold / 20 * 10) / 10], 30);
            sound(action, "minecraft:block.piston.extend");
            sound(action, "minecraft:block.iron_trapdoor.close");
            done(action);
        }
    });
}
