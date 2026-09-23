/**
 * 冲岩 / accelerock 的出手方式。
 *
 * 核心念头：把碎岩披到身上，整个身体贴地撞出去——一块石头砸上去，落点崩出一小片碎石疤。
 *   它是全族最重的一记：不像水流喷射把自己浇透，也不像电光一闪那样轻巧，卖的是「岩石取自你脚下的世界」
 *   与「撞出一条痕」。撞上第一个就停是常态；破阵式会让它沿冲刺线一路碾过去。
 *
 * 两幕：
 *   起（windup，提交前）：脚下与身侧碎岩浮起、拢成石身，只播预告（present gather）。
 *   冲（execute）：提交后沿瞄准方向逐刻推进，身后拖一道石屑；撞上非友方活体就结算 `slam` 接触伤害、
 *       把它沿冲刺方向顶开，并在落点崩出碎石疤（租借，linger，到期原方块回来）；破阵式不停下，继续碾后面的目标。
 *       一路冲到尽头没撞上任何人就收势落空（miss）。
 *
 * 与同族分开：电光一闪是轻巧的一道速度影子、撞上即停不留痕；水流喷射把自己裹进水柱、命中浇透；
 *   冲岩是石身、碎石迸溅，并在地面留下一道碎石疤——这是它独有的读法。
 */
namespace PokemonSkills {
    /** 把地表方块归到一个「岩石类」材质：深板岩归碎深板岩、沙归沙岩，其余石质归圆石。 */
    function accelerockMaterial(id: string): string {
        const value = String(id);
        if (value.indexOf("deepslate") >= 0) return "minecraft:cobbled_deepslate";
        if (value.indexOf("blackstone") >= 0) return "minecraft:blackstone";
        if (value.indexOf("sand") >= 0) return "minecraft:sandstone";
        if (value.indexOf("netherrack") >= 0) return "minecraft:netherrack";
        if (value.indexOf("basalt") >= 0) return "minecraft:basalt";
        if (value.indexOf("tuff") >= 0) return "minecraft:tuff";
        if (value.indexOf("ice") >= 0) return "minecraft:packed_ice";
        if (value.indexOf("obsidian") >= 0) return "minecraft:obsidian";
        return "minecraft:cobblestone";
    }

    /** 读施法者脚下最近的一层实心方块，作为这一记石身的材质来源。 */
    function accelerockSurface(world: CombatWorld, at: CombatPoint): string {
        for (let dy = 0; dy >= -3; dy--) {
            const block = world.block(WorldCombat.point(at.x(), at.y() + dy, at.z()));
            if (block === null) continue;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava") continue;
            return id;
        }
        return "minecraft:stone";
    }

    /** 在落点崩出一小片碎石疤（租借，linger，到期原方块回来）；返回崩了几格。 */
    function accelerockScar(world: CombatWorld, point: CombatPoint, radius: number, block: string, ticks: number): number {
        const cells: any[] = [], steps = Math.max(0, Math.min(2, Math.ceil(radius)));
        const px = Math.floor(point.x()), py = Math.floor(point.y()), pz = Math.floor(point.z());
        for (let dx = -steps; dx <= steps; dx++) for (let dz = -steps; dz <= steps; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > radius + 0.4) continue;
            const x = px + dx, z = pz + dz;
            for (let dy = 1; dy >= -2; dy--) {
                const y = py + dy;
                const found = world.block(WorldCombat.point(x, y, z));
                if (found === null) break;
                const id = String(found.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                if (id === block) break;
                cells.push({ x: x, y: y, z: z, block: block });
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        freeMovement: true,
        id: accelerockId,
        cooldownParameter: "recharge",
        name: "Accelerock",
        description: "把碎岩披到身上，整个身体贴地撞出去：撞实一下把人顶飞，落点崩出一小片碎石疤。全族最重的一记先制。破阵式改成沿冲刺线一路碾过去。",
        uses: ["贴地一记最重的石身先手，把目标撞飞", "破阵式撞穿一排贴在一起的敌人", "落点崩出碎石疤，改变脚下的地面"],
        kind: "enemy",
        range: 4.2,
        maxRange: 7.4,
        prepare: 3,
        active: 0,
        recover: 8,
        cooldown: 20,
        style: "stone",
        defaults: { breakthrough: false, ai: { maxChase: 8, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p(accelerockId, "charge", pokemon) : 4.2) + 0.4, geometry: "line", style: "stone", color: 0x9A8A6A,
                label: config && config.breakthrough === true ? "冲岩·破阵" : "冲岩" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[accelerockId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(accelerockId, "tempo", context)),
                recover: Math.round(p(accelerockId, "settle", context)),
                cooldown: Math.round(p(accelerockId, "recharge", context)),
                active: 0,
                range: p(accelerockId, "charge", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("accelerock:gather", accelerockScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, breakthrough: config && config.breakthrough === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const length = p(accelerockId, "charge", action);
            const pace = p(accelerockId, "pace", action);
            const radius = p(accelerockId, "collisionRadius", action);
            const power = p(accelerockId, "slam", action);
            const shove = p(accelerockId, "shove", action);
            const shards = Math.max(12, Math.round(p(accelerockId, "shards", action)));
            const pierce = Math.max(1, Math.round(p(accelerockId, "pierce", action)));
            const scarRadius = p(accelerockId, "scar", action);
            const rubbleTicks = Math.max(40, Math.round(p(accelerockId, "rubble", action)));
            const breakthrough = config && config.breakthrough === true;
            const material = accelerockMaterial(accelerockSurface(world, action.origin()));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.5));
            const intensity = Math.max(0.6, Math.min(2.2, power / 50));
            const stuck: { [ref: string]: boolean } = {};
            let travelled = 0, strikes = 0;

            function finish(current: CombatAction, at: CombatPoint, moment: string): void {
                const scope = current.world();
                if (moment === "miss") {
                    WorldFeedback.emit(scope, accelerockScene, 1, at, { moment: "miss", shards: Math.round(shards * 0.6), scale: scale }, 18);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), accelerockMissText, [], 20);
                }
                done(current);
            }

            function smash(current: CombatAction, at: CombatPoint, victim: CombatActor): void {
                const scope = current.world();
                const cells = accelerockScar(scope, at, scarRadius, material, rubbleTicks);
                WorldFeedback.emit(scope, accelerockScene, 1, at,
                    { moment: "smash", target: String(victim.ref()), shards: shards, puff: Math.round(shards * 0.4), scale: scale, intensity: intensity,
                        scar: scarRadius, cells: cells, rubble: rubbleTicks, breakthrough: breakthrough ? 1 : 0 }, 24);
                if (cells > 0)
                    WorldFeedback.emit(scope, accelerockScene, 1, at, { moment: "scar", scar: scarRadius, cells: cells, scale: Math.max(0.5, scarRadius / 1.0) }, 22);
                scope.sound("minecraft:block.stone.break", at, 14, "{}");
            }

            sound(action, "cobblemon:move.rockthrow.actor");
            action.present("accelerock:charge", accelerockScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", shards: shards, scale: scale, intensity: intensity, breakthrough: breakthrough ? 1 : 0 }));

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const delta = direction.scale(Math.min(pace, length - travelled));
                const hit = current.trace(origin, origin.plus(delta.scale(p(accelerockId, "traceAhead", current))), radius);
                let stop = false;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const ref = String(victim.ref());
                        if (!stuck[ref]) {
                            stuck[ref] = true;
                            const landed = impact(current, hit, accelerockId, power,
                                { damage: damageSpec(accelerockId, "slam"), contact: true });
                            if (landed) {
                                strikes++;
                                smash(current, hit.position(), victim);
                                const away = hit.position().minus(origin);
                                if (scope.valid(victim) && away.length() > 0.05) scope.displace(victim, away.unit().scale(shove));
                            }
                            if (!breakthrough || strikes >= pierce) stop = true;
                        }
                    } else stop = true;
                }
                if (stop) { finish(current, hit.position(), "smash"); return; }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p(accelerockId, "minimumMove", current) || travelled >= length) {
                    finish(current, origin.plus(delta), "miss");
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
